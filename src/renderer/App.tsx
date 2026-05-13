import { useCallback, useEffect, useState } from "react";
import type { ProjectStateView } from "../shared/project-state";
import type { ProjectStateViewResult } from "../shared/ipc";
import { AppShell } from "./components/app-shell";

type StatusMessage = {
	source: "project" | "startup";
	message: string;
};

const createEmptyProjectStateView = (): ProjectStateView => ({
	projects: [],
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
});

export function App() {
	const [projectState, setProjectState] = useState<ProjectStateView>(() => createEmptyProjectStateView());
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
			onProjectState={applyProjectStateViewResult}
		/>
	);
}
