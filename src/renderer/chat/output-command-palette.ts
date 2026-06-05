import type { ClipboardWriteTextInput, ClipboardWriteTextResult } from "../../shared/ipc";
import type { LiveSessionMessage } from "../session/session-state";
import type { StatusMessageTone } from "../status-message";
import { getLastAssistantMessageContent } from "./last-assistant-message";
import type { CommandPaletteEntry } from "./command-palette-registry";

export type OutputCommandPaletteActions = {
	onCopyLastAssistantMessage: () => void;
	onNotify: (message: string, tone?: StatusMessageTone) => void;
};

export type OutputCommandPaletteDeps = {
	getMessages: () => readonly LiveSessionMessage[];
	writeText: (input: ClipboardWriteTextInput) => Promise<ClipboardWriteTextResult>;
	notify: (message: string, tone?: StatusMessageTone) => void;
};

export function createOutputCommandPaletteActions(deps: OutputCommandPaletteDeps): OutputCommandPaletteActions {
	return {
		onCopyLastAssistantMessage: () => {
			const content = getLastAssistantMessageContent(deps.getMessages());
			if (!content) {
				deps.notify("No assistant message to copy yet.", "info");
				return;
			}
			void deps
				.writeText({ text: content })
				.then((result) => {
					if (result.ok) {
						deps.notify("Copied the last assistant message to the clipboard.", "success");
						return;
					}
					deps.notify(`Copy failed: ${result.error.message}`, "error");
				})
				.catch((error) => {
					const message = error instanceof Error ? error.message : "Unable to copy the last assistant message.";
					deps.notify(`Copy failed: ${message}`, "error");
				});
		},
		onNotify: deps.notify,
	};
}

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
		outputEntry(
			"output.copy",
			"Copy last message",
			"Copy the last assistant message to the clipboard",
			actions.onCopyLastAssistantMessage,
		),
		outputEntry("output.export", "Export session", "Export the session to HTML or JSONL", () =>
			actions.onNotify(
				"Session export to HTML or JSONL is not available in Desktop yet. Use the Pi CLI export path until export IPC ships.",
			),
		),
		outputEntry("output.share", "Share session", "Share the session as a secret GitHub gist", () =>
			actions.onNotify(
				"Session sharing via gist is not available in Desktop yet. Use the Pi CLI /share path until share IPC ships.",
			),
		),
	];
}
