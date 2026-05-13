import { useCallback, useEffect, useMemo, useState } from "react";
import { createDemoWorkspaceState } from "../shared/demo-workspace";
import type { ProjectStateView } from "../shared/project-state";
import type { ProjectStateViewResult } from "../shared/ipc";
import type { WorkspaceState } from "../shared/workspace-state";
import { AppShell } from "./components/app-shell";
import { createWorkspaceSummaryFromPath } from "./shell/workspace-selection";

const createEmptyProjectStateView = (): ProjectStateView => ({
	projects: [],
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
});

const createWorkspaceStateFromProjectState = (projectState: ProjectStateView): WorkspaceState => {
	const shellState = createDemoWorkspaceState();

	return {
		...shellState,
		activeWorkspace: projectState.selectedProject
			? createWorkspaceSummaryFromPath(projectState.selectedProject.path)
			: {
					id: "workspace:no-project",
					name: "No project",
					path: "Work in a project",
				},
	};
};

export function App() {
	const [projectState, setProjectState] = useState<ProjectStateView>(() => createEmptyProjectStateView());
	const [versionLabel, setVersionLabel] = useState("0.0.0");
	const [statusMessage, setStatusMessage] = useState<string>();
	const state = useMemo(() => createWorkspaceStateFromProjectState(projectState), [projectState]);

	const applyProjectStateViewResult = useCallback((result: ProjectStateViewResult) => {
		if (!result.ok) {
			setStatusMessage(result.error.message);
			return;
		}

		setProjectState(result.data);
		setStatusMessage(undefined);
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
				if (versionResult.value.ok) {
					setVersionLabel(versionResult.value.data.version);
				} else {
					setStatusMessage(versionResult.value.error.message);
				}
			} else {
				setStatusMessage(
					versionResult.reason instanceof Error ? versionResult.reason.message : "Unable to load version.",
				);
			}

			if (projectStateResult.status === "fulfilled") {
				applyProjectStateViewResult(projectStateResult.value);
			} else {
				setStatusMessage(
					projectStateResult.reason instanceof Error
						? projectStateResult.reason.message
						: "Unable to load project state.",
				);
			}
		};

		void loadInitialState();

		return () => {
			mounted = false;
		};
	}, [applyProjectStateViewResult]);

	const selectWorkspace = async () => {
		let result: Awaited<ReturnType<typeof window.piDesktop.project.addExistingFolder>>;

		try {
			result = await window.piDesktop.project.addExistingFolder();
		} catch (error) {
			setStatusMessage(error instanceof Error ? error.message : "Unable to select workspace.");
			return;
		}

		applyProjectStateViewResult(result);
	};

	return (
		<AppShell
			state={state}
			versionLabel={versionLabel}
			statusMessage={statusMessage}
			onSelectWorkspace={selectWorkspace}
		/>
	);
}
