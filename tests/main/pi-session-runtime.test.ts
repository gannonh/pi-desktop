import { describe, expect, it, vi } from "vitest";
import { createPiSessionRuntime, type PiSdkSession } from "../../src/main/pi-session/pi-session-runtime";
import type { PiSessionEvent } from "../../src/shared/pi-session";

const now = () => "2026-05-14T12:00:00.000Z";

const createFakeSession = () => {
	let listener: ((event: any) => void) | undefined;
	const session: PiSdkSession = {
		sessionId: "sdk-session:one",
		subscribe: vi.fn((nextListener) => {
			listener = nextListener;
			return () => {
				listener = undefined;
			};
		}),
		bindExtensions: vi.fn(async () => undefined),
		prompt: vi.fn(async (prompt: string) => {
			listener?.({
				type: "message_start",
				message: { role: "user", content: [{ type: "text", text: prompt }], timestamp: 1 },
			});
			listener?.({
				type: "message_update",
				message: { role: "assistant", content: [{ type: "text", text: "Hi" }], timestamp: 2 },
				assistantMessageEvent: { type: "text_delta", delta: "Hi" },
			});
			listener?.({
				type: "agent_end",
				messages: [],
			});
		}),
		abort: vi.fn(async () => undefined),
		dispose: vi.fn(() => undefined),
	};

	return { session };
};

describe("createPiSessionRuntime", () => {
	it("starts a session and streams normalized events", async () => {
		const events: PiSessionEvent[] = [];
		const { session } = createFakeSession();
		const runtime = createPiSessionRuntime({
			now,
			emit: (event) => events.push(event),
			createAgentSession: vi.fn(async () => ({ session })),
		});

		const result = await runtime.start({
			projectId: "project:/tmp/pi-desktop",
			workspacePath: "/tmp/pi-desktop",
			prompt: "Hello",
		});

		expect(result.status).toBe("running");
		await runtime.whenIdle(result.sessionId);
		expect(session.bindExtensions).toHaveBeenCalledWith({});
		expect(session.prompt).toHaveBeenCalledWith("Hello");
		expect(events.map((event) => event.type)).toEqual([
			"status",
			"message_start",
			"assistant_delta",
			"status",
		]);
	});

	it("aborts an active session", async () => {
		const events: PiSessionEvent[] = [];
		const { session } = createFakeSession();
		const runtime = createPiSessionRuntime({
			now,
			emit: (event) => events.push(event),
			createAgentSession: vi.fn(async () => ({ session })),
		});

		const result = await runtime.start({
			projectId: "project:/tmp/pi-desktop",
			workspacePath: "/tmp/pi-desktop",
			prompt: "Hello",
		});
		await runtime.abort({ sessionId: result.sessionId });

		expect(session.abort).toHaveBeenCalled();
		expect(events).toContainEqual({
			type: "status",
			sessionId: result.sessionId,
			status: "aborting",
			label: "Aborting",
			receivedAt: "2026-05-14T12:00:00.000Z",
		});
	});

	it("emits startup errors clearly", async () => {
		const events: PiSessionEvent[] = [];
		const runtime = createPiSessionRuntime({
			now,
			emit: (event) => events.push(event),
			createAgentSession: vi.fn(async () => {
				throw new Error("No API key found for provider");
			}),
		});

		await expect(
			runtime.start({
				projectId: "project:/tmp/pi-desktop",
				workspacePath: "/tmp/pi-desktop",
				prompt: "Hello",
			}),
		).rejects.toThrow("No API key found for provider");

		expect(events[0]).toEqual({
			type: "runtime_error",
			code: "pi.session_start_failed",
			message: "No API key found for provider",
			receivedAt: "2026-05-14T12:00:00.000Z",
		});
	});
});
