import {
	createCommandPaletteRegistry,
	getDefaultCommandPaletteEntries,
	type CommandPaletteEntry,
} from "./command-palette-registry";
import { createOutputCommandPaletteEntries, type OutputCommandPaletteActions } from "./output-command-palette";

const defaultCommandPaletteEntries = getDefaultCommandPaletteEntries();

export type CommandPaletteEntryActions = {
	output?: OutputCommandPaletteActions;
};

export function buildCommandPaletteEntries(actions?: CommandPaletteEntryActions): CommandPaletteEntry[] {
	const outputEntries = actions?.output ? createOutputCommandPaletteEntries(actions.output) : undefined;
	const baseEntries = defaultCommandPaletteEntries.filter((entry) => entry.id !== "output.stub" || !outputEntries);

	return createCommandPaletteRegistry([...baseEntries, ...(outputEntries ?? [])]).getEntries();
}
