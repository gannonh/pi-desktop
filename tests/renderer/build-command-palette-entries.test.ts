import { describe, expect, it } from "vitest";
import { buildCommandPaletteEntries } from "../../src/renderer/chat/build-command-palette-entries";
import { createMockSessionCommandPaletteActions } from "./session-command-palette-fixtures";

describe("buildCommandPaletteEntries", () => {
	it("uses section stubs when actions are not provided", () => {
		const entries = buildCommandPaletteEntries();
		const sessionEntries = entries.filter((entry) => entry.sectionId === "session");
		const outputEntries = entries.filter((entry) => entry.sectionId === "output");

		expect(sessionEntries).toHaveLength(1);
		expect(sessionEntries[0]?.id).toBe("session.stub");
		expect(outputEntries).toHaveLength(1);
		expect(outputEntries[0]?.id).toBe("output.stub");
	});

	it("replaces the session stub with concrete S011 entries when actions are provided", () => {
		const entries = buildCommandPaletteEntries({ session: createMockSessionCommandPaletteActions() });
		const sessionEntries = entries.filter((entry) => entry.sectionId === "session");

		expect(sessionEntries).toHaveLength(9);
		expect(sessionEntries.some((entry) => entry.id === "session.stub")).toBe(false);
		expect(entries.filter((entry) => entry.sectionId === "config")).toHaveLength(5);
	});
});
