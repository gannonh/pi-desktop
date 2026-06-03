import {
	createCommandPaletteRegistry,
	getDefaultCommandPaletteEntries,
	type CommandPaletteEntry,
} from "./command-palette-registry";
import { createOutputCommandPaletteEntries, type OutputCommandPaletteActions } from "./output-command-palette";

export type CommandPaletteEntryActions = {
	output?: OutputCommandPaletteActions;
};

export function buildCommandPaletteEntries(actions?: CommandPaletteEntryActions): CommandPaletteEntry[] {
	const outputEntries = actions?.output ? createOutputCommandPaletteEntries(actions.output) : undefined;
	const baseEntries = getDefaultCommandPaletteEntries().filter((entry) => {
		if (entry.sectionId === "output" && outputEntries) {
			return false;
		}
		return true;
	});

	return createCommandPaletteRegistry([...baseEntries, ...(outputEntries ?? [])]).getEntries();
}
