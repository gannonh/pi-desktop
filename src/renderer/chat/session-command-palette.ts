import type { CommandPaletteEntry } from "./command-palette-registry";

export type SessionCommandPaletteActions = {
	onNewSession: () => void;
	onResumeSession: () => void;
	onRenameSession: () => void;
	onShowSessionInfo: () => void;
	onForkSession: () => void;
	onCloneSession: () => void;
	onDefer: (message: string) => void;
};

const sessionEntry = (id: string, title: string, description: string, run: () => void): CommandPaletteEntry => ({
	id,
	sectionId: "session",
	icon: "SquarePen",
	title,
	description,
	scopeTag: "Session",
	handler: () => {
		run();
		return { type: "handled" };
	},
});

export function createSessionCommandPaletteEntries(actions: SessionCommandPaletteActions): CommandPaletteEntry[] {
	return [
		sessionEntry("session.new", "New session", "Start a new chat in the current project or quick start", () =>
			actions.onNewSession(),
		),
		sessionEntry("session.resume", "Resume session", "Switch to another chat to resume its Pi session", () =>
			actions.onResumeSession(),
		),
		sessionEntry("session.name", "Rename session", "Rename the selected chat session", () =>
			actions.onRenameSession(),
		),
		sessionEntry("session.info", "Session info", "Show identity and status for the selected session", () =>
			actions.onShowSessionInfo(),
		),
		sessionEntry("session.tree", "Session tree", "Navigate branches in the session tree", () =>
			actions.onDefer(
				"Session tree navigation is not available in Desktop yet. Use Fork chat in the sidebar for branch workflows until the tree UI ships.",
			),
		),
		sessionEntry("session.fork", "Fork session", "Fork the selected chat from its current branch", () =>
			actions.onForkSession(),
		),
		sessionEntry("session.clone", "Clone session", "Clone the selected chat at the current leaf", () =>
			actions.onCloneSession(),
		),
		sessionEntry("session.import", "Import session", "Import a session from JSONL", () =>
			actions.onDefer(
				"Import session from JSONL is not wired in Desktop yet. Use the project sidebar to open existing sessions discovered on disk.",
			),
		),
		sessionEntry("session.compact", "Compact session", "Manually compact session context", () =>
			actions.onDefer(
				"Manual session compaction is not exposed in Desktop yet. Pi may still compact during long runs; a dedicated compact action is planned for a later slice.",
			),
		),
	];
}
