import { describe, expect, it } from "vitest";
import { getLastAssistantMessageContent } from "../../src/renderer/chat/last-assistant-message";
import type { LiveSessionMessage } from "../../src/renderer/session/session-state";

const message = (overrides: Partial<LiveSessionMessage>): LiveSessionMessage => ({
	id: "message-1",
	role: "user",
	content: "hello",
	streaming: false,
	...overrides,
});

describe("getLastAssistantMessageContent", () => {
	it("returns the last non-empty assistant message", () => {
		const content = getLastAssistantMessageContent([
			message({ id: "user-1", role: "user", content: "Question" }),
			message({ id: "assistant-1", role: "assistant", content: "First answer" }),
			message({ id: "user-2", role: "user", content: "Follow up" }),
			message({ id: "assistant-2", role: "assistant", content: "Latest answer" }),
		]);

		expect(content).toBe("Latest answer");
	});

	it("skips empty assistant messages at the end", () => {
		const content = getLastAssistantMessageContent([
			message({ id: "assistant-1", role: "assistant", content: "Useful answer" }),
			message({ id: "assistant-2", role: "assistant", content: "   " }),
		]);

		expect(content).toBe("Useful answer");
	});

	it("skips streaming assistant messages", () => {
		const content = getLastAssistantMessageContent([
			message({ id: "assistant-1", role: "assistant", content: "Complete answer" }),
			message({ id: "assistant-2", role: "assistant", content: "Partial answer", streaming: true }),
		]);

		expect(content).toBe("Complete answer");
	});

	it("returns untrimmed content when only surrounding whitespace differs from trim", () => {
		const content = getLastAssistantMessageContent([
			message({ id: "assistant-1", role: "assistant", content: "  formatted answer\n" }),
		]);

		expect(content).toBe("  formatted answer\n");
	});

	it("returns null when no assistant message exists", () => {
		expect(
			getLastAssistantMessageContent([message({ id: "user-1", role: "user", content: "Only user text" })]),
		).toBeNull();
	});

	it("returns null when only streaming assistant messages exist", () => {
		expect(
			getLastAssistantMessageContent([
				message({ id: "assistant-1", role: "assistant", content: "Partial answer", streaming: true }),
			]),
		).toBeNull();
	});
});
