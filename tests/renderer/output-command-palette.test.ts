import { describe, expect, it, vi } from "vitest";
import { createOutputCommandPaletteEntries } from "../../src/renderer/chat/output-command-palette";

describe("output command palette entries", () => {
	it("registers the three S013 output entry IDs", () => {
		const actions = {
			onCopyLastAssistantMessage: vi.fn(),
			onDefer: vi.fn(),
		};

		const entries = createOutputCommandPaletteEntries(actions);

		expect(entries.map((entry) => entry.id)).toEqual(["output.copy", "output.export", "output.share"]);
		expect(entries.every((entry) => entry.sectionId === "output")).toBe(true);
	});

	it("runs copy through a handled handler", () => {
		const actions = {
			onCopyLastAssistantMessage: vi.fn(),
			onDefer: vi.fn(),
		};
		const entries = createOutputCommandPaletteEntries(actions);
		const copy = entries.find((entry) => entry.id === "output.copy");

		expect(copy?.handler()).toEqual({ type: "handled" });
		expect(actions.onCopyLastAssistantMessage).toHaveBeenCalledOnce();
	});

	it("routes export and share through onDefer", () => {
		const actions = {
			onCopyLastAssistantMessage: vi.fn(),
			onDefer: vi.fn(),
		};
		const entries = createOutputCommandPaletteEntries(actions);

		entries.find((entry) => entry.id === "output.export")?.handler();
		entries.find((entry) => entry.id === "output.share")?.handler();

		expect(actions.onDefer).toHaveBeenCalledTimes(2);
		expect(actions.onDefer.mock.calls[0]?.[0]).toMatch(/export/i);
		expect(actions.onDefer.mock.calls[1]?.[0]).toMatch(/share/i);
	});
});
