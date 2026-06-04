import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ChatStatus, ProjectStateView } from "../shared/project-state";
import type { ProjectStateViewResult } from "../shared/ipc";
import type {
	PiSessionDelivery,
	PiSessionImageContent,
	PiSessionQueuedMessage,
	PiSessionQueuedMessageId,
	PiSessionSettingsPayload,
	PiSessionStartPayload,
} from "../shared/pi-session";
import type { ComposerHostProps } from "./chat/composer-host";
import { createOutputCommandPaletteActions } from "./chat/output-command-palette";
import { useSessionCommandPaletteActions } from "./chat/use-session-command-palette-actions";
import { AppShell } from "./components/app-shell";
import type { ProjectSidebarActions } from "./projects/project-sidebar-actions";
import { confirmDiscardUnsavedFileWorkspaceChanges } from "./file-workspace/file-workspace-guard";
import { RightPanelProvider } from "./right-panel/right-panel-context";
import { ShellLayoutProvider } from "./shell/shell-layout-context";
import {
	type SessionScope,
	bufferPendingSessionEvent,
	createPendingSessionEventBuffer,
	isSessionScopeSelected,
	resolvePromptSessionStartSelection,
	shouldAcceptSessionEvent,
	shouldBufferPendingStartEvent,
	takeBufferedSessionEvents,
} from "./session/session-scope";
import {
	applySessionHistoryResult,
	applySessionStartResult,
	createInitialSessionState,
	reduceSessionEvent,
	type LiveSessionState,
} from "./session/session-state";
import {
	createErrorTranscriptHydration,
	createIdleTranscriptHydration,
	createLoadedTranscriptHydration,
	createLoadingTranscriptHydration,
	type TranscriptHydrationState,
} from "./session/transcript-hydration";

type StatusMessage = {
	source: "project" | "startup" | "output";
	message: string;
};

type SessionRequest = SessionScope & {
	id: number;
};

const createEmptyProjectStateView = (): ProjectStateView => ({
	projects: [],
	standaloneChats: [],
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
});

type SessionChat = NonNullable<ProjectStateView["selectedChat"]>;

const isPiSessionStartPayload = (payload: unknown): payload is PiSessionStartPayload =>
	typeof payload === "object" &&
	payload !== null &&
	"projectId" in payload &&
	"chatId" in payload &&
	"workspacePath" in payload;

const toProjectChatStatus = (status: LiveSessionState["status"]): ChatStatus =>
	status === "failed" ? "failed" : status === "idle" ? "idle" : "running";

const isSelectedActiveRequest = ({
	request,
	latestRequest,
	selection,
	active,
}: {
	request: SessionRequest;
	latestRequest: SessionRequest | null;
	selection: SessionScope;
	active: SessionScope;
}): boolean =>
	latestRequest?.id === request.id &&
	selection.projectId === request.projectId &&
	selection.chatId === request.chatId &&
	active.projectId === request.projectId &&
	active.chatId === request.chatId;

const chatMatchesScope = (chat: SessionChat, scope: SessionScope): boolean =>
	chat.id === scope.chatId && ("projectId" in chat ? chat.projectId === scope.projectId : scope.projectId === null);

const updateSessionChatStatus = <T extends SessionChat>(
	chat: T,
	scope: SessionScope,
	status: ChatStatus,
	attention: boolean,
	updatedAt: string,
): T => (chatMatchesScope(chat, scope) ? { ...chat, status, attention, updatedAt } : chat);

const applySessionStatusToProjectState = (
	state: ProjectStateView,
	scope: SessionScope,
	status: ChatStatus,
	attention: boolean,
	updatedAt: string,
): ProjectStateView => {
	if (!scope.chatId) {
		return state;
	}

	return {
		...state,
		projects: state.projects.map((project) =>
			project.id === scope.projectId
				? {
						...project,
						chats: project.chats.map((chat) =>
							updateSessionChatStatus(chat, scope, status, attention, updatedAt),
						),
					}
				: project,
		),
		standaloneChats: state.standaloneChats.map((chat) =>
			updateSessionChatStatus(chat, scope, status, attention, updatedAt),
		),
		selectedChat: state.selectedChat
			? updateSessionChatStatus(state.selectedChat, scope, status, attention, updatedAt)
			: null,
	};
};

