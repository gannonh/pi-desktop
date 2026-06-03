import { getDefaultCommandPaletteEntries } from "./command-palette-default-entries";
import { createCommandPaletteRegistry, type CommandPaletteEntry } from "./command-palette-registry";
import { createOutputCommandPaletteEntries, type OutputCommandPaletteActions } from "./output-command-palette";
import { createSessionCommandPaletteEntries, type SessionCommandPaletteActions } from "./session-command-palette";

const defaultCommandPaletteEntries = getDefaultCommandPaletteEntries();

export type CommandPaletteEntryActions = {
	session?: SessionCommandPaletteActions;
	output?: OutputCommandPaletteActions;
};

export function buildCommandPaletteEntries(actions?: CommandPaletteEntryActions): CommandPaletteEntry[] {
	const sessionEntries = actions?.session ? createSessionCommandPaletteEntries(actions.session) : undefined;
	const outputEntries = actions?.output ? createOutputCommandPaletteEntries(actions.output) : undefined;
	const baseEntries = defaultCommandPaletteEntries.filter((entry) => {
		if (entry.id === "session.stub" && sessionEntries) {
			return false;
		}
		if (entry.id === "output.stub" && outputEntries) {
			return false;
		}
		return true;
	});

	return createCommandPaletteRegistry([
		...(sessionEntries ?? []),
		...baseEntries,
		...(outputEntries ?? []),
	]).getEntries();
}
