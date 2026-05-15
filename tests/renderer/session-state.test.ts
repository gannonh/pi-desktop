import { describe, expect, it } from "vitest";
import { createInitialSessionState, reduceSessionEvent } from "../../src/renderer/session/session-state";

const receivedAt = "2026-05-14T12:00:00.000Z";

describe("session state reducer", () => {
	it("adds user messages and streams assistant deltas", () => {
		let state = createInitialSessionState();
		state = reduceSessionEvent(state, {
			type: "message_start",
			sessionId: "pi-session:one",
			messageId: "user:1",
			role: "user",
			content: "Hello",
			receivedAt,
		});
		state = reduceSessionEvent(state, {
			type: "message_start",
			sessionId: "pi-session:one",
			messageId: "assistant:2",
			role: "assistant",
			content: "",
			receivedAt,
		});
		state = reduceSessionEvent(state, {
			type: "assistant_delta",
			sessionId: "pi-session:one",
			messageId: "assistant:2",
			delta: "Hi",
			receivedAt,
		});

		expect(state.messages).toEqual([
			{ id: "user:1", role: "user", content: "Hello", streaming: false },
			{ id: "assistant:2", role: "assistant", content: "Hi", streaming: true },
		]);
	});

	it("records runtime errors and failed status", () => {
		const state = reduceSessionEvent(createInitialSessionState(), {
			type: "runtime_error",
			sessionId: "pi-session:one",
			code: "pi.prompt_failed",
			message: "No API key",
			receivedAt,
		});

		expect(state.status).toBe("failed");
		expect(state.errorMessage).toBe("No API key");
	});

	it("records retry messages", () => {
		const state = reduceSessionEvent(createInitialSessionState(), {
			type: "retry",
			sessionId: "pi-session:one",
			attempt: 1,
			maxAttempts: 3,
			delayMs: 500,
			message: "rate limit",
			receivedAt,
		});

		expect(state.retryMessage).toBe("Retry 1 of 3: rate limit");
	});
});
