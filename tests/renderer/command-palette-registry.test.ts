import { describe, expect, it } from "vitest";
import {
	COMMAND_PALETTE_SECTIONS,
	createCommandPaletteRegistry,
	getDefaultCommandPaletteEntries,
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
			meta: 1,
		});
	});

	it("lets family slices register stable entries without changing the API", () => {
		const registry = createCommandPaletteRegistry();
		registry.register({
			id: "session.new",
			sectionId: "session",
			icon: "Plus",
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

		expect(() =>
			registry.register({
				id: "unknown.entry",
				sectionId: "unknown",
				icon: "CircleHelp",
				title: "Unknown",
				description: "Invalid section",
				handler: () => ({ type: "insertPrompt", prompt: "Unknown" }),
			}),
		).toThrow("Unknown command palette section: unknown");
	});
});
