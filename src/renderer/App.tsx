import { useEffect, useState } from "react";
import { createDemoWorkspaceState } from "../shared/demo-workspace";
import type { ProjectStateView } from "../shared/project-state";
import type { WorkspaceState } from "../shared/workspace-state";
import { AppShell } from "./components/app-shell";
import { createWorkspaceSummaryFromPath } from "./shell/workspace-selection";

const applyProjectStateView = (current: WorkspaceState, projectState: ProjectStateView): WorkspaceState => ({
	activeWorkspace: projectState.selectedProject
		? createWorkspaceSummaryFromPath(projectState.selectedProject.path)
		: current.activeWorkspace,
	sessions: current.sessions,
	panels: current.panels,
});

export function App() {
	const [state, setState] = useState<WorkspaceState>(() => createDemoWorkspaceState());
	const [versionLabel, setVersionLabel] = useState("0.0.0");
	const [statusMessage, setStatusMessage] = useState<string>();

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
				if (projectStateResult.value.ok) {
					const projectState = projectStateResult.value.data;
					setState((current) => applyProjectStateView(current, projectState));
				} else {
					setStatusMessage(projectStateResult.value.error.message);
				}
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
	}, []);

	const selectWorkspace = async () => {
		let result: Awaited<ReturnType<typeof window.piDesktop.project.addExistingFolder>>;

		try {
			result = await window.piDesktop.project.addExistingFolder();
		} catch (error) {
			setStatusMessage(error instanceof Error ? error.message : "Unable to select workspace.");
			return;
		}

		if (!result.ok) {
			setStatusMessage(result.error.message);
			return;
		}

		setState((current) => applyProjectStateView(current, result.data));
		setStatusMessage(undefined);
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
