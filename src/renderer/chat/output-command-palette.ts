import type { CommandPaletteEntry } from "./command-palette-registry";

export type OutputCommandPaletteActions = {
	onCopyLastAssistantMessage: () => void;
	onDefer: (message: string) => void;
};

const outputEntry = (id: string, title: string, description: string, run: () => void): CommandPaletteEntry => ({
	id,
	sectionId: "output",
	icon: "FileOutput",
	title,
	description,
	scopeTag: "Output",
	handler: () => {
		run();
		return { type: "handled" };
	},
});

export function createOutputCommandPaletteEntries(actions: OutputCommandPaletteActions): CommandPaletteEntry[] {
	return [
		outputEntry("output.copy", "Copy last message", "Copy the last assistant message to the clipboard", () =>
			actions.onCopyLastAssistantMessage(),
		),
		outputEntry("output.export", "Export session", "Export the session to HTML or JSONL", () =>
			actions.onDefer(
				"Session export to HTML or JSONL is not available in Desktop yet. Use the Pi CLI export path until export IPC ships.",
			),
		),
		outputEntry("output.share", "Share session", "Share the session as a secret GitHub gist", () =>
			actions.onDefer(
				"Session sharing via gist is not available in Desktop yet. Use the Pi CLI /share path until share IPC ships.",
			),
		),
	];
}
