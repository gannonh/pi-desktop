import type { WorkspaceState } from "./workspace-state";

export const createDemoWorkspaceState = (): WorkspaceState => ({
	activeWorkspace: {
		id: "workspace-pi-desktop",
		name: "pi-desktop",
		path: "/path/to/pi-desktop",
	},
	sessions: [
		{
			id: "session-foundation",
			title: "Milestone 0 foundation",
			status: "idle",
			lastUpdatedLabel: "Ready",
		},
		{
			id: "session-roadmap",
			title: "Roadmap planning",
			status: "idle",
			lastUpdatedLabel: "Recent",
		},
	],
	panels: [
		{
			id: "panel-files",
			kind: "files",
			title: "Files",
			summary: "Project files will appear here in Milestone 1.",
		},
		{
			id: "panel-diffs",
			kind: "diffs",
			title: "Diffs",
			summary: "Agent changes will appear here in Milestone 3.",
		},
		{
			id: "panel-terminal",
			kind: "terminal",
			title: "Terminal",
			summary: "Command output will appear here in Milestone 3.",
		},
	],
});
