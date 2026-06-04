import { describe, expect, it, vi } from "vitest";
import {
	createOutputCommandPaletteActions,
	createOutputCommandPaletteEntries,
} from "../../src/renderer/chat/output-command-palette";
import type { LiveSessionMessage } from "../../src/renderer/session/session-state";

describe("output command palette entries", () => {
	it("registers the three S013 output entry IDs", () => {
		const actions = {
			onCopyLastAssistantMessage: vi.fn(),
			onNotify: vi.fn(),
		};

		const entries = createOutputCommandPaletteEntries(actions);

		expect(entries.map((entry) => entry.id)).toEqual(["output.copy", "output.export", "output.share"]);
		expect(entries.every((entry) => entry.sectionId === "output")).toBe(true);
	});

	it("runs copy through a handled handler", () => {
		const actions = {
			onCopyLastAssistantMessage: vi.fn(),
			onNotify: vi.fn(),
		};
		const entries = createOutputCommandPaletteEntries(actions);
		const copy = entries.find((entry) => entry.id === "output.copy");

		expect(copy?.handler()).toEqual({ type: "handled" });
		expect(actions.onCopyLastAssistantMessage).toHaveBeenCalledOnce();
	});

	it("routes export and share through onNotify", () => {
		const actions = {
			onCopyLastAssistantMessage: vi.fn(),
			onNotify: vi.fn(),
		};
		const entries = createOutputCommandPaletteEntries(actions);

		entries.find((entry) => entry.id === "output.export")?.handler();
		entries.find((entry) => entry.id === "output.share")?.handler();

		expect(actions.onNotify).toHaveBeenCalledTimes(2);
		expect(actions.onNotify.mock.calls[0]?.[0]).toMatch(/export/i);
		expect(actions.onNotify.mock.calls[1]?.[0]).toMatch(/share/i);
	});
});

describe("createOutputCommandPaletteActions", () => {
	const message = (overrides: Partial<LiveSessionMessage>): LiveSessionMessage => ({
		id: "message-1",
		role: "user",
		content: "hello",
		streaming: false,
		...overrides,
	});

	it("copies the last assistant message through writeText", async () => {
		const writeText = vi.fn().mockResolvedValue({ ok: true as const, value: undefined });
		const notify = vi.fn();
		const actions = createOutputCommandPaletteActions({
			getMessages: () => [message({ role: "assistant", content: "Answer text" })],
			writeText,
			notify,
		});

		actions.onCopyLastAssistantMessage();
		await Promise.resolve();

		expect(writeText).toHaveBeenCalledWith({ text: "Answer text" });
		expect(notify).toHaveBeenCalledWith("Copied the last assistant message to the clipboard.");
	});

	it("notifies when there is no assistant message to copy", () => {
		const notify = vi.fn();
		const actions = createOutputCommandPaletteActions({
			getMessages: () => [message({ role: "user", content: "Only user text" })],
			writeText: vi.fn(),
			notify,
		});

		actions.onCopyLastAssistantMessage();

		expect(notify).toHaveBeenCalledWith("No assistant message to copy yet.");
	});

	it("prefixes clipboard write failures with copy context", async () => {
		const writeText = vi.fn().mockResolvedValue({
			ok: false as const,
			error: { message: "Permission denied" },
		});
		const notify = vi.fn();
		const actions = createOutputCommandPaletteActions({
			getMessages: () => [message({ role: "assistant", content: "Answer text" })],
			writeText,
			notify,
		});

		actions.onCopyLastAssistantMessage();
		await Promise.resolve();

		expect(notify).toHaveBeenCalledWith("Copy failed: Permission denied");
	});
});
