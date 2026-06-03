import { createCommandPaletteRegistry, type CommandPaletteEntry } from "./command-palette-registry";
import {
	buildConfigCommandPaletteEntries,
	NOOP_CONFIG_PALETTE_DEPS,
	type ConfigCommandPaletteDeps,
} from "./config-command-palette-entries";
import { createOutputCommandPaletteEntries, type OutputCommandPaletteActions } from "./output-command-palette";
import { createSessionCommandPaletteEntries, type SessionCommandPaletteActions } from "./session-command-palette";

const SESSION_STUB: CommandPaletteEntry = {
	id: "session.stub",
	sectionId: "session",
	icon: "SquarePen",
	title: "Session command",
	description: "Session commands will be wired in the session slice.",
	scopeTag: "Stub",
	handler: () => ({ type: "insertPrompt", prompt: "Session command selected" }),
};

const OUTPUT_STUB: CommandPaletteEntry = {
	id: "output.stub",
	sectionId: "output",
	icon: "FileOutput",
	title: "Output command",
	description: "Output commands will be wired in the output slice.",
	scopeTag: "Stub",
	handler: () => ({ type: "insertPrompt", prompt: "Output command selected" }),
};

const META_STUB: CommandPaletteEntry = {
	id: "meta.stub",
	sectionId: "meta",
	icon: "CircleHelp",
	title: "Meta/Skills command",
	description: "Meta and skill commands will be wired in the meta slice.",
	scopeTag: "Stub",
	handler: () => ({ type: "insertPrompt", prompt: "Meta/Skills command selected" }),
};

export interface CommandPaletteDeps {
	session?: SessionCommandPaletteActions;
	config?: ConfigCommandPaletteDeps;
	output?: OutputCommandPaletteActions;
}

export function buildCommandPaletteEntries(deps: CommandPaletteDeps = {}): CommandPaletteEntry[] {
	const sessionEntries = deps.session ? createSessionCommandPaletteEntries(deps.session) : [SESSION_STUB];
	const configEntries = buildConfigCommandPaletteEntries(deps.config ?? NOOP_CONFIG_PALETTE_DEPS);
	const outputEntries = deps.output ? createOutputCommandPaletteEntries(deps.output) : [OUTPUT_STUB];

	return createCommandPaletteRegistry([...sessionEntries, ...configEntries, ...outputEntries, META_STUB]).getEntries();
}
