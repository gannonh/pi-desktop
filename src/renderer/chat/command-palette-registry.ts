import { getMetaCommandPaletteEntries } from "./meta-command-palette-entries";

export type CommandPaletteSectionId = "session" | "config" | "output" | "meta";

export type CommandPaletteIconName = "CircleHelp" | "FileOutput" | "Settings" | "SquarePen";

export interface CommandPaletteSection {
	id: CommandPaletteSectionId;
	label: string;
}

export type CommandPaletteAction =
	| { type: "insertPrompt"; prompt: string }
	| { type: "handled" }
	| { type: "showNotice"; message: string };

/** Canonical deferral/out-of-scope handler for palette entries (S014+). */
export function showPaletteNoticeAction(message: string): CommandPaletteAction {
	return { type: "showNotice", message };
}

export interface CommandPaletteEntry {
	id: string;
	sectionId: CommandPaletteSectionId;
	icon: CommandPaletteIconName;
	title: string;
	description: string;
	scopeTag?: string;
	handler: () => CommandPaletteAction;
}

export interface CommandPaletteEntryGroup {
	section: CommandPaletteSection;
	entries: CommandPaletteEntry[];
}

export interface CommandPaletteRegistry {
	register: (entry: CommandPaletteEntry) => void;
	getEntries: () => CommandPaletteEntry[];
	getEntriesBySection: () => CommandPaletteEntryGroup[];
}

export const COMMAND_PALETTE_SECTIONS: CommandPaletteSection[] = [
	{ id: "session", label: "Session" },
	{ id: "config", label: "Config" },
	{ id: "output", label: "Output" },
	{ id: "meta", label: "Meta/Skills" },
];

export const COMMAND_PALETTE_ICON_NAMES: CommandPaletteIconName[] = [
	"CircleHelp",
	"FileOutput",
	"Settings",
	"SquarePen",
];

const sectionIds = new Set<CommandPaletteSectionId>(COMMAND_PALETTE_SECTIONS.map((section) => section.id));

const iconNames = new Set<CommandPaletteIconName>(COMMAND_PALETTE_ICON_NAMES);

const sectionOrder: Record<CommandPaletteSectionId, number> = {
	session: 0,
	config: 1,
	output: 2,
	meta: 3,
};

export function createCommandPaletteRegistry(initialEntries: CommandPaletteEntry[] = []): CommandPaletteRegistry {
	const entries = new Map<string, CommandPaletteEntry>();

	const register = (entry: CommandPaletteEntry) => {
		if (!sectionIds.has(entry.sectionId)) {
			throw new Error(`Unknown command palette section: ${entry.sectionId}`);
		}
		if (!iconNames.has(entry.icon)) {
			throw new Error(`Unknown command palette icon: ${entry.icon}`);
		}
		entries.set(entry.id, entry);
	};

	for (const entry of initialEntries) {
		register(entry);
	}

	const getEntries = () => sortCommandPaletteEntries(Array.from(entries.values()));

	return {
		register,
		getEntries,
		getEntriesBySection: () => groupCommandPaletteEntries(getEntries()),
	};
}

export function groupCommandPaletteEntries(entries: CommandPaletteEntry[]): CommandPaletteEntryGroup[] {
	const entriesBySection: Record<CommandPaletteSectionId, CommandPaletteEntry[]> = {
		session: [],
		config: [],
		output: [],
		meta: [],
	};

	for (const entry of sortCommandPaletteEntries(entries)) {
		entriesBySection[entry.sectionId].push(entry);
	}

	return COMMAND_PALETTE_SECTIONS.map((section) => ({
		section,
		entries: entriesBySection[section.id],
	})).filter((group) => group.entries.length > 0);
}

function sortCommandPaletteEntries(entries: CommandPaletteEntry[]): CommandPaletteEntry[] {
	return [...entries].sort((left, right) => {
		const sectionDelta = sectionOrder[left.sectionId] - sectionOrder[right.sectionId];
		return sectionDelta || left.title.localeCompare(right.title);
	});
}

export function getDefaultCommandPaletteEntries(): CommandPaletteEntry[] {
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
		{
			id: "config.stub",
			sectionId: "config",
			icon: "Settings",
			title: "Config command",
			description: "Config commands will be wired in the config slice.",
			scopeTag: "Stub",
			handler: () => ({ type: "insertPrompt", prompt: "Config command selected" }),
		},
		{
			id: "output.stub",
			sectionId: "output",
			icon: "FileOutput",
			title: "Output command",
			description: "Output commands will be wired in the output slice.",
			scopeTag: "Stub",
			handler: () => ({ type: "insertPrompt", prompt: "Output command selected" }),
		},
		...getMetaCommandPaletteEntries(),
	];
}
