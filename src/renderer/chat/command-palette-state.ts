import type { CommandPaletteEntry } from "./command-palette-registry";

export interface CommandPaletteTrigger {
	open: boolean;
	query: string;
	start: number;
	end: number;
}

export type CommandPaletteKeyAction = "next" | "previous" | "select" | "dismiss";

const emptyTrigger = (end: number): CommandPaletteTrigger => ({
	open: false,
	query: "",
	start: -1,
	end,
});

const keyActions: Record<string, CommandPaletteKeyAction | undefined> = {
	ArrowDown: "next",
	ArrowUp: "previous",
	Enter: "select",
	Escape: "dismiss",
};

export function getCommandPaletteTrigger(text: string, selectionStart = text.length): CommandPaletteTrigger {
	const end = Math.max(0, Math.min(selectionStart, text.length));
	const prefix = text.slice(0, end);
	const slashIndex = prefix.lastIndexOf("/");

	if (slashIndex === -1) {
		return emptyTrigger(end);
	}

	const beforeSlash = prefix.charAt(slashIndex - 1);
	if (slashIndex > 0 && !/\s/.test(beforeSlash)) {
		return emptyTrigger(end);
	}

	const query = prefix.slice(slashIndex + 1);
	if (/\s/.test(query)) {
		return emptyTrigger(end);
	}

	return {
		open: true,
		query,
		start: slashIndex,
		end,
	};
}

export function filterCommandPaletteEntries(entries: CommandPaletteEntry[], query: string): CommandPaletteEntry[] {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) {
		return entries;
	}

	return entries.filter((entry) => {
		const searchable = `${entry.id} ${entry.title} ${entry.description} ${entry.scopeTag ?? ""}`.toLowerCase();
		return searchable.includes(normalizedQuery);
	});
}

export function getNextCommandPaletteEntryId(
	entries: CommandPaletteEntry[],
	activeEntryId: string,
	delta: number,
): string | undefined {
	if (entries.length === 0) {
		return undefined;
	}

	const currentIndex = entries.findIndex((entry) => entry.id === activeEntryId);
	const safeCurrentIndex = currentIndex === -1 ? 0 : currentIndex;
	const nextIndex = (safeCurrentIndex + delta + entries.length) % entries.length;
	return entries[nextIndex]?.id;
}

export function getCommandPaletteKeyAction(key: string): CommandPaletteKeyAction | undefined {
	return keyActions[key];
}

export function isCommandPaletteNavigationKey(key: string): boolean {
	return getCommandPaletteKeyAction(key) !== undefined;
}
