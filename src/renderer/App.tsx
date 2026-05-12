import { useEffect, useState } from "react";
import { createDemoWorkspaceState } from "../shared/demo-workspace";
import type { WorkspaceState } from "../shared/workspace-state";
import { AppShell } from "./components/app-shell";
import { createWorkspaceSummaryFromPath } from "./shell/workspace-selection";

export function App() {
	const [state, setState] = useState<WorkspaceState>(() => createDemoWorkspaceState());
	const [versionLabel, setVersionLabel] = useState("0.0.0");
	const [statusMessage, setStatusMessage] = useState<string>();

	useEffect(() => {
		let mounted = true;

		const loadInitialState = async () => {
			const [versionResult, workspaceResult] = await Promise.allSettled([
				window.piDesktop.app.getVersion(),
				window.piDesktop.workspace.getInitialState(),
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

			if (workspaceResult.status === "fulfilled") {
				if (workspaceResult.value.ok) {
					setState(workspaceResult.value.data);
				} else {
					setStatusMessage(workspaceResult.value.error.message);
				}
			} else {
				setStatusMessage(
					workspaceResult.reason instanceof Error
						? workspaceResult.reason.message
						: "Unable to load workspace state.",
				);
			}
		};

		void loadInitialState();

		return () => {
			mounted = false;
		};
	}, []);

	const selectWorkspace = async () => {
		let result: Awaited<ReturnType<typeof window.piDesktop.workspace.selectFolder>>;

		try {
			result = await window.piDesktop.workspace.selectFolder();
		} catch (error) {
			setStatusMessage(error instanceof Error ? error.message : "Unable to select workspace.");
			return;
		}

		if (!result.ok) {
			setStatusMessage(result.error.message);
			return;
		}

		const selection = result.data;

		if (selection.status === "cancelled") {
			setStatusMessage(undefined);
			return;
		}

		setState((current) => ({
			activeWorkspace: createWorkspaceSummaryFromPath(selection.path),
			sessions: current.sessions,
			panels: current.panels,
		}));
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
