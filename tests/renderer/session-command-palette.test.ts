import { describe, expect, it } from "vitest";
import { createSessionCommandPaletteEntries } from "../../src/renderer/chat/session-command-palette";
import { createMockSessionCommandPaletteActions } from "./session-command-palette-fixtures";

describe("session command palette entries", () => {
	it("registers the nine S011 session entry IDs", () => {
		const actions = createMockSessionCommandPaletteActions();
		const entries = createSessionCommandPaletteEntries(actions);

		expect(entries.map((entry) => entry.id)).toEqual([
			"session.new",
			"session.resume",
			"session.name",
			"session.info",
			"session.tree",
			"session.fork",
			"session.clone",
			"session.import",
			"session.compact",
		]);
		expect(entries.every((entry) => entry.sectionId === "session")).toBe(true);
	});

	it("runs palette actions through handled handlers", () => {
		const actions = createMockSessionCommandPaletteActions();
		const entries = createSessionCommandPaletteEntries(actions);
		const fork = entries.find((entry) => entry.id === "session.fork");

		expect(fork?.handler()).toEqual({ type: "handled" });
		expect(actions.onForkSession).toHaveBeenCalledOnce();
	});

	it("routes resume and deferred commands through onDefer", () => {
		const actions = createMockSessionCommandPaletteActions();
		const entries = createSessionCommandPaletteEntries(actions);
		const resume = entries.find((entry) => entry.id === "session.resume");
		const compact = entries.find((entry) => entry.id === "session.compact");

		resume?.handler();
		compact?.handler();

		expect(actions.onDefer).toHaveBeenCalledWith("Resume a session by selecting a chat in the project sidebar.");
		expect(actions.onDefer).toHaveBeenCalledWith(expect.stringContaining("compaction"));
	});
});