const toSessionStatusLabel = (status: LiveSessionState["status"]): string => {
	switch (status) {
		case "aborting":
			return "Aborting";
		case "failed":
			return "Failed";
		case "idle":
			return "Idle";
		case "retrying":
			return "Retrying";
		case "running":
			return "Running";
		case "starting":
			return "Starting";
	}
};

export function App() {
	const [projectState, setProjectState] = useState<ProjectStateView>(() => createEmptyProjectStateView());
	const [sessionState, setSessionState] = useState<LiveSessionState>(() => createInitialSessionState());
	const [transcriptHydration, setTranscriptHydration] = useState<TranscriptHydrationState>(() =>
		createIdleTranscriptHydration(),
	);
	const [activeSessionProjectId, setActiveSessionProjectId] = useState<string | null>(null);
	const [activeSessionChatId, setActiveSessionChatId] = useState<string | null>(null);
	const [statusMessage, setStatusMessage] = useState<StatusMessage>();
	const [defaultComposerSettings, setDefaultComposerSettings] = useState<PiSessionSettingsPayload | null>(null);
	const [pendingComposerDelivery, setPendingComposerDelivery] = useState<PiSessionDelivery>("steer");
	const [composerDraft, setComposerDraft] = useState("");
	const sidebarActionsRef = useRef<ProjectSidebarActions | null>(null);
	const selectedProjectId = projectState.selectedProjectId;
	const selectedChatId = projectState.selectedChatId;
	const selectedProjectIdRef = useRef<string | null>(selectedProjectId);
	const selectedChatIdRef = useRef<string | null>(selectedChatId);
	const activeSessionProjectIdRef = useRef<string | null>(activeSessionProjectId);
	const activeSessionChatIdRef = useRef<string | null>(activeSessionChatId);
	const latestSessionRequestRef = useRef<SessionRequest | null>(null);
	const pendingStartRequestRef = useRef<SessionRequest | null>(null);
	const pendingStartEventsRef = useRef(createPendingSessionEventBuffer());
	const acceptedSessionIdRef = useRef<string | null>(null);
	const nextSessionRequestIdRef = useRef(0);
	const nextHistoryRequestIdRef = useRef(0);
	const projectTitleRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const sessionMessagesRef = useRef(sessionState.messages);

	const applyProjectStateViewResult = useCallback((result: ProjectStateViewResult) => {
		if (!result.ok) {
			setStatusMessage({ source: "project", message: result.error.message });
			return;
		}

		setProjectState(result.data);
		setStatusMessage((current) => (current?.source === "project" ? undefined : current));
	}, []);

	const notifyProjectStatus = useCallback((message: string) => {
		setStatusMessage({ source: "project", message });
	}, []);

	const registerSidebarActions = useCallback((actions: ProjectSidebarActions | null) => {
		sidebarActionsRef.current = actions;
	}, []);

	const scheduleProjectTitleRefresh = useCallback(() => {
		if (projectTitleRefreshTimeoutRef.current) {
			clearTimeout(projectTitleRefreshTimeoutRef.current);
		}

		projectTitleRefreshTimeoutRef.current = setTimeout(() => {
			projectTitleRefreshTimeoutRef.current = null;
			void window.piDesktop.project
				.getState()
				.then(applyProjectStateViewResult)
				.catch((error) => {
					setStatusMessage({
						source: "project",
						message: error instanceof Error ? error.message : "Unable to refresh project state.",
					});
				});
		}, 100);
	}, [applyProjectStateViewResult]);

	useLayoutEffect(() => {
		selectedProjectIdRef.current = selectedProjectId;
		selectedChatIdRef.current = selectedChatId;
	}, [selectedProjectId, selectedChatId]);

	useEffect(() => {
		activeSessionProjectIdRef.current = activeSessionProjectId;
		activeSessionChatIdRef.current = activeSessionChatId;
	}, [activeSessionProjectId, activeSessionChatId]);

	useEffect(() => {
		sessionMessagesRef.current = sessionState.messages;
	}, [sessionState.messages]);

	useEffect(() => {
		if (
			(activeSessionProjectId === null && activeSessionChatId === null) ||
			isSessionScopeSelected(
				{ projectId: activeSessionProjectId, chatId: activeSessionChatId },
				{ projectId: selectedProjectId, chatId: selectedChatId },
			)
		) {
			return;
		}

		const sessionId = sessionState.sessionId;
		const runtimeSessionId = acceptedSessionIdRef.current;
		activeSessionProjectIdRef.current = null;
		activeSessionChatIdRef.current = null;
		acceptedSessionIdRef.current = null;
		pendingStartRequestRef.current = null;
		pendingStartEventsRef.current.clear();
		setActiveSessionProjectId(null);
		setActiveSessionChatId(null);
		setSessionState(createInitialSessionState());

		if (sessionId && sessionId === runtimeSessionId) {
			void window.piDesktop.piSession.dispose({ sessionId });
		}
	}, [activeSessionChatId, activeSessionProjectId, selectedChatId, selectedProjectId, sessionState.sessionId]);

	useEffect(() => {
		return () => {
			if (projectTitleRefreshTimeoutRef.current) {
				clearTimeout(projectTitleRefreshTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		return window.piDesktop.piSession.onEvent((event) => {
			if (!event.sessionId) {
				return;
			}

			const sessionEvent = event as typeof event & { sessionId: string };
			const pendingStart = pendingStartRequestRef.current;
			const eventIsAccepted = shouldAcceptSessionEvent({
				eventSessionId: sessionEvent.sessionId,
				acceptedSessionId: acceptedSessionIdRef.current,
				active: {
					projectId: activeSessionProjectIdRef.current,
					chatId: activeSessionChatIdRef.current,
				},
				selection: {
					projectId: selectedProjectIdRef.current,
					chatId: selectedChatIdRef.current,
				},
			});

			if (!eventIsAccepted) {
				if (
					shouldBufferPendingStartEvent({
						eventSessionId: sessionEvent.sessionId,
						acceptedSessionId: acceptedSessionIdRef.current,
						pendingStart,
						selection: {
							projectId: selectedProjectIdRef.current,
							chatId: selectedChatIdRef.current,
						},
					})
				) {
					bufferPendingSessionEvent(pendingStartEventsRef.current, sessionEvent);
				}
				return;
			}

			if (sessionEvent.sessionId !== acceptedSessionIdRef.current) {
				acceptedSessionIdRef.current = sessionEvent.sessionId;
			}

			setSessionState((current) => reduceSessionEvent(current, sessionEvent));
			if (sessionEvent.type === "status" || sessionEvent.type === "runtime_error") {
				const scope = {
					projectId: activeSessionProjectIdRef.current,
					chatId: activeSessionChatIdRef.current,
				};
				const status = sessionEvent.type === "runtime_error" ? "failed" : toProjectChatStatus(sessionEvent.status);
				setProjectState((current) =>
					applySessionStatusToProjectState(current, scope, status, status === "failed", sessionEvent.receivedAt),
				);
				if (sessionEvent.type === "status" && sessionEvent.status === "idle") {
					scheduleProjectTitleRefresh();
				}
			}
			if (sessionEvent.type === "message_end") {
				scheduleProjectTitleRefresh();
			}
		});
	}, [scheduleProjectTitleRefresh]);

	const resolveWorkspacePath = useCallback(
		() => projectState.selectedProject?.path ?? projectState.selectedChat?.cwd,
		[projectState.selectedChat?.cwd, projectState.selectedProject?.path],
	);

	useEffect(() => {
		let cancelled = false;
		const workspacePath = resolveWorkspacePath();
		void window.piDesktop.piSession.getDefaultSettings(workspacePath ? { workspacePath } : {}).then((result) => {
			if (cancelled) {
				return;
			}
			if (result.ok) {
				setDefaultComposerSettings(result.data);
				return;
			}
			setDefaultComposerSettings(null);
		});
		return () => {
			cancelled = true;
		};
	}, [resolveWorkspacePath]);

	const applyComposerSettingsResult = useCallback((settings: PiSessionSettingsPayload) => {
		setSessionState((current) => ({ ...current, settings }));
		setDefaultComposerSettings(settings);
	}, []);

	const selectComposerProject = useCallback(
		async (projectId: string) => {
			if (!confirmDiscardUnsavedFileWorkspaceChanges()) {
				return;
			}
			applyProjectStateViewResult(await window.piDesktop.project.select({ projectId }));
		},
		[applyProjectStateViewResult],
	);

	const selectComposerModel = useCallback(
		async (provider: string, modelId: string) => {
			const sessionId = acceptedSessionIdRef.current;
			if (sessionId) {
				const result = await window.piDesktop.piSession.setModel({ sessionId, provider, modelId });
				if (result.ok) {
					applyComposerSettingsResult(result.data);
					return;
				}
				setSessionState((current) => ({
					...current,
					status: "failed",
					statusLabel: "Failed",
					errorMessage: result.error.message,
					retryMessage: "",
				}));
				return;
			}

			const workspacePath = resolveWorkspacePath();
			const result = await window.piDesktop.piSession.setDefaultModel({
				workspacePath,
				provider,
				modelId,
			});
			if (result.ok) {
				setDefaultComposerSettings(result.data);
				return;
			}
			setSessionState((current) => ({
				...current,
				status: "failed",
				statusLabel: "Failed",
				errorMessage: result.error.message,
				retryMessage: "",
			}));
		},
		[applyComposerSettingsResult, resolveWorkspacePath],
	);

	const selectComposerThinkingLevel = useCallback(
		async (level: string) => {
			const sessionId = acceptedSessionIdRef.current;
			if (sessionId) {
				const result = await window.piDesktop.piSession.setThinkingLevel({
					sessionId,
					level: level as PiSessionSettingsPayload["thinkingLevel"],
				});
				if (result.ok) {
					applyComposerSettingsResult(result.data);
					return;
				}
				setSessionState((current) => ({
					...current,
					status: "failed",
					statusLabel: "Failed",
					errorMessage: result.error.message,
					retryMessage: "",
				}));
				return;
			}

			const workspacePath = resolveWorkspacePath();
			const result = await window.piDesktop.piSession.setDefaultThinkingLevel({
				workspacePath,
				level: level as PiSessionSettingsPayload["thinkingLevel"],
			});
			if (result.ok) {
				setDefaultComposerSettings(result.data);
				return;
			}
			setSessionState((current) => ({
				...current,
				status: "failed",
				statusLabel: "Failed",
				errorMessage: result.error.message,
				retryMessage: "",
			}));
		},
		[applyComposerSettingsResult, resolveWorkspacePath],
	);

	const toggleQueuedDelivery = useCallback(
		async (messageId: PiSessionQueuedMessageId) => {
			const sessionId = acceptedSessionIdRef.current;
			if (!sessionId) {
				return;
			}
			const current = sessionState.queuedMessages.find(
				(message) => message.id.queue === messageId.queue && message.id.index === messageId.index,
			);
			if (!current) {
				return;
			}
			const result = await window.piDesktop.piSession.updateQueuedMessage({
				sessionId,
				messageId,
				delivery: current.delivery === "steer" ? "followUp" : "steer",
			});
			if (result.ok) {
				setSessionState((state) => ({ ...state, queuedMessages: result.data.messages }));
				return;
			}
			setSessionState((current) => ({
				...current,
				errorMessage: result.error.message,
			}));
		},
		[sessionState.queuedMessages],
	);

	const removeQueuedMessage = useCallback(async (messageId: PiSessionQueuedMessageId) => {
		const sessionId = acceptedSessionIdRef.current;
		if (!sessionId) {
			return;
		}
		const result = await window.piDesktop.piSession.removeQueuedMessage({ sessionId, messageId });
		if (result.ok) {
			setSessionState((state) => ({ ...state, queuedMessages: result.data.messages }));
			return;
		}
		setSessionState((current) => ({
			...current,
			errorMessage: result.error.message,
		}));
	}, []);

	const editQueuedMessage = useCallback(
		async (message: PiSessionQueuedMessage) => {
			setPendingComposerDelivery(message.delivery);
			setComposerDraft(message.text);
			await removeQueuedMessage(message.id);
		},
		[removeQueuedMessage],
	);

	const submitPrompt = useCallback(
		async (prompt: string, delivery?: PiSessionDelivery, images?: PiSessionImageContent[]) => {
			nextHistoryRequestIdRef.current += 1;
			const startSelection = resolvePromptSessionStartSelection(projectState);
			if (!startSelection.ok) {
				setSessionState((current) => ({
					...current,
					status: "failed",
					statusLabel: "Failed",
					errorMessage: startSelection.errorMessage,
					retryMessage: "",
				}));
				return false;
			}

			const requestProjectId = startSelection.projectId;
			const requestChatId = startSelection.chatId;
			const reusableSessionId =
				activeSessionProjectId === requestProjectId && activeSessionChatId === requestChatId
					? acceptedSessionIdRef.current
					: null;
			const request: SessionRequest = {
				id: nextSessionRequestIdRef.current + 1,
				projectId: requestProjectId,
				chatId: requestChatId,
			};
			nextSessionRequestIdRef.current = request.id;
			latestSessionRequestRef.current = request;
			if (!reusableSessionId) {
				pendingStartRequestRef.current = request;
				pendingStartEventsRef.current.clear();
				acceptedSessionIdRef.current = null;
			}

			activeSessionProjectIdRef.current = requestProjectId;
			activeSessionChatIdRef.current = requestChatId;
			setActiveSessionProjectId(requestProjectId);
			setActiveSessionChatId(requestChatId);
			setSessionState((current) => ({
				...current,
				status: reusableSessionId ? "running" : "starting",
				statusLabel: reusableSessionId ? "Running" : "Starting",
				errorMessage: "",
				retryMessage: "",
			}));

			const settingsForStart = sessionState.settings ?? defaultComposerSettings;
			const sessionIsRunning =
				Boolean(reusableSessionId) &&
				(sessionState.status === "running" ||
					sessionState.status === "retrying" ||
					sessionState.status === "aborting");
			const effectiveDelivery = delivery ?? (sessionIsRunning ? "steer" : "prompt");
			const result = reusableSessionId
				? await window.piDesktop.piSession.submit({
						sessionId: reusableSessionId,
						prompt,
						delivery: effectiveDelivery === "prompt" ? undefined : effectiveDelivery,
						images,
					})
				: await window.piDesktop.piSession.start({
						projectId: requestProjectId,
						chatId: requestChatId,
						prompt,
						images,
						modelProvider: settingsForStart?.modelProvider ?? undefined,
						modelId: settingsForStart?.modelId ?? undefined,
						thinkingLevel: settingsForStart?.thinkingLevel,
					});

			const requestIsSelectedAndActive = isSelectedActiveRequest({
				request,
				latestRequest: latestSessionRequestRef.current,
				selection: {
					projectId: selectedProjectIdRef.current,
					chatId: selectedChatIdRef.current,
				},
				active: {
					projectId: activeSessionProjectIdRef.current,
					chatId: activeSessionChatIdRef.current,
				},
			});
			const requestIsCurrent =
				requestIsSelectedAndActive &&
				(reusableSessionId !== null || pendingStartRequestRef.current?.id === request.id);

			if (!requestIsCurrent) {
				if (!reusableSessionId && pendingStartRequestRef.current?.id === request.id) {
					pendingStartRequestRef.current = null;
					pendingStartEventsRef.current.clear();
				}
				if (result.ok && !reusableSessionId) {
					void window.piDesktop.piSession.dispose({ sessionId: result.data.sessionId });
				}
				return false;
			}

			if (!result.ok) {
				if (!reusableSessionId) {
					pendingStartRequestRef.current = null;
					pendingStartEventsRef.current.clear();
				}
				setSessionState((current) => ({
					...current,
					status: "failed",
					statusLabel: "Failed",
					errorMessage: result.error.message,
					retryMessage: "",
				}));
				if (!reusableSessionId) {
					applyProjectStateViewResult(await window.piDesktop.project.getState());
				}
				return false;
			}

			if (!reusableSessionId) {
				if (!isPiSessionStartPayload(result.data)) {
					const message = "Invalid session start response.";
					pendingStartRequestRef.current = null;
					pendingStartEventsRef.current.clear();
					setSessionState((current) => ({
						...current,
						status: "failed",
						statusLabel: "Failed",
						errorMessage: message,
						retryMessage: "",
					}));
					setStatusMessage({ source: "startup", message });
					return false;
				}
				const started = result.data;
				const refreshedProjectState =
					started.projectId !== null && started.chatId !== null
						? await window.piDesktop.chat.select({ projectId: started.projectId, chatId: started.chatId })
						: await window.piDesktop.project.getState();
				const bufferedEvents = takeBufferedSessionEvents(pendingStartEventsRef.current, started.sessionId);
				pendingStartRequestRef.current = null;
				acceptedSessionIdRef.current = started.sessionId;
				if (refreshedProjectState.ok) {
					selectedProjectIdRef.current = refreshedProjectState.data.selectedProjectId;
					selectedChatIdRef.current = refreshedProjectState.data.selectedChatId;
				}
				activeSessionProjectIdRef.current = started.projectId;
				activeSessionChatIdRef.current = started.chatId;
				setActiveSessionProjectId(started.projectId);
				setActiveSessionChatId(started.chatId);
				setSessionState((current) => {
					let next = applySessionStartResult(current, {
						sessionId: started.sessionId,
						status: started.status,
						statusLabel: toSessionStatusLabel(started.status),
					});
					for (const event of bufferedEvents) {
						next = reduceSessionEvent(next, event);
					}
					return next;
				});
				applyProjectStateViewResult(refreshedProjectState);
			}

			return true;
		},
		[
			activeSessionChatId,
			activeSessionProjectId,
			applyProjectStateViewResult,
			defaultComposerSettings,
			projectState,
			sessionState.settings,
			sessionState.status,
		],
	);

	const sessionCommandPaletteActions = useSessionCommandPaletteActions({
		selectedProjectId,
		selectedChatId,
		selectedChat: projectState.selectedChat,
		applyProjectStateViewResult,
		notifyProjectStatus,
		sidebarActionsRef,
	});

	const commandPaletteActions = useMemo(
		() => ({
			session: sessionCommandPaletteActions,
			output: createOutputCommandPaletteActions({
				getMessages: () =>
					isSessionScopeSelected(
						{ projectId: activeSessionProjectIdRef.current, chatId: activeSessionChatIdRef.current },
						{ projectId: selectedProjectIdRef.current, chatId: selectedChatIdRef.current },
					)
						? sessionMessagesRef.current
						: [],
				writeText: (input) => window.piDesktop.clipboard.writeText(input),
				notify: (message) => setStatusMessage({ source: "output", message }),
			}),
		}),
		[sessionCommandPaletteActions],
	);

	const composerHost: ComposerHostProps = {
		onSubmitPrompt: submitPrompt,
		onSelectProject: (projectId) => {
			void selectComposerProject(projectId);
		},
		onSelectModel: (provider, modelId) => {
			void selectComposerModel(provider, modelId);
		},
		onSelectThinkingLevel: (level) => {
			void selectComposerThinkingLevel(level);
		},
		onToggleQueuedDelivery: (messageId) => {
			void toggleQueuedDelivery(messageId);
		},
		onRemoveQueuedMessage: (messageId) => {
			void removeQueuedMessage(messageId);
		},
		onEditQueuedMessage: (message) => {
			void editQueuedMessage(message);
		},
		pendingComposerDelivery,
		composerDraft,
		onComposerDraftApplied: () => setComposerDraft(""),
		commandPaletteActions,
	};

	useEffect(() => {
		const selectedChat = projectState.selectedChat;
		if (!selectedChat?.sessionPath || !selectedChatId) {
			setTranscriptHydration(createIdleTranscriptHydration());
			return;
		}

		const selectedScope = { projectId: selectedProjectId, chatId: selectedChatId };
		if (pendingStartRequestRef.current && isSessionScopeSelected(pendingStartRequestRef.current, selectedScope)) {
			return;
		}
		if (
			isSessionScopeSelected({ projectId: activeSessionProjectId, chatId: activeSessionChatId }, selectedScope) &&
			acceptedSessionIdRef.current
		) {
			setTranscriptHydration(createLoadedTranscriptHydration(selectedScope));
			return;
		}

		const requestId = nextHistoryRequestIdRef.current + 1;
		nextHistoryRequestIdRef.current = requestId;
		setTranscriptHydration(createLoadingTranscriptHydration(selectedScope));
		let cancelled = false;

		const loadHistory = async () => {
			const result = await window.piDesktop.piSession.history({
				projectId: selectedProjectId,
				chatId: selectedChatId,
			});
			if (
				cancelled ||
				nextHistoryRequestIdRef.current !== requestId ||
				selectedProjectIdRef.current !== selectedProjectId ||
				selectedChatIdRef.current !== selectedChatId
			) {
				return;
			}

			if (!result.ok) {
				setTranscriptHydration(createErrorTranscriptHydration(selectedScope, result.error.message));
				setStatusMessage({ source: "project", message: result.error.message });
				return;
			}

			acceptedSessionIdRef.current = null;
			pendingStartRequestRef.current = null;
			pendingStartEventsRef.current.clear();
			activeSessionProjectIdRef.current = selectedProjectId;
			activeSessionChatIdRef.current = selectedChatId;
			setActiveSessionProjectId(selectedProjectId);
			setActiveSessionChatId(selectedChatId);
			setSessionState(applySessionHistoryResult(result.data));
			setTranscriptHydration(createLoadedTranscriptHydration(selectedScope));
		};

		void loadHistory();

		return () => {
			cancelled = true;
		};
	}, [activeSessionChatId, activeSessionProjectId, projectState.selectedChat, selectedChatId, selectedProjectId]);

	const abortSession = useCallback(async () => {
		if (
			!sessionState.sessionId ||
			!isSessionScopeSelected(
				{ projectId: activeSessionProjectId, chatId: activeSessionChatId },
				{ projectId: selectedProjectId, chatId: selectedChatId },
			)
		) {
			return;
		}

		const result = await window.piDesktop.piSession.abort({ sessionId: sessionState.sessionId });
		if (!result.ok) {
			setSessionState((current) => ({
				...current,
				status: "failed",
				statusLabel: "Failed",
				errorMessage: result.error.message,
				retryMessage: "",
			}));
		}
	}, [activeSessionChatId, activeSessionProjectId, selectedChatId, selectedProjectId, sessionState.sessionId]);

	useEffect(() => {
		let mounted = true;

		const loadInitialState = async () => {
			const [versionResult, projectStateResult] = await Promise.allSettled([
				window.piDesktop.app.getVersion(),
				window.piDesktop.project.getState(),
			]);

			if (!mounted) {
				return;
			}

			if (versionResult.status === "fulfilled") {
				if (!versionResult.value.ok) {
					setStatusMessage({ source: "startup", message: versionResult.value.error.message });
				}
			} else {
				setStatusMessage({
					source: "startup",
					message:
						versionResult.reason instanceof Error ? versionResult.reason.message : "Unable to load version.",
				});
			}

			if (projectStateResult.status === "fulfilled") {
				applyProjectStateViewResult(projectStateResult.value);
			} else {
				setStatusMessage({
					source: "project",
					message:
						projectStateResult.reason instanceof Error
							? projectStateResult.reason.message
							: "Unable to load project state.",
				});
			}
		};

		void loadInitialState();

		return () => {
			mounted = false;
		};
	}, [applyProjectStateViewResult]);

	return (
		<ShellLayoutProvider>
			<RightPanelProvider>
				<AppShell
					state={projectState}
					onRegisterSidebarActions={registerSidebarActions}
					statusMessage={statusMessage?.message}
					session={
						isSessionScopeSelected(
							{ projectId: activeSessionProjectId, chatId: activeSessionChatId },
							{ projectId: selectedProjectId, chatId: selectedChatId },
						)
							? sessionState
							: createInitialSessionState()
					}
					transcriptHydration={transcriptHydration}
					transcriptScope={{ projectId: selectedProjectId, chatId: selectedChatId }}
					onProjectState={applyProjectStateViewResult}
					composerHost={composerHost}
					defaultComposerSettings={defaultComposerSettings}
					onAbortSession={abortSession}
				/>
			</RightPanelProvider>
		</ShellLayoutProvider>
	);
}
