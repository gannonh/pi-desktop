import { describe, expect, it } from "vitest";
import type { CommandPaletteEntry } from "../../src/renderer/chat/command-palette-registry";
import {
	filterCommandPaletteEntries,
	getCommandPaletteTrigger,
	getNextCommandPaletteEntryId,
	isCommandPaletteNavigationKey,
} from "../../src/renderer/chat/command-palette-state";

const entries: CommandPaletteEntry[] = [
	{
		id: "session.new",
		sectionId: "session",
		icon: "SquarePen",
		title: "New session",
		description: "Start a fresh session",
		slashCommand: "new",
		scopeTag: "Session",
		handler: () => ({ type: "insertPrompt", prompt: "New session" }),
	},
	{
		id: "session.info",
		sectionId: "session",
		icon: "SquarePen",
		title: "Session info",
		description: "Show session metadata",
		slashCommand: "session",
		scopeTag: "Session",
		handler: () => ({ type: "handled" }),
	},
	{
		id: "session.clone",
		sectionId: "session",
		icon: "SquarePen",
		title: "Clone session",
		description: "Clone at the current leaf",
		slashCommand: "clone",
		scopeTag: "Session",
		handler: () => ({ type: "handled" }),
	},
	{
		id: "config.model",
		sectionId: "config",
		icon: "Settings",
		title: "Change model",
		description: "Select the active model",
		handler: () => ({ type: "insertPrompt", prompt: "Change model" }),
	},
];

describe("command palette state", () => {
	it("opens for slash at the start of the composer and tracks the query", () => {
		expect(getCommandPaletteTrigger("/ch", 3)).toEqual({ open: true, query: "ch", start: 0, end: 3 });
	});

	it("opens after a word boundary but not in the middle of a word", () => {
		expect(getCommandPaletteTrigger("please /mo", 10)).toEqual({ open: true, query: "mo", start: 7, end: 10 });
		expect(getCommandPaletteTrigger("please/mo", 9)).toEqual({ open: false, query: "", start: -1, end: 9 });
	});

	it("filters entries by title, description, or entry id", () => {
		expect(filterCommandPaletteEntries(entries, "model").map((entry) => entry.id)).toEqual(["config.model"]);
		expect(filterCommandPaletteEntries(entries, "fresh").map((entry) => entry.id)).toEqual(["session.new"]);
		expect(filterCommandPaletteEntries(entries, "session.new").map((entry) => entry.id)).toEqual(["session.new"]);
	});

	it("prioritizes an exact slash-command match over scope-tag substring matches", () => {
		expect(filterCommandPaletteEntries(entries, "session").map((entry) => entry.id)).toEqual(["session.info"]);
	});

	it("wraps keyboard navigation across filtered entries", () => {
		expect(getNextCommandPaletteEntryId(entries, "session.new", 1)).toBe("session.info");
		expect(getNextCommandPaletteEntryId(entries, "session.new", -1)).toBe("config.model");
		expect(getNextCommandPaletteEntryId([], "session.new", 1)).toBeUndefined();
	});

	it("normalizes large negative deltas without returning undefined", () => {
		expect(getNextCommandPaletteEntryId(entries, "session.new", -3)).toBe("session.info");
	});

	it("captures palette navigation keys so they do not submit prompts", () => {
		expect(isCommandPaletteNavigationKey("ArrowDown")).toBe(true);
		expect(isCommandPaletteNavigationKey("ArrowUp")).toBe(true);
		expect(isCommandPaletteNavigationKey("Enter")).toBe(true);
		expect(isCommandPaletteNavigationKey("Escape")).toBe(true);
		expect(isCommandPaletteNavigationKey("a")).toBe(false);
	});
});
