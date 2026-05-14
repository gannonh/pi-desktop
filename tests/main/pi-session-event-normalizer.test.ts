import { describe, expect, it } from "vitest";
import {
	createRuntimeErrorEvent,
	normalizePiSessionEvent,
} from "../../src/main/pi-session/pi-session-event-normalizer";

const receivedAt = "2026-05-14T12:00:00.000Z";
const now = () => receivedAt;

describe("pi session event normalizer", () => {
	it("normalizes user message start events", () => {
		expect(
			normalizePiSessionEvent({
				sessionId: "pi-session:one",
				event: {
					type: "message_start",
					message: {
						role: "user",
						content: [{ type: "text", text: "Hello Pi" }],
						timestamp: 1,
					},
				},
				now,
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
			normalizePiSessionEvent({
				sessionId: "pi-session:one",
				event: {
					type: "message_update",
					message: {
						role: "assistant",
						content: [{ type: "text", text: "Hel" }],
						timestamp: 2,
					},
					assistantMessageEvent: {
						type: "text_delta",
						delta: "lo",
					},
				},
				now,
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

	it("normalizes retry events into visible status and retry updates", () => {
		expect(
			normalizePiSessionEvent({
				sessionId: "pi-session:one",
				event: {
					type: "auto_retry_start",
					attempt: 1,
					maxAttempts: 3,
					delayMs: 500,
					errorMessage: "rate limit",
				},
				now,
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

	it("creates runtime error events without stack traces", () => {
		expect(createRuntimeErrorEvent({ sessionId: "pi-session:one", code: "pi.auth_failed", error: new Error("No API key"), now })).toEqual({
			type: "runtime_error",
			sessionId: "pi-session:one",
			code: "pi.auth_failed",
			message: "No API key",
			receivedAt,
		});
	});
});
