import { describe, expect, it } from "vitest";
import {
	PiSessionAbortInputSchema,
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
});
