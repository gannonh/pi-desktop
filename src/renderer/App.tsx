import { useCallback, useEffect, useState } from "react";
import type { ProjectStateView } from "../shared/project-state";
import type { ProjectStateViewResult } from "../shared/ipc";
import { AppShell } from "./components/app-shell";
import { createInitialSessionState, reduceSessionEvent, type LiveSessionState } from "./session/session-state";

type StatusMessage = {
	source: "project" | "startup";
	message: string;
};

const createEmptyProjectStateView = (): ProjectStateView => ({
	projects: [],
	standaloneChats: [],
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
});

const getSessionStatusLabel = (status: LiveSessionState["status"]): string => {
	switch (status) {
		case "starting":
			return "Starting";
		case "running":
			return "Running";
		case "retrying":
			return "Retrying";
		case "aborting":
			return "Aborting";
		case "failed":
			return "Failed";
		case "idle":
			return "Idle";
	}
};

export function App() {
	const [projectState, setProjectState] = useState<ProjectStateView>(() => createEmptyProjectStateView());
	const [sessionState, setSessionState] = useState<LiveSessionState>(() => createInitialSessionState());
	const [statusMessage, setStatusMessage] = useState<StatusMessage>();

	const applyProjectStateViewResult = useCallback((result: ProjectStateViewResult) => {
		if (!result.ok) {
			setStatusMessage({ source: "project", message: result.error.message });
			return;
		}

		setProjectState(result.data);
		setStatusMessage((current) => (current?.source === "project" ? undefined : current));
	}, []);

	useEffect(() => {
		return window.piDesktop.piSession.onEvent((event) => {
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
				}));
				return;
			}

			setSessionState((current) => ({
				...current,
				status: sessionState.sessionId ? "running" : "starting",
				statusLabel: sessionState.sessionId ? "Running" : "Starting",
				errorMessage: "",
			}));

			const result = sessionState.sessionId
				? await window.piDesktop.piSession.submit({ sessionId: sessionState.sessionId, prompt })
				: await window.piDesktop.piSession.start({ projectId: selectedProject.id, prompt });

			if (!result.ok) {
				setSessionState((current) => ({
					...current,
					status: "failed",
					statusLabel: "Failed",
					errorMessage: result.error.message,
				}));
				return;
			}

			setSessionState((current) => ({
				...current,
				sessionId: result.data.sessionId,
				status: result.data.status,
				statusLabel: getSessionStatusLabel(result.data.status),
			}));
		},
		[projectState.selectedProject, sessionState.sessionId],
	);

	const abortSession = useCallback(async () => {
		if (!sessionState.sessionId) {
			return;
		}

		const result = await window.piDesktop.piSession.abort({ sessionId: sessionState.sessionId });
		if (!result.ok) {
			setSessionState((current) => ({
				...current,
				status: "failed",
				statusLabel: "Failed",
				errorMessage: result.error.message,
			}));
			return;
		}

		setSessionState((current) => ({
			...current,
			status: result.data.status,
			statusLabel: getSessionStatusLabel(result.data.status),
		}));
	}, [sessionState.sessionId]);

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
			session={sessionState}
			onProjectState={applyProjectStateViewResult}
			onSubmitPrompt={submitPrompt}
			onAbortSession={abortSession}
		/>
	);
}
