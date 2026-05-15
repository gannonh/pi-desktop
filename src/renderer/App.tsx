import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ProjectStateView } from "../shared/project-state";
import type { ProjectStateViewResult } from "../shared/ipc";
import { AppShell } from "./components/app-shell";
import {
	bufferPendingSessionEvent,
	createPendingSessionEventBuffer,
	isSessionScopeSelected,
	shouldAcceptSessionEvent,
	shouldBufferPendingStartEvent,
	takeBufferedSessionEvents,
} from "./session/session-scope";
import {
	applySessionStartResult,
	createInitialSessionState,
	reduceSessionEvent,
	type LiveSessionState,
} from "./session/session-state";

type StatusMessage = {
	source: "project" | "startup";
	message: string;
};

type SessionRequest = {
	id: number;
	projectId: string;
	chatId: string | null;
};

const createEmptyProjectStateView = (): ProjectStateView => ({
	projects: [],
	standaloneChats: [],
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
});

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
	const [activeSessionProjectId, setActiveSessionProjectId] = useState<string | null>(null);
	const [activeSessionChatId, setActiveSessionChatId] = useState<string | null>(null);
	const [statusMessage, setStatusMessage] = useState<StatusMessage>();
	const selectedProjectId = projectState.selectedProject?.id ?? null;
	const selectedChatId = projectState.selectedChat?.id ?? null;
	const selectedProjectIdRef = useRef<string | null>(selectedProjectId);
	const selectedChatIdRef = useRef<string | null>(selectedChatId);
	const activeSessionProjectIdRef = useRef<string | null>(activeSessionProjectId);
	const activeSessionChatIdRef = useRef<string | null>(activeSessionChatId);
	const latestSessionRequestRef = useRef<SessionRequest | null>(null);
	const pendingStartRequestRef = useRef<SessionRequest | null>(null);
	const pendingStartEventsRef = useRef(createPendingSessionEventBuffer());
	const acceptedSessionIdRef = useRef<string | null>(null);
	const nextSessionRequestIdRef = useRef(0);

	const applyProjectStateViewResult = useCallback((result: ProjectStateViewResult) => {
		if (!result.ok) {
			setStatusMessage({ source: "project", message: result.error.message });
			return;
		}

		setProjectState(result.data);
		setStatusMessage((current) => (current?.source === "project" ? undefined : current));
	}, []);

	useLayoutEffect(() => {
		selectedProjectIdRef.current = selectedProjectId;
		selectedChatIdRef.current = selectedChatId;
	}, [selectedProjectId, selectedChatId]);

	useEffect(() => {
		activeSessionProjectIdRef.current = activeSessionProjectId;
		activeSessionChatIdRef.current = activeSessionChatId;
	}, [activeSessionProjectId, activeSessionChatId]);

	useEffect(() => {
		if (
			!activeSessionProjectId ||
			isSessionScopeSelected(
				{ projectId: activeSessionProjectId, chatId: activeSessionChatId },
				{ projectId: selectedProjectId, chatId: selectedChatId },
			)
		) {
			return;
		}

		const sessionId = sessionState.sessionId;
		activeSessionProjectIdRef.current = null;
		activeSessionChatIdRef.current = null;
		acceptedSessionIdRef.current = null;
		pendingStartRequestRef.current = null;
		pendingStartEventsRef.current.clear();
		setActiveSessionProjectId(null);
		setActiveSessionChatId(null);
		setSessionState(createInitialSessionState());

		if (sessionId) {
			void window.piDesktop.piSession.dispose({ sessionId });
		}
	}, [activeSessionChatId, activeSessionProjectId, selectedChatId, selectedProjectId, sessionState.sessionId]);

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
						acceptedSessionId: acceptedSessionIdRef.current,
						pendingStart,
						active: {
							projectId: activeSessionProjectIdRef.current,
							chatId: activeSessionChatIdRef.current,
						},
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
		});
	}, []);

	const submitPrompt = useCallback(
		async (prompt: string) => {
			const selectedProject = projectState.selectedProject;
			if (!selectedProject || selectedProject.availability.status !== "available") {
				setSessionState((current) => ({
					...current,
					status: "failed",
					statusLabel: "Failed",
					errorMessage: "Select an available project to start a Pi session.",
					retryMessage: "",
				}));
				return false;
			}

			const requestChatId = projectState.selectedChat?.id ?? null;
			const reusableSessionId =
				activeSessionProjectId === selectedProject.id && activeSessionChatId === requestChatId
					? acceptedSessionIdRef.current
					: null;
			const requestProjectId = selectedProject.id;
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

			const result = reusableSessionId
				? await window.piDesktop.piSession.submit({ sessionId: reusableSessionId, prompt })
				: await window.piDesktop.piSession.start({ projectId: requestProjectId, prompt });

			const requestIsCurrent =
				latestSessionRequestRef.current?.id === request.id &&
				selectedProjectIdRef.current === requestProjectId &&
				selectedChatIdRef.current === requestChatId &&
				activeSessionProjectIdRef.current === requestProjectId &&
				activeSessionChatIdRef.current === requestChatId &&
				(reusableSessionId || pendingStartRequestRef.current?.id === request.id);

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
				const bufferedEvents = takeBufferedSessionEvents(pendingStartEventsRef.current, result.data.sessionId);
				pendingStartRequestRef.current = null;
				acceptedSessionIdRef.current = result.data.sessionId;
				activeSessionProjectIdRef.current = requestProjectId;
				activeSessionChatIdRef.current = requestChatId;
				setActiveSessionProjectId(requestProjectId);
				setActiveSessionChatId(requestChatId);
				setSessionState((current) => {
					let next = applySessionStartResult(current, {
						sessionId: result.data.sessionId,
						status: result.data.status,
						statusLabel: toSessionStatusLabel(result.data.status),
					});
					for (const event of bufferedEvents) {
						next = reduceSessionEvent(next, event);
					}
					return next;
				});
			}

			return true;
		},
		[
			activeSessionChatId,
			activeSessionProjectId,
			applyProjectStateViewResult,
			projectState.selectedChat,
			projectState.selectedProject,
		],
	);

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
		<AppShell
			state={projectState}
			statusMessage={statusMessage?.message}
			session={
				isSessionScopeSelected(
					{ projectId: activeSessionProjectId, chatId: activeSessionChatId },
					{ projectId: selectedProjectId, chatId: selectedChatId },
				)
					? sessionState
					: createInitialSessionState()
			}
			onProjectState={applyProjectStateViewResult}
			onSubmitPrompt={submitPrompt}
			onAbortSession={abortSession}
		/>
	);
}
