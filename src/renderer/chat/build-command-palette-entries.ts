import { getDefaultCommandPaletteEntries } from "./command-palette-default-entries";
import { createCommandPaletteRegistry, type CommandPaletteEntry } from "./command-palette-registry";
import { createOutputCommandPaletteEntries, type OutputCommandPaletteActions } from "./output-command-palette";
import { createSessionCommandPaletteEntries, type SessionCommandPaletteActions } from "./session-command-palette";

export type CommandPaletteEntryActions = {
	session?: SessionCommandPaletteActions;
	output?: OutputCommandPaletteActions;
};

export function buildCommandPaletteEntries(actions?: CommandPaletteEntryActions): CommandPaletteEntry[] {
	const defaultEntries = getDefaultCommandPaletteEntries();
	const sessionEntries = actions?.session ? createSessionCommandPaletteEntries(actions.session) : undefined;
	const outputEntries = actions?.output ? createOutputCommandPaletteEntries(actions.output) : undefined;
	const baseEntries = defaultEntries.filter((entry) => {
		if (entry.sectionId === "session" && sessionEntries) {
			return false;
		}
		if (entry.id === "output.stub" && outputEntries) {
			return false;
		}
		return true;
	});

	return createCommandPaletteRegistry([
		...baseEntries,
		...(sessionEntries ?? []),
		...(outputEntries ?? []),
	]).getEntries();
}
