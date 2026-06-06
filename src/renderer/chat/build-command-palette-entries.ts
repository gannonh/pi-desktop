import { getDefaultCommandPaletteEntries } from "./command-palette-default-entries";
import { createCommandPaletteRegistry, type CommandPaletteEntry } from "./command-palette-registry";
import type { PiSessionRuntimeCommand } from "../../shared/pi-session-commands";
import { createOutputCommandPaletteEntries, type OutputCommandPaletteActions } from "./output-command-palette";
import { createRuntimeCommandPaletteEntries } from "./runtime-command-palette-entries";
import { createSessionCommandPaletteEntries, type SessionCommandPaletteActions } from "./session-command-palette";

export type CommandPaletteEntryActions = {
	session?: SessionCommandPaletteActions;
	output?: OutputCommandPaletteActions;
	runtimeCommands?: readonly PiSessionRuntimeCommand[];
};

export function buildCommandPaletteEntries(actions?: CommandPaletteEntryActions): CommandPaletteEntry[] {
	const defaultEntries = getDefaultCommandPaletteEntries();
	const sessionEntries = actions?.session ? createSessionCommandPaletteEntries(actions.session) : undefined;
	const outputEntries = actions?.output ? createOutputCommandPaletteEntries(actions.output) : undefined;
	const runtimeEntries = actions?.runtimeCommands
		? createRuntimeCommandPaletteEntries(actions.runtimeCommands)
		: undefined;
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
		...(runtimeEntries ?? []),
	]).getEntries();
}
