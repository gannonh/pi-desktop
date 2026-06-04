import { describe, expect, it } from "vitest";
import { buildCommandPaletteEntries } from "../../src/renderer/chat/build-command-palette-entries";
import { createMockSessionCommandPaletteActions } from "./session-command-palette-fixtures";

describe("buildCommandPaletteEntries", () => {
	it("uses session stubs when session actions are not provided", () => {
		const entries = buildCommandPaletteEntries();
		const sessionEntries = entries.filter((entry) => entry.sectionId === "session");

		expect(sessionEntries).toHaveLength(1);
		expect(sessionEntries[0]?.id).toBe("session.stub");
	});

	it("replaces the session stub with concrete S011 entries when actions are provided", () => {
		const entries = buildCommandPaletteEntries(createMockSessionCommandPaletteActions());
		const sessionEntries = entries.filter((entry) => entry.sectionId === "session");

		expect(sessionEntries).toHaveLength(9);
		expect(sessionEntries.some((entry) => entry.id === "session.stub")).toBe(false);
		expect(entries.filter((entry) => entry.sectionId === "config")).toHaveLength(5);
	});
});
