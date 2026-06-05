import { describe, expect, it, vi } from "vitest";
import { buildCommandPaletteEntries } from "../../src/renderer/chat/build-command-palette-entries";
import { createMockSessionCommandPaletteActions } from "./session-command-palette-fixtures";

const createMockOutputCommandPaletteActions = () => ({
	onCopyLastAssistantMessage: vi.fn(),
	onNotify: vi.fn(),
});

describe("buildCommandPaletteEntries", () => {
	it("uses family stubs when actions are not provided", () => {
		const entries = buildCommandPaletteEntries();

		expect(entries.filter((entry) => entry.sectionId === "session")).toHaveLength(1);
		expect(entries.some((entry) => entry.id === "session.stub")).toBe(true);
		expect(entries.filter((entry) => entry.sectionId === "output")).toHaveLength(1);
		expect(entries.some((entry) => entry.id === "output.stub")).toBe(true);
	});

	it("replaces the session stub with concrete S011 entries when session actions are provided", () => {
		const entries = buildCommandPaletteEntries({ session: createMockSessionCommandPaletteActions() });
		const sessionEntries = entries.filter((entry) => entry.sectionId === "session");

		expect(sessionEntries).toHaveLength(9);
		expect(sessionEntries.some((entry) => entry.id === "session.stub")).toBe(false);
		expect(entries.filter((entry) => entry.sectionId === "config")).toHaveLength(5);
	});

	it("replaces the output stub with concrete S013 entries when output actions are provided", () => {
		const entries = buildCommandPaletteEntries({ output: createMockOutputCommandPaletteActions() });

		expect(entries.some((entry) => entry.id === "output.stub")).toBe(false);
		expect(entries.filter((entry) => entry.sectionId === "output").map((entry) => entry.id)).toEqual([
			"output.copy",
			"output.export",
			"output.share",
		]);
	});
});
