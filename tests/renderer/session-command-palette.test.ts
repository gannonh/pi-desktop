import { describe, expect, it, vi } from "vitest";
import { createSessionCommandPaletteEntries } from "../../src/renderer/chat/session-command-palette";

describe("session command palette entries", () => {
	it("registers the nine S011 session entry IDs", () => {
		const actions = {
			onNewSession: vi.fn(),
			onResumeSession: vi.fn(),
			onRenameSession: vi.fn(),
			onShowSessionInfo: vi.fn(),
			onForkSession: vi.fn(),
			onCloneSession: vi.fn(),
			onDefer: vi.fn(),
		};

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
		const actions = {
			onNewSession: vi.fn(),
			onResumeSession: vi.fn(),
			onRenameSession: vi.fn(),
			onShowSessionInfo: vi.fn(),
			onForkSession: vi.fn(),
			onCloneSession: vi.fn(),
			onDefer: vi.fn(),
		};
		const entries = createSessionCommandPaletteEntries(actions);
		const fork = entries.find((entry) => entry.id === "session.fork");

		expect(fork?.handler()).toEqual({ type: "handled" });
		expect(actions.onForkSession).toHaveBeenCalledOnce();
	});

	it("routes deferred commands through onDefer", () => {
		const actions = {
			onNewSession: vi.fn(),
			onResumeSession: vi.fn(),
			onRenameSession: vi.fn(),
			onShowSessionInfo: vi.fn(),
			onForkSession: vi.fn(),
			onCloneSession: vi.fn(),
			onDefer: vi.fn(),
		};
		const entries = createSessionCommandPaletteEntries(actions);
		const compact = entries.find((entry) => entry.id === "session.compact");

		compact?.handler();

		expect(actions.onDefer).toHaveBeenCalledWith(expect.stringContaining("compaction"));
	});
});
