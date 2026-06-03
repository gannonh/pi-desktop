import {
	createCommandPaletteRegistry,
	getDefaultCommandPaletteEntries,
	type CommandPaletteEntry,
} from "./command-palette-registry";
import { createSessionCommandPaletteEntries, type SessionCommandPaletteActions } from "./session-command-palette";

let cachedDefaultNonSessionEntries: CommandPaletteEntry[] | undefined;
let cachedDefaultSessionStubEntries: CommandPaletteEntry[] | undefined;

function getCachedDefaultNonSessionEntries(): CommandPaletteEntry[] {
	if (!cachedDefaultNonSessionEntries) {
		cachedDefaultNonSessionEntries = getDefaultCommandPaletteEntries().filter(
			(entry) => entry.sectionId !== "session",
		);
	}
	return cachedDefaultNonSessionEntries;
}

function getCachedDefaultSessionStubEntries(): CommandPaletteEntry[] {
	if (!cachedDefaultSessionStubEntries) {
		cachedDefaultSessionStubEntries = getDefaultCommandPaletteEntries().filter(
			(entry) => entry.sectionId === "session",
		);
	}
	return cachedDefaultSessionStubEntries;
}

export function buildCommandPaletteEntries(sessionActions?: SessionCommandPaletteActions): CommandPaletteEntry[] {
	const sessionEntries = sessionActions
		? createSessionCommandPaletteEntries(sessionActions)
		: getCachedDefaultSessionStubEntries();

	return createCommandPaletteRegistry([...sessionEntries, ...getCachedDefaultNonSessionEntries()]).getEntries();
}
