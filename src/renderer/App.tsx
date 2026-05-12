import { useEffect, useState } from "react";
import { createDemoWorkspaceState } from "../shared/demo-workspace";
import type { WorkspaceState } from "../shared/workspace-state";
import { AppShell } from "./components/app-shell";

export function App() {
	const [state, setState] = useState<WorkspaceState>(() => createDemoWorkspaceState());
	const [versionLabel, setVersionLabel] = useState("0.0.0");
	const [statusMessage, setStatusMessage] = useState<string>();

	useEffect(() => {
		let mounted = true;

		const loadInitialState = async () => {
			try {
				const [versionResult, workspaceResult] = await Promise.all([
					window.piDesktop.app.getVersion(),
					window.piDesktop.workspace.getInitialState(),
				]);

				if (!mounted) {
					return;
				}

				if (versionResult.ok) {
					setVersionLabel(versionResult.data.version);
				} else {
					setStatusMessage(versionResult.error.message);
				}

				if (workspaceResult.ok) {
					setState(workspaceResult.data);
				} else {
					setStatusMessage(workspaceResult.error.message);
				}
			} catch (error) {
				if (mounted) {
					setStatusMessage(error instanceof Error ? error.message : "Unable to load app state.");
				}
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
			return;
		}

		setState((current) => ({
			activeWorkspace: {
				id: current.activeWorkspace.id,
				name: selection.path.split("/").filter(Boolean).at(-1) ?? selection.path,
				path: selection.path,
			},
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
