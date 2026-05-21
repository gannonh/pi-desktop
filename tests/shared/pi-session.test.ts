import { describe, expect, it } from "vitest";
import {
	PiSessionAbortInputSchema,
	PiSessionActionResultSchema,
	PiSessionDisposeInputSchema,
	PiSessionEventSchema,
	PiSessionHistoryInputSchema,
	PiSessionHistoryResultSchema,
	PiSessionStartInputSchema,
	PiSessionStartResultSchema,
	PiSessionSubmitInputSchema,
} from "../../src/shared/pi-session";

describe("Pi session contracts", () => {
	it("validates start, submit, and abort inputs strictly", () => {
		expect(
			PiSessionStartInputSchema.parse({
				projectId: "project:/tmp/pi-desktop",
				chatId: null,
				prompt: "What files are here?",
			}),
		).toEqual({
			projectId: "project:/tmp/pi-desktop",
			chatId: null,
			prompt: "What files are here?",
		});

		expect(PiSessionStartInputSchema.parse({ projectId: null, prompt: "What files are here?" })).toEqual({
			projectId: null,
			prompt: "What files are here?",
		});

		expect(
			PiSessionSubmitInputSchema.parse({
				sessionId: "pi-session:one",
				prompt: "Continue",
			}),
		).toEqual({
			sessionId: "pi-session:one",
			prompt: "Continue",
		});

		expect(PiSessionAbortInputSchema.parse({ sessionId: "pi-session:one" })).toEqual({
			sessionId: "pi-session:one",
		});

		expect(() =>
			PiSessionStartInputSchema.parse({
				projectId: "project:/tmp/pi-desktop",
				prompt: "What files are here?",
				workspacePath: "/tmp/pi-desktop",
			}),
		).toThrow();
	});

	it("validates history input strictly", () => {
		expect(PiSessionHistoryInputSchema.parse({ projectId: "project:/tmp/pi-desktop", chatId: "chat:one" })).toEqual({
			projectId: "project:/tmp/pi-desktop",
			chatId: "chat:one",
		});

		expect(PiSessionHistoryInputSchema.parse({ projectId: null, chatId: "chat:standalone" })).toEqual({
			projectId: null,
			chatId: "chat:standalone",
		});

		expect(() => PiSessionHistoryInputSchema.parse({ projectId: null, chatId: "" })).toThrow();
	});

	it("validates dispose input strictly", () => {
		expect(PiSessionDisposeInputSchema.parse({ sessionId: "pi-session:one" })).toEqual({
			sessionId: "pi-session:one",
		});

		expect(() =>
			PiSessionDisposeInputSchema.parse({
				sessionId: "pi-session:one",
				reason: "done",
			}),
		).toThrow();
	});

	it("rejects whitespace-only prompts", () => {
		expect(() => PiSessionStartInputSchema.parse({ projectId: "project:/tmp/pi-desktop", prompt: "   " })).toThrow();
		expect(() => PiSessionSubmitInputSchema.parse({ sessionId: "pi-session:one", prompt: "\t\n" })).toThrow();
	});

	it("accepts image-only submit payloads", () => {
		expect(
			PiSessionSubmitInputSchema.parse({
				sessionId: "pi-session:one",
				prompt: "",
				images: [{ type: "image", data: "aGVsbG8=", mimeType: "image/png" }],
			}),
		).toEqual({
			sessionId: "pi-session:one",
			prompt: "",
			images: [{ type: "image", data: "aGVsbG8=", mimeType: "image/png" }],
		});
	});

	it("validates session start results", () => {
		const result = PiSessionStartResultSchema.parse({
			ok: true,
			data: {
				sessionId: "pi-session:one",
				projectId: "project:/tmp/pi-desktop",
				chatId: "chat:one",
				workspacePath: "/tmp/pi-desktop",
				sessionPath: "/tmp/pi-session.jsonl",
				status: "running",
				resumed: false,
			},
		});

		expect(result.ok).toBe(true);
	});

	it("validates session history results", () => {
		expect(
			PiSessionHistoryResultSchema.parse({
				ok: true,
				data: {
					sessionId: "project:/tmp/pi-desktop:sdk-session:one",
					status: "idle",
					statusLabel: "Idle",
					messages: [{ id: "user:one", role: "user", content: "Hello", streaming: false }],
				},
			}),
		).toEqual({
			ok: true,
			data: {
				sessionId: "project:/tmp/pi-desktop:sdk-session:one",
				status: "idle",
				statusLabel: "Idle",
				messages: [{ id: "user:one", role: "user", content: "Hello", streaming: false }],
			},
		});
	});

	it("validates action and failed result shapes", () => {
		expect(
			PiSessionActionResultSchema.parse({
				ok: true,
				data: {
					sessionId: "pi-session:one",
					status: "aborting",
				},
			}),
		).toEqual({
			ok: true,
			data: {
				sessionId: "pi-session:one",
				status: "aborting",
			},
		});

		expect(
			PiSessionStartResultSchema.parse({
				ok: false,
				error: {
					code: "pi_session.runtime_failed",
					message: "Pi runtime failed.",
				},
			}),
		).toEqual({
			ok: false,
			error: {
				code: "pi_session.runtime_failed",
				message: "Pi runtime failed.",
			},
		});

		expect(() =>
			PiSessionActionResultSchema.parse({
				ok: false,
				data: {
					sessionId: "pi-session:one",
					status: "failed",
				},
				error: {
					code: "pi_session.runtime_failed",
					message: "Pi runtime failed.",
				},
			}),
		).toThrow();
	});

	it("rejects invalid status names and extra payload keys", () => {
		expect(() =>
			PiSessionStartResultSchema.parse({
				ok: true,
				data: {
					sessionId: "pi-session:one",
					projectId: "project:/tmp/pi-desktop",
					chatId: null,
					workspacePath: "/tmp/pi-desktop",
					sessionPath: null,
					status: "complete",
					resumed: false,
				},
			}),
		).toThrow();

		expect(() =>
			PiSessionStartResultSchema.parse({
				ok: true,
				data: {
					sessionId: "pi-session:one",
					projectId: "project:/tmp/pi-desktop",
					chatId: null,
					workspacePath: "/tmp/pi-desktop",
					sessionPath: null,
					status: "running",
					resumed: false,
					providerSecret: "secret",
				},
			}),
		).toThrow();
	});

	it("validates renderer-safe streaming events", () => {
		expect(
			PiSessionEventSchema.parse({
				type: "assistant_delta",
				sessionId: "pi-session:one",
				messageId: "assistant:1",
				delta: "Hello",
				receivedAt: "2026-05-14T12:00:00.000Z",
			}),
		).toEqual({
			type: "assistant_delta",
			sessionId: "pi-session:one",
			messageId: "assistant:1",
			delta: "Hello",
			receivedAt: "2026-05-14T12:00:00.000Z",
		});

		expect(() =>
			PiSessionEventSchema.parse({
				type: "runtime_error",
				sessionId: "pi-session:one",
				message: "",
				receivedAt: "2026-05-14T12:00:00.000Z",
			}),
		).toThrow();
	});

	it("rejects extra keys inside event branches", () => {
		expect(() =>
			PiSessionEventSchema.parse({
				type: "assistant_delta",
				sessionId: "pi-session:one",
				messageId: "assistant:1",
				delta: "Hello",
				receivedAt: "2026-05-14T12:00:00.000Z",
				raw: { provider: "pi" },
			}),
		).toThrow();
	});

	it("validates tool execution lifecycle events", () => {
		const receivedAt = "2026-05-14T12:00:00.000Z";

		expect(
			PiSessionEventSchema.parse({
				type: "tool_execution_start",
				sessionId: "pi-session:one",
				toolCallId: "call_1",
				toolName: "bash",
				args: { command: "ls" },
				receivedAt,
			}),
		).toMatchObject({ type: "tool_execution_start", toolName: "bash" });

		expect(
			PiSessionEventSchema.parse({
				type: "tool_execution_update",
				sessionId: "pi-session:one",
				toolCallId: "call_1",
				toolName: "bash",
				args: { command: "ls" },
				partialResult: { content: [{ type: "text", text: "out" }] },
				receivedAt,
			}),
		).toMatchObject({ type: "tool_execution_update" });

		expect(
			PiSessionEventSchema.parse({
				type: "tool_execution_end",
				sessionId: "pi-session:one",
				toolCallId: "call_1",
				toolName: "bash",
				result: { content: [{ type: "text", text: "done" }], details: {} },
				isError: false,
				receivedAt,
			}),
		).toMatchObject({ type: "tool_execution_end", isError: false });
	});
});
