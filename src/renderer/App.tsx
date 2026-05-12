import { useEffect, useState } from "react";
import { createDemoWorkspaceState } from "../shared/demo-workspace";
import type { WorkspaceState } from "../shared/workspace-state";
import { AppShell } from "./components/app-shell";

export function App() {
	const [state, setState] = useState<WorkspaceState>(() => createDemoWorkspaceState());
	const [versionLabel, setVersionLabel] = useState("0.0.0");

	useEffect(() => {
		let mounted = true;

		const loadInitialState = async () => {
			const [versionResult, workspaceResult] = await Promise.all([
				window.piDesktop.app.getVersion(),
				window.piDesktop.workspace.getInitialState(),
			]);

			if (!mounted) {
				return;
			}

			if (versionResult.ok) {
				setVersionLabel(versionResult.data.version);
			}

			if (workspaceResult.ok) {
				setState(workspaceResult.data);
			}
		};

		void loadInitialState();

		return () => {
			mounted = false;
		};
	}, []);

	const selectWorkspace = async () => {
		const result = await window.piDesktop.workspace.selectFolder();

		if (!result.ok) {
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
	};

	return <AppShell state={state} versionLabel={versionLabel} onSelectWorkspace={selectWorkspace} />;
}
