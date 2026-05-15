import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ProjectStateView } from "../shared/project-state";
import type { ProjectStateViewResult } from "../shared/ipc";
import { AppShell } from "./components/app-shell";
import { createInitialSessionState, reduceSessionEvent, type LiveSessionState } from "./session/session-state";

type StatusMessage = {
	source: "project" | "startup";
	message: string;
};

type SessionRequest = {
	id: number;
	projectId: string;
};

const createEmptyProjectStateView = (): ProjectStateView => ({
	projects: [],
	standaloneChats: [],
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
});

export function App() {
	const [projectState, setProjectState] = useState<ProjectStateView>(() => createEmptyProjectStateView());
	const [sessionState, setSessionState] = useState<LiveSessionState>(() => createInitialSessionState());
	const [activeSessionProjectId, setActiveSessionProjectId] = useState<string | null>(null);
	const [statusMessage, setStatusMessage] = useState<StatusMessage>();
	const selectedProjectId = projectState.selectedProject?.id ?? null;
	const selectedProjectIdRef = useRef<string | null>(selectedProjectId);
	const activeSessionProjectIdRef = useRef<string | null>(activeSessionProjectId);
	const latestSessionRequestRef = useRef<SessionRequest | null>(null);
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
	}, [selectedProjectId]);

	useEffect(() => {
		activeSessionProjectIdRef.current = activeSessionProjectId;
	}, [activeSessionProjectId]);

	useEffect(() => {
		if (!activeSessionProjectId || activeSessionProjectId === selectedProjectId) {
			return;
		}

		const sessionId = sessionState.sessionId;
		activeSessionProjectIdRef.current = null;
		setActiveSessionProjectId(null);
		setSessionState(createInitialSessionState());

		if (sessionId) {
			void window.piDesktop.piSession.dispose({ sessionId });
		}
	}, [activeSessionProjectId, selectedProjectId, sessionState.sessionId]);

	useEffect(() => {
		return window.piDesktop.piSession.onEvent((event) => {
			const currentProjectId = selectedProjectIdRef.current;
			if (event.sessionId && (!currentProjectId || !event.sessionId.startsWith(`${currentProjectId}:`))) {
				return;
			}
			if (!event.sessionId) {
				const latestRequest = latestSessionRequestRef.current;
				if (
					!currentProjectId ||
					latestRequest?.projectId !== currentProjectId ||
					activeSessionProjectIdRef.current !== currentProjectId
				) {
					return;
				}
			}

			setSessionState((current) => reduceSessionEvent(current, event));
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

			const reusableSessionId = activeSessionProjectId === selectedProject.id ? sessionState.sessionId : null;
			const requestProjectId = selectedProject.id;
			const request: SessionRequest = {
				id: nextSessionRequestIdRef.current + 1,
				projectId: requestProjectId,
			};
			nextSessionRequestIdRef.current = request.id;
			latestSessionRequestRef.current = request;

			activeSessionProjectIdRef.current = requestProjectId;
			setActiveSessionProjectId(requestProjectId);
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
				activeSessionProjectIdRef.current === requestProjectId;

			if (!requestIsCurrent) {
				if (result.ok && !reusableSessionId) {
					void window.piDesktop.piSession.dispose({ sessionId: result.data.sessionId });
				}
				return false;
			}

			if (!result.ok) {
				setSessionState((current) => ({
					...current,
					status: "failed",
					statusLabel: "Failed",
					errorMessage: result.error.message,
					retryMessage: "",
				}));
				return false;
			}

			if (!reusableSessionId) {
				activeSessionProjectIdRef.current = requestProjectId;
				setActiveSessionProjectId(requestProjectId);
				setSessionState((current) => ({
					...current,
					sessionId: result.data.sessionId,
				}));
			}

			return true;
		},
		[activeSessionProjectId, projectState.selectedProject, sessionState.sessionId],
	);

	const abortSession = useCallback(async () => {
		if (!sessionState.sessionId || activeSessionProjectId !== selectedProjectId) {
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
	}, [activeSessionProjectId, selectedProjectId, sessionState.sessionId]);

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
			session={activeSessionProjectId === selectedProjectId ? sessionState : createInitialSessionState()}
			onProjectState={applyProjectStateViewResult}
			onSubmitPrompt={submitPrompt}
			onAbortSession={abortSession}
		/>
	);
}
