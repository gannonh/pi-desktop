import type { WorkspaceState } from "../../shared/workspace-state";

export interface ShellSections {
	workspaceLabel: string;
	workspacePath: string;
	sessionLabels: string[];
	panelLabels: string[];
}

export const createShellSections = (state: WorkspaceState): ShellSections => ({
	workspaceLabel: state.activeWorkspace.name,
	workspacePath: state.activeWorkspace.path,
	sessionLabels: state.sessions.map((session) => session.title),
	panelLabels: state.panels.map((panel) => panel.title),
});
