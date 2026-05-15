import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import {
	createRuntimeErrorEvent,
	normalizePiSessionEvent,
} from "../../src/main/pi-session/pi-session-event-normalizer";
import { PiSessionEventSchema } from "../../src/shared/pi-session";

const receivedAt = "2026-05-14T12:00:00.000Z";
const now = () => receivedAt;

type MessageUpdateEvent = Extract<AgentSessionEvent, { type: "message_update" }>;
type TextDeltaEvent = Extract<MessageUpdateEvent["assistantMessageEvent"], { type: "text_delta" }>;
type AssistantMessage = TextDeltaEvent["partial"];

const usage: AssistantMessage["usage"] = {
	input: 1,
	output: 1,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 2,
	cost: {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		total: 0,
	},
};

const assistantMessage = (overrides: Partial<AssistantMessage> = {}): AssistantMessage => ({
	role: "assistant",
	content: [{ type: "text", text: "Hel" }],
	api: "anthropic-messages",
	provider: "anthropic",
	model: "claude-test",
	usage,
	stopReason: "stop",
	timestamp: 2,
	...overrides,
});

const normalizeAndParse = (event: AgentSessionEvent) =>
	normalizePiSessionEvent({ sessionId: "pi-session:one", event, now }).map((normalizedEvent) =>
		PiSessionEventSchema.parse(normalizedEvent),
	);

