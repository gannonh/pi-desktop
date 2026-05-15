import { describe, expect, it } from "vitest";
import {
	PiSessionAbortInputSchema,
	PiSessionActionResultSchema,
	PiSessionDisposeInputSchema,
	PiSessionEventSchema,
	PiSessionStartInputSchema,
	PiSessionStartResultSchema,
	PiSessionSubmitInputSchema,
} from "../../src/shared/pi-session";

describe("Pi session contracts", () => {
	it("validates start, submit, and abort inputs strictly", () => {
		expect(
			PiSessionStartInputSchema.parse({
				projectId: "project:/tmp/pi-desktop",
				prompt: "What files are here?",
			}),
		).toEqual({
			projectId: "project:/tmp/pi-desktop",
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

	it("validates session start results", () => {
		const result = PiSessionStartResultSchema.parse({
			ok: true,
			data: {
				sessionId: "pi-session:one",
				projectId: "project:/tmp/pi-desktop",
				workspacePath: "/tmp/pi-desktop",
				status: "running",
			},
		});

		expect(result.ok).toBe(true);
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
					workspacePath: "/tmp/pi-desktop",
					status: "complete",
				},
			}),
		).toThrow();

		expect(() =>
			PiSessionStartResultSchema.parse({
				ok: true,
				data: {
					sessionId: "pi-session:one",
					projectId: "project:/tmp/pi-desktop",
					workspacePath: "/tmp/pi-desktop",
					status: "running",
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
});
