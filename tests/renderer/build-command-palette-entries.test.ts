import { describe, expect, it, vi } from "vitest";
import { buildCommandPaletteEntries } from "../../src/renderer/chat/build-command-palette-entries";

describe("build command palette entries", () => {
	it("replaces the output stub when output actions are provided", () => {
		const actions = {
			onCopyLastAssistantMessage: vi.fn(),
			onDefer: vi.fn(),
		};
		const entries = buildCommandPaletteEntries({ output: actions });

		expect(entries.some((entry) => entry.id === "output.stub")).toBe(false);
		expect(entries.filter((entry) => entry.sectionId === "output").map((entry) => entry.id)).toEqual([
			"output.copy",
			"output.export",
			"output.share",
		]);
	});

	it("keeps the output stub when output actions are omitted", () => {
		const entries = buildCommandPaletteEntries();

		expect(entries.some((entry) => entry.id === "output.stub")).toBe(true);
	});
});
