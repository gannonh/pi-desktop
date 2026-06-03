import { describe, expect, it } from "vitest";
import {
	COMMAND_PALETTE_SECTIONS,
	createCommandPaletteRegistry,
	getDefaultCommandPaletteEntries,
	type CommandPaletteEntry,
} from "../../src/renderer/chat/command-palette-registry";

describe("command palette registry", () => {
	it("registers stub entries for every S009 matrix section", () => {
		const registry = createCommandPaletteRegistry(getDefaultCommandPaletteEntries());
		const entriesBySection = registry.getEntriesBySection();

		expect(COMMAND_PALETTE_SECTIONS.map((section) => section.id)).toEqual(["session", "config", "output", "meta"]);
		expect(Object.fromEntries(entriesBySection.map((group) => [group.section.id, group.entries.length]))).toEqual({
			session: 1,
			config: 1,
			output: 1,
			meta: 4,
		});
	});

	it("registers S014 meta entries with stable matrix IDs", () => {
		const registry = createCommandPaletteRegistry(getDefaultCommandPaletteEntries());
		const metaEntries = registry.getEntriesBySection().find((group) => group.section.id === "meta")?.entries ?? [];

		expect(metaEntries.map((entry) => entry.id)).toEqual([
			"meta.changelog",
			"meta.hotkeys",
			"meta.quit",
			"meta.reload",
		]);
	});

	it("lets family slices register stable entries without changing the API", () => {
		const registry = createCommandPaletteRegistry();
		registry.register({
			id: "session.new",
			sectionId: "session",
			icon: "SquarePen",
			title: "New session",
			description: "Start a new Pi session",
			scopeTag: "Session",
			handler: () => ({ type: "insertPrompt", prompt: "Start a new session" }),
		});

		expect(registry.getEntries()).toMatchObject([
			{
				id: "session.new",
				sectionId: "session",
				title: "New session",
				scopeTag: "Session",
			},
		]);
		expect(registry.getEntries()[0]?.handler()).toEqual({
			type: "insertPrompt",
			prompt: "Start a new session",
		});
	});

	it("rejects entries for unknown sections", () => {
		const registry = createCommandPaletteRegistry();
		const invalidEntry = {
			id: "unknown.entry",
			sectionId: "unknown",
			icon: "CircleHelp",
			title: "Unknown",
			description: "Invalid section",
			handler: () => ({ type: "insertPrompt", prompt: "Unknown" }),
		} as unknown as CommandPaletteEntry;

		expect(() => registry.register(invalidEntry)).toThrow("Unknown command palette section: unknown");
	});

	it("rejects entries for unknown icons before the popover renders them", () => {
		const registry = createCommandPaletteRegistry();
		const invalidEntry = {
			id: "session.bad-icon",
			sectionId: "session",
			icon: "MissingIcon",
			title: "Bad icon",
			description: "Invalid icon",
			handler: () => ({ type: "insertPrompt", prompt: "Bad icon" }),
		} as unknown as CommandPaletteEntry;

		expect(() => registry.register(invalidEntry)).toThrow("Unknown command palette icon: MissingIcon");
	});
});