describe("pi session event normalizer", () => {
	it("normalizes user message start events", () => {
		expect(
			normalizeAndParse({
				type: "message_start",
				message: {
					role: "user",
					content: [{ type: "text", text: "Hello Pi" }],
					timestamp: 1,
				},
			}),
		).toEqual([
			{
				type: "message_start",
				sessionId: "pi-session:one",
				messageId: "user:1",
				role: "user",
				content: "Hello Pi",
				receivedAt,
			},
		]);
	});

	it("normalizes assistant text deltas", () => {
		expect(
			normalizeAndParse({
				type: "message_update",
				message: assistantMessage({ responseId: "resp_123" }),
				assistantMessageEvent: {
					type: "text_delta",
					contentIndex: 0,
					delta: "lo",
					partial: assistantMessage({ responseId: "resp_123" }),
				},
			}),
		).toEqual([
			{
				type: "assistant_delta",
				sessionId: "pi-session:one",
				messageId: "assistant:2",
				delta: "lo",
				receivedAt,
			},
		]);
	});

	it("keeps assistant message ids stable when response ids appear after start", () => {
		const started = assistantMessage({ responseId: undefined, timestamp: 2 });
		const updated = assistantMessage({ responseId: "resp_123", timestamp: 2 });
		const ended = assistantMessage({
			responseId: "resp_123",
			timestamp: 2,
			content: [{ type: "text", text: "Hello" }],
		});

		const events = [
			normalizeAndParse({ type: "message_start", message: started })[0],
			normalizeAndParse({
				type: "message_update",
				message: updated,
				assistantMessageEvent: {
					type: "text_delta",
					contentIndex: 0,
					delta: "lo",
					partial: updated,
				},
			})[0],
			normalizeAndParse({ type: "message_end", message: ended })[0],
		];

		expect(events.map((event) => ("messageId" in event ? event.messageId : undefined))).toEqual([
			"assistant:2",
			"assistant:2",
			"assistant:2",
		]);
	});

	it("normalizes message end events", () => {
		expect(
			normalizeAndParse({
				type: "message_end",
				message: assistantMessage({
					content: [
						{ type: "thinking", thinking: "private" },
						{ type: "text", text: "Done" },
						{ type: "toolCall", id: "tool_1", name: "bash", arguments: {} },
					],
					timestamp: 3,
				}),
			}),
		).toEqual([
			{
				type: "message_end",
				sessionId: "pi-session:one",
				messageId: "assistant:3",
				role: "assistant",
				content: "Done",
				receivedAt,
			},
		]);
	});

	it("maps tool result messages to renderer tool messages with tool call ids", () => {
		expect(
			normalizeAndParse({
				type: "message_end",
				message: {
					role: "toolResult",
					toolCallId: "call_123",
					toolName: "bash",
					content: [
						{ type: "image", data: "base64", mimeType: "image/png" },
						{ type: "text", text: "output" },
					],
					isError: false,
					timestamp: 4,
				},
			}),
		).toEqual([
			{
				type: "message_end",
				sessionId: "pi-session:one",
				messageId: "toolResult:call_123:4",
				role: "tool",
				content: "output",
				receivedAt,
			},
		]);
	});

	it("normalizes timestamped custom messages", () => {
		expect(
			normalizeAndParse({
				type: "message_start",
				message: {
					role: "custom",
					customType: "notice",
					display: true,
					content: "Heads up",
					timestamp: 5,
				},
			} as unknown as AgentSessionEvent),
		).toEqual([
			{
				type: "message_start",
				sessionId: "pi-session:one",
				messageId: "custom:5",
				role: "user",
				content: "Heads up",
				receivedAt,
			},
		]);
	});

	it("ignores standalone timestamp-less malformed message events", () => {
		const message = {
			role: "custom",
			customType: "notice",
			display: true,
			content: "Same",
		};
		const partial = assistantMessage({ timestamp: 5 });

		expect(normalizeAndParse({ type: "message_start", message } as unknown as AgentSessionEvent)).toEqual([]);
		expect(normalizeAndParse({ type: "message_end", message } as unknown as AgentSessionEvent)).toEqual([]);
		expect(
			normalizeAndParse({
				type: "message_update",
				message,
				assistantMessageEvent: {
					type: "text_delta",
					contentIndex: 0,
					delta: "ignored",
					partial,
				},
			} as unknown as AgentSessionEvent),
		).toEqual([]);
	});

	it("skips timestamp-less malformed messages in agent end batches", () => {
		expect(
			normalizeAndParse({
				type: "agent_end",
				messages: [
					{
						role: "custom",
						customType: "notice",
						display: true,
						content: "Same",
					},
					{
						role: "custom",
						customType: "notice",
						display: true,
						content: "Same",
						timestamp: 6,
					},
				],
			} as unknown as AgentSessionEvent),
		).toMatchObject([
			{ type: "status", status: "idle" },
			{ type: "message_end", messageId: "custom:6" },
		]);
	});

	it("normalizes agent status events", () => {
		expect(normalizeAndParse({ type: "agent_start" })).toEqual([
			{
				type: "status",
				sessionId: "pi-session:one",
				status: "running",
				label: "Running",
				receivedAt,
			},
		]);

		expect(normalizeAndParse({ type: "agent_end", messages: [] })).toEqual([
			{
				type: "status",
				sessionId: "pi-session:one",
				status: "idle",
				label: "Idle",
				receivedAt,
			},
		]);
	});

	it("normalizes retry events into visible status and retry updates", () => {
		expect(
			normalizeAndParse({
				type: "auto_retry_start",
				attempt: 1,
				maxAttempts: 3,
				delayMs: 500,
				errorMessage: "rate limit token=secret",
			}),
		).toEqual([
			{
				type: "status",
				sessionId: "pi-session:one",
				status: "retrying",
				label: "Retrying",
				receivedAt,
			},
			{
				type: "retry",
				sessionId: "pi-session:one",
				attempt: 1,
				maxAttempts: 3,
				delayMs: 500,
				message: "rate limit",
				receivedAt,
			},
		]);
	});

	it("normalizes retry completion status events", () => {
		expect(normalizeAndParse({ type: "auto_retry_end", attempt: 1, success: true })).toEqual([
			{
				type: "status",
				sessionId: "pi-session:one",
				status: "running",
				label: "Running",
				receivedAt,
			},
		]);

		expect(normalizeAndParse({ type: "auto_retry_end", attempt: 1, success: false, finalError: "failed" })).toEqual([
			{
				type: "status",
				sessionId: "pi-session:one",
				status: "failed",
				label: "Failed",
				receivedAt,
			},
		]);
	});

	it("ignores events without renderer state changes", () => {
		expect(normalizeAndParse({ type: "turn_start" })).toEqual([]);
	});

	it("creates runtime error events without stack traces or secrets", () => {
		expect(
			PiSessionEventSchema.parse(
				createRuntimeErrorEvent({
					sessionId: "pi-session:one",
					code: "pi.auth_failed",
					error: new Error("No API key\n    at Provider.request\nAuthorization: Bearer secret\napi_key=secret"),
					now,
				}),
			),
		).toEqual({
			type: "runtime_error",
			sessionId: "pi-session:one",
			code: "pi.auth_failed",
			message: "No API key",
			receivedAt,
		});
	});

	it("falls back to non-empty sanitized runtime and retry messages", () => {
		const runtimeError = PiSessionEventSchema.parse(
			createRuntimeErrorEvent({
				sessionId: "pi-session:one",
				code: "pi.unknown",
				error: "token=secret",
				now,
			}),
		);

		expect(runtimeError).toMatchObject({ type: "runtime_error", message: "Pi runtime error." });

		expect(
			normalizeAndParse({
				type: "auto_retry_start",
				attempt: 1,
				maxAttempts: 1,
				delayMs: 0,
				errorMessage: "Authorization: Bearer secret",
			})[1],
		).toMatchObject({ type: "retry", message: "Retry requested." });
	});

	it("sanitizes env-style API key and assignment secrets", () => {
		expect(
			PiSessionEventSchema.parse(
				createRuntimeErrorEvent({
					sessionId: "pi-session:one",
					code: "pi.auth_failed",
					error: "auth failed OPENAI_API_KEY=sk-runtime ANTHROPIC_API_KEY=sk-ant",
					now,
				}),
			),
		).toMatchObject({ type: "runtime_error", message: "auth failed" });

		expect(
			normalizeAndParse({
				type: "auto_retry_start",
				attempt: 1,
				maxAttempts: 1,
				delayMs: 0,
				errorMessage: "retry OPENAI_API_KEY=sk-retry token=abc key=def authorization=Bearer secret",
			})[1],
		).toMatchObject({ type: "retry", message: "retry" });
	});
});
