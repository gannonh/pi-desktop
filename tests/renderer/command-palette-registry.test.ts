import { describe, expect, it } from "vitest";
import { buildCommandPaletteEntries } from "../../src/renderer/chat/build-command-palette-entries";
import { getDefaultCommandPaletteEntries } from "../../src/renderer/chat/command-palette-default-entries";
import { createMockSessionCommandPaletteActions } from "./session-command-palette-fixtures";
import {
	COMMAND_PALETTE_SECTIONS,
	createCommandPaletteRegistry,
	type CommandPaletteEntry,
} from "../../src/renderer/chat/command-palette-registry";

describe("command palette registry", () => {
	it("registers stub entries for every S009 matrix section", () => {
		const registry = createCommandPaletteRegistry(getDefaultCommandPaletteEntries());
		const entriesBySection = registry.getEntriesBySection();

		expect(COMMAND_PALETTE_SECTIONS.map((section) => section.id)).toEqual(["session", "config", "output", "meta"]);
		expect(Object.fromEntries(entriesBySection.map((group) => [group.section.id, group.entries.length]))).toEqual({
			session: 1,
			config: 5,
			output: 1,
			meta: 1,
		});
	});

	it("builds grouped session entries for S011 when session actions are provided", () => {
		const entries = buildCommandPaletteEntries({ session: createMockSessionCommandPaletteActions() });
		const registry = createCommandPaletteRegistry(entries);
		const sessionGroup = registry.getEntriesBySection().find((group) => group.section.id === "session");

		expect(sessionGroup?.entries.map((entry) => entry.id)).toContain("session.new");
		expect(sessionGroup?.entries).toHaveLength(9);
	});

	it("lets family slices replace section stubs through buildCommandPaletteEntries", () => {
		const entries = buildCommandPaletteEntries({
			output: {
				onCopyLastAssistantMessage: () => {},
				onNotify: () => {},
			},
		});

		expect(entries.some((entry) => entry.id === "output.stub")).toBe(false);
		expect(entries.some((entry) => entry.id === "output.copy")).toBe(true);
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
