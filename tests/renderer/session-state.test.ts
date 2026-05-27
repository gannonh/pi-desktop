import { describe, expect, it } from "vitest";
import {
	applySessionHistoryResult,
	applySessionStartResult,
	createInitialSessionState,
	reduceSessionEvent,
} from "../../src/renderer/session/session-state";

const receivedAt = "2026-05-14T12:00:00.000Z";

describe("session history result", () => {
	it("hydrates persisted Pi session history for selected chats", () => {
		expect(
			applySessionHistoryResult({
				sessionId: "project:/tmp/pi-desktop:sdk-session:one",
				status: "idle",
				statusLabel: "Idle",
				messages: [{ id: "user:one", role: "user", content: "what time is it?", streaming: false }],
			}),
		).toEqual({
			sessionId: "project:/tmp/pi-desktop:sdk-session:one",
			status: "idle",
			statusLabel: "Idle",
			messages: [{ id: "user:one", role: "user", content: "what time is it?", streaming: false }],
			toolExecutions: [],
			errorMessage: "",
			retryMessage: "",
			settings: null,
			queuedMessages: [],
		});
	});
});

describe("session start result", () => {
	it("does not regress an already-idle streamed session when the start RPC response arrives late", () => {
		const state = applySessionStartResult(
			{
				...createInitialSessionState(),
				sessionId: "project:/tmp/pi-desktop:session:one",
				status: "idle",
				statusLabel: "Idle",
				messages: [
					{
						id: "assistant:1",
						role: "assistant",
						content: "Pi session streaming is connected.",
						streaming: false,
					},
				],
			},
			{
				sessionId: "project:/tmp/pi-desktop:session:one",
				status: "running",
				statusLabel: "Running",
			},
		);

		expect(state.status).toBe("idle");
		expect(state.statusLabel).toBe("Idle");
		expect(state.messages).toEqual([
			{
				id: "assistant:1",
				role: "assistant",
				content: "Pi session streaming is connected.",
				streaming: false,
			},
		]);
	});

	it("keeps object identity when a late start RPC response matches a running session", () => {
		const state = {
			...createInitialSessionState(),
			sessionId: "project:/tmp/pi-desktop:session:one",
			status: "running" as const,
			statusLabel: "Running",
		};

		const next = applySessionStartResult(state, {
			sessionId: "project:/tmp/pi-desktop:session:one",
			status: "running",
			statusLabel: "Running",
		});

		expect(next).toBe(state);
	});

	it("records the start RPC response when no stream event has identified the session", () => {
		const state = applySessionStartResult(createInitialSessionState(), {
			sessionId: "project:/tmp/pi-desktop:session:one",
			status: "running",
			statusLabel: "Running",
		});

		expect(state.sessionId).toBe("project:/tmp/pi-desktop:session:one");
		expect(state.status).toBe("running");
		expect(state.statusLabel).toBe("Running");
	});
});

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

	it("stores session settings snapshots", () => {
		const state = reduceSessionEvent(createInitialSessionState(), {
			type: "session_settings",
			sessionId: "pi-session:one",
			settings: {
				modelLabel: "5.5 High",
				modelProvider: "openai",
				modelId: "gpt-5.5",
				thinkingLevel: "high",
				availableModels: [{ provider: "openai", id: "gpt-5.5", label: "5.5 High" }],
				availableThinkingLevels: ["off", "high"],
			},
			receivedAt,
		});

		expect(state.settings?.modelLabel).toBe("5.5 High");
	});

	it("stores queued message updates", () => {
		const state = reduceSessionEvent(createInitialSessionState(), {
			type: "queue_update",
			sessionId: "pi-session:one",
			messages: [{ id: { queue: "steer", index: 0 }, text: "Check tests", delivery: "steer" }],
			receivedAt,
		});

		expect(state.queuedMessages).toHaveLength(1);
	});

	it("tracks tool execution lifecycle events by tool call id", () => {
		let state = createInitialSessionState();
		state = reduceSessionEvent(state, {
			type: "tool_execution_start",
			sessionId: "pi-session:one",
			toolCallId: "call_1",
			toolName: "bash",
			args: { command: "ls" },
			receivedAt,
		});
		state = reduceSessionEvent(state, {
			type: "tool_execution_update",
			sessionId: "pi-session:one",
			toolCallId: "call_1",
			toolName: "bash",
			args: { command: "ls" },
			partialResult: { content: [{ type: "text", text: "partial" }] },
			receivedAt: "2026-05-14T12:00:01.000Z",
		});
		state = reduceSessionEvent(state, {
			type: "tool_execution_end",
			sessionId: "pi-session:one",
			toolCallId: "call_1",
			toolName: "bash",
			result: { content: [{ type: "text", text: "done" }] },
			isError: false,
			receivedAt: "2026-05-14T12:00:02.000Z",
		});

		expect(state.toolExecutions).toEqual([
			{
				id: "call_1",
				toolName: "bash",
				status: "completed",
				args: { command: "ls" },
				partialResult: { content: [{ type: "text", text: "partial" }] },
				result: { content: [{ type: "text", text: "done" }] },
				isError: false,
				startedAt: receivedAt,
				updatedAt: "2026-05-14T12:00:02.000Z",
				endedAt: "2026-05-14T12:00:02.000Z",
			},
		]);
	});

	it("creates running rows from out-of-order tool updates", () => {
		const state = reduceSessionEvent(createInitialSessionState(), {
			type: "tool_execution_update",
			sessionId: "pi-session:one",
			toolCallId: "call_late",
			toolName: "bash",
			args: { command: "pwd" },
			partialResult: { content: [{ type: "text", text: "out" }] },
			receivedAt,
		});

		expect(state.toolExecutions[0]).toMatchObject({
			id: "call_late",
			status: "running",
			args: { command: "pwd" },
		});
	});

	it("marks running tools failed when a runtime error arrives", () => {
		let state = reduceSessionEvent(createInitialSessionState(), {
			type: "tool_execution_start",
			sessionId: "pi-session:one",
			toolCallId: "call_1",
			toolName: "bash",
			args: { command: "ls" },
			receivedAt,
		});
		state = reduceSessionEvent(state, {
			type: "runtime_error",
			sessionId: "pi-session:one",
			code: "pi.prompt_failed",
			message: "provider failed",
			receivedAt: "2026-05-14T12:00:03.000Z",
		});

		expect(state.toolExecutions[0]).toMatchObject({
			status: "failed",
			isError: true,
			endedAt: "2026-05-14T12:00:03.000Z",
		});
	});

	it("marks running tools canceled when an abort settles idle", () => {
		let state = reduceSessionEvent(createInitialSessionState(), {
			type: "tool_execution_start",
			sessionId: "pi-session:one",
			toolCallId: "call_1",
			toolName: "bash",
			args: { command: "pnpm test" },
			receivedAt,
		});
		state = reduceSessionEvent(state, {
			type: "status",
			sessionId: "pi-session:one",
			status: "aborting",
			label: "Aborting",
			receivedAt: "2026-05-14T12:00:01.000Z",
		});
		state = reduceSessionEvent(state, {
			type: "status",
			sessionId: "pi-session:one",
			status: "idle",
			label: "Idle",
			receivedAt: "2026-05-14T12:00:02.000Z",
		});

		expect(state.toolExecutions[0]).toMatchObject({
			status: "canceled",
			isError: false,
			result: { content: [{ type: "text", text: "Tool activity canceled by abort." }] },
			endedAt: "2026-05-14T12:00:02.000Z",
		});
	});
});
