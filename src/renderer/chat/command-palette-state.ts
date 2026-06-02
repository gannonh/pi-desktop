import type { CommandPaletteEntry } from "./command-palette-registry";

export interface CommandPaletteTrigger {
	open: boolean;
	query: string;
	start: number;
	end: number;
}

const emptyTrigger = (end: number): CommandPaletteTrigger => ({
	open: false,
	query: "",
	start: -1,
	end,
});

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

export function isCommandPaletteNavigationKey(key: string): boolean {
	return key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === "Escape";
}
