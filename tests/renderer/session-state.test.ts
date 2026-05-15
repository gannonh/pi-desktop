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

	it("stops in-flight assistant messages when runtime errors arrive", () => {
		let state = createInitialSessionState();
		state = reduceSessionEvent(state, {
			type: "message_start",
			sessionId: "pi-session:one",
			messageId: "assistant:1",
			role: "assistant",
			content: "",
			receivedAt,
		});
		state = reduceSessionEvent(state, {
			type: "assistant_delta",
			sessionId: "pi-session:one",
			messageId: "assistant:1",
			delta: "Partial",
			receivedAt,
		});
		state = reduceSessionEvent(state, {
			type: "runtime_error",
			sessionId: "pi-session:one",
			code: "pi.prompt_failed",
			message: "provider failed",
			receivedAt,
		});

		expect(state.messages).toEqual([{ id: "assistant:1", role: "assistant", content: "Partial", streaming: false }]);
		expect(state.status).toBe("failed");
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

	it("ignores events from other sessions once a session is active", () => {
		let state = createInitialSessionState();
		state = reduceSessionEvent(state, {
			type: "message_start",
			sessionId: "pi-session:one",
			messageId: "user:1",
			role: "user",
			content: "Hello",
			receivedAt,
		});

		const next = reduceSessionEvent(state, {
			type: "message_start",
			sessionId: "pi-session:two",
			messageId: "user:2",
			role: "user",
			content: "Wrong session",
			receivedAt,
		});

		expect(next).toBe(state);
	});

	it("allows sessionless runtime errors without replacing the active session", () => {
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
			type: "runtime_error",
			code: "pi.prompt_failed",
			message: "No API key",
			receivedAt,
		});

		expect(state.sessionId).toBe("pi-session:one");
		expect(state.status).toBe("failed");
		expect(state.errorMessage).toBe("No API key");
	});

	it("does not replace streamed or finalized content for duplicate message starts", () => {
		let state = createInitialSessionState();
		state = reduceSessionEvent(state, {
			type: "message_start",
			sessionId: "pi-session:one",
			messageId: "assistant:1",
			role: "assistant",
			content: "",
			receivedAt,
		});
		state = reduceSessionEvent(state, {
			type: "assistant_delta",
			sessionId: "pi-session:one",
			messageId: "assistant:1",
			delta: "Hi",
			receivedAt,
		});
		state = reduceSessionEvent(state, {
			type: "message_end",
			sessionId: "pi-session:one",
			messageId: "assistant:1",
			role: "assistant",
			content: "Hi",
			receivedAt,
		});
		state = reduceSessionEvent(state, {
			type: "message_start",
			sessionId: "pi-session:one",
			messageId: "assistant:1",
			role: "assistant",
			content: "",
			receivedAt,
		});

		expect(state.messages).toEqual([{ id: "assistant:1", role: "assistant", content: "Hi", streaming: false }]);
	});

	it("ignores late assistant deltas after message end", () => {
		let state = createInitialSessionState();
		state = reduceSessionEvent(state, {
			type: "message_end",
			sessionId: "pi-session:one",
			messageId: "assistant:1",
			role: "assistant",
			content: "Complete",
			receivedAt,
		});
		state = reduceSessionEvent(state, {
			type: "assistant_delta",
			sessionId: "pi-session:one",
			messageId: "assistant:1",
			delta: " late",
			receivedAt,
		});

		expect(state.messages).toEqual([{ id: "assistant:1", role: "assistant", content: "Complete", streaming: false }]);
	});

	it("clears retry messages when retrying stops or a runtime error occurs", () => {
		let state = reduceSessionEvent(createInitialSessionState(), {
			type: "retry",
			sessionId: "pi-session:one",
			attempt: 1,
			maxAttempts: 3,
			message: "rate limit",
			receivedAt,
		});
		state = reduceSessionEvent(state, {
			type: "status",
			sessionId: "pi-session:one",
			status: "running",
			label: "Running",
			receivedAt,
		});

		expect(state.retryMessage).toBe("");

		state = reduceSessionEvent(state, {
			type: "retry",
			sessionId: "pi-session:one",
			attempt: 2,
			maxAttempts: 3,
			message: "rate limit",
			receivedAt,
		});
		state = reduceSessionEvent(state, {
			type: "runtime_error",
			sessionId: "pi-session:one",
			code: "pi.prompt_failed",
			message: "No API key",
			receivedAt,
		});

		expect(state.retryMessage).toBe("");
	});

	it("ignores assistant deltas for unknown messages", () => {
		const state = reduceSessionEvent(createInitialSessionState(), {
			type: "assistant_delta",
			sessionId: "pi-session:one",
			messageId: "assistant:missing",
			delta: "Lost",
			receivedAt,
		});

		expect(state.messages).toEqual([]);
	});
});
