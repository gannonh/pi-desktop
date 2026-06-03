import {
	createCommandPaletteRegistry,
	getDefaultCommandPaletteEntries,
	type CommandPaletteEntry,
} from "./command-palette-registry";
import { createSessionCommandPaletteEntries, type SessionCommandPaletteActions } from "./session-command-palette";

export function buildCommandPaletteEntries(sessionActions?: SessionCommandPaletteActions): CommandPaletteEntry[] {
	const nonSessionEntries = getDefaultCommandPaletteEntries().filter((entry) => entry.sectionId !== "session");
	const sessionEntries = sessionActions
		? createSessionCommandPaletteEntries(sessionActions)
		: getDefaultCommandPaletteEntries().filter((entry) => entry.sectionId === "session");

	return createCommandPaletteRegistry([...sessionEntries, ...nonSessionEntries]).getEntries();
}
