import {
	createCommandPaletteRegistry,
	getDefaultCommandPaletteEntries,
	type CommandPaletteEntry,
} from "./command-palette-registry";
import { createSessionCommandPaletteEntries, type SessionCommandPaletteActions } from "./session-command-palette";

export function buildCommandPaletteEntries(sessionActions?: SessionCommandPaletteActions): CommandPaletteEntry[] {
	const defaultEntries = getDefaultCommandPaletteEntries();
	const nonSessionEntries = defaultEntries.filter((entry) => entry.sectionId !== "session");
	const sessionEntries = sessionActions
		? createSessionCommandPaletteEntries(sessionActions)
		: defaultEntries.filter((entry) => entry.sectionId === "session");

	return createCommandPaletteRegistry([...sessionEntries, ...nonSessionEntries]).getEntries();
}
