import { buildConfigCommandPaletteEntries } from "./config-command-palette-entries";
import type { CommandPaletteEntry } from "./command-palette-registry";
import { getMetaCommandPaletteEntries, type MetaCommandPaletteActions } from "./meta-command-palette-entries";

export function getDefaultCommandPaletteEntries(metaActions?: MetaCommandPaletteActions): CommandPaletteEntry[] {
	return [
		{
			id: "session.stub",
			sectionId: "session",
			icon: "SquarePen",
			title: "Session command",
			description: "Session commands will be wired in the session slice.",
			scopeTag: "Stub",
			handler: () => ({ type: "insertPrompt", prompt: "Session command selected" }),
		},
		...buildConfigCommandPaletteEntries(),
		{
			id: "output.stub",
			sectionId: "output",
			icon: "FileOutput",
			title: "Output command",
			description: "Output commands will be wired in the output slice.",
			scopeTag: "Stub",
			handler: () => ({ type: "insertPrompt", prompt: "Output command selected" }),
		},
		...getMetaCommandPaletteEntries(metaActions),
	];
}
