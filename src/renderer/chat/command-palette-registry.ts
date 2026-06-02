export type CommandPaletteSectionId = "session" | "config" | "output" | "meta";

export interface CommandPaletteSection {
	id: CommandPaletteSectionId;
	label: string;
}

export type CommandPaletteAction =
	| { type: "insertPrompt"; prompt: string }
	| { type: "handled" };

export interface CommandPaletteEntry {
	id: string;
	sectionId: CommandPaletteSectionId | string;
	icon: string;
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

const sectionIds = new Set(COMMAND_PALETTE_SECTIONS.map((section) => section.id));

const sectionOrder = new Map(
	COMMAND_PALETTE_SECTIONS.map((section, index) => [section.id, index]),
);

export function createCommandPaletteRegistry(
	initialEntries: CommandPaletteEntry[] = [],
): CommandPaletteRegistry {
	const entries = new Map<string, CommandPaletteEntry>();

	const register = (entry: CommandPaletteEntry) => {
		if (!sectionIds.has(entry.sectionId as CommandPaletteSectionId)) {
			throw new Error(`Unknown command palette section: ${entry.sectionId}`);
		}
		entries.set(entry.id, entry);
	};

	for (const entry of initialEntries) {
		register(entry);
	}

	return {
		register,
		getEntries: () =>
			Array.from(entries.values()).sort((left, right) => {
				const sectionDelta =
					(sectionOrder.get(left.sectionId as CommandPaletteSectionId) ?? 0) -
					(sectionOrder.get(right.sectionId as CommandPaletteSectionId) ?? 0);
				return sectionDelta || left.title.localeCompare(right.title);
			}),
		getEntriesBySection: () =>
			COMMAND_PALETTE_SECTIONS.map((section) => ({
				section,
				entries: Array.from(entries.values())
					.filter((entry) => entry.sectionId === section.id)
					.sort((left, right) => left.title.localeCompare(right.title)),
			})).filter((group) => group.entries.length > 0),
	};
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
		{
			id: "meta.stub",
			sectionId: "meta",
			icon: "CircleHelp",
			title: "Meta/Skills command",
			description: "Meta and skill commands will be wired in the meta slice.",
			scopeTag: "Stub",
			handler: () => ({ type: "insertPrompt", prompt: "Meta/Skills command selected" }),
		},
	];
}
