import type { CommandPaletteAction, CommandPaletteEntry } from "./command-palette-registry";

export type SessionCommandPaletteActions = {
	onNewSession: () => void;
	onRenameSession: () => void;
	onShowSessionInfo: () => void;
	onForkSession: () => void;
	onCloneSession: () => void;
	onShowPaletteNotice: (message: string) => void;
};

export const SESSION_PALETTE_DEFERRAL_MESSAGES = {
	resume: "Resume a session by selecting a chat in the project sidebar.",
	tree: "Session tree navigation is not available in Desktop yet. Use Fork chat in the sidebar for branch workflows until the tree UI ships.",
	import:
		"Import session from JSONL is not wired in Desktop yet. Use the project sidebar to open existing sessions discovered on disk.",
	compact:
		"Manual session compaction is not exposed in Desktop yet. Pi may still compact during long runs; a dedicated compact action is planned for a later slice.",
} as const;

const sessionEntry = (
	id: string,
	slashCommand: string,
	title: string,
	description: string,
	handler: () => CommandPaletteAction,
): CommandPaletteEntry => ({
	id,
	sectionId: "session",
	icon: "SquarePen",
	title,
	description,
	slashCommand,
	scopeTag: "Session",
	handler,
});

function handled(run: () => void): () => CommandPaletteAction {
	return () => {
		run();
		return { type: "handled" };
	};
}

function handledWithNotice(actions: SessionCommandPaletteActions, message: string): () => CommandPaletteAction {
	return () => {
		actions.onShowPaletteNotice(message);
		return { type: "handled" };
	};
}

export function createSessionCommandPaletteEntries(actions: SessionCommandPaletteActions): CommandPaletteEntry[] {
	return [
		sessionEntry(
			"session.new",
			"new",
			"New session",
			"Start a new chat in the current project or quick start",
			handled(actions.onNewSession),
		),
		sessionEntry(
			"session.resume",
			"resume",
			"Resume session",
			"Switch to another chat to resume its Pi session",
			handledWithNotice(actions, SESSION_PALETTE_DEFERRAL_MESSAGES.resume),
		),
		sessionEntry(
			"session.name",
			"name",
			"Rename session",
			"Rename the selected chat session",
			handled(actions.onRenameSession),
		),
		sessionEntry(
			"session.info",
			"session",
			"Session info",
			"Show identity and status for the selected session",
			handled(actions.onShowSessionInfo),
		),
		sessionEntry(
			"session.tree",
			"tree",
			"Session tree",
			"Navigate branches in the session tree",
			handledWithNotice(actions, SESSION_PALETTE_DEFERRAL_MESSAGES.tree),
		),
		sessionEntry(
			"session.fork",
			"fork",
			"Fork session",
			"Fork the selected chat from its current branch",
			handled(actions.onForkSession),
		),
		sessionEntry(
			"session.clone",
			"clone",
			"Clone session",
			"Clone the selected chat at the current leaf",
			handled(actions.onCloneSession),
		),
		sessionEntry(
			"session.import",
			"import",
			"Import session",
			"Import a session from JSONL",
			handledWithNotice(actions, SESSION_PALETTE_DEFERRAL_MESSAGES.import),
		),
		sessionEntry(
			"session.compact",
			"compact",
			"Compact session",
			"Manually compact session context",
			handledWithNotice(actions, SESSION_PALETTE_DEFERRAL_MESSAGES.compact),
		),
	];
}
