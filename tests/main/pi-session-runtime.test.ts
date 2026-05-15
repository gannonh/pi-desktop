import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import { createPiSessionRuntime, type PiSdkSession } from "../../src/main/pi-session/pi-session-runtime";
import type { PiSessionEvent } from "../../src/shared/pi-session";

const now = () => "2026-05-14T12:00:00.000Z";

const createDeferred = <T = void>() => {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((nextResolve, nextReject) => {
		resolve = nextResolve;
		reject = nextReject;
	});

	return { promise, resolve, reject };
};

const waitForScheduledPrompt = () => new Promise((resolve) => setTimeout(resolve, 0));

const createFakeSession = () => {
	let listener: ((event: AgentSessionEvent) => void) | undefined;
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
			} as AgentSessionEvent);
			listener?.({
				type: "message_update",
				message: { role: "assistant", content: [{ type: "text", text: "Hi" }], timestamp: 2 },
				assistantMessageEvent: { type: "text_delta", delta: "Hi" },
			} as AgentSessionEvent);
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

const createControlledSession = () => {
	let listener: ((event: AgentSessionEvent) => void) | undefined;
	const promptResult = createDeferred();
	const session: PiSdkSession = {
		sessionId: "sdk-session:one",
		subscribe: vi.fn((nextListener) => {
			listener = nextListener;
			return () => {
				listener = undefined;
			};
		}),
		bindExtensions: vi.fn(async () => undefined),
		prompt: vi.fn(() => promptResult.promise),
		abort: vi.fn(async () => undefined),
		dispose: vi.fn(() => undefined),
	};

	return { emitSdkEvent: (event: AgentSessionEvent) => listener?.(event), promptResult, session };
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
		expect(events.map((event) => event.type)).toEqual(["status", "message_start", "assistant_delta", "status"]);
	});

	it("returns the started session before emitting first prompt events", async () => {
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
		expect(events).toEqual([]);
		await runtime.whenIdle(result.sessionId);
		expect(events.map((event) => event.type)).toEqual(["status", "message_start", "assistant_delta", "status"]);
	});

	it("aborts an active session", async () => {
		const events: PiSessionEvent[] = [];
		const { promptResult, session } = createControlledSession();
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
		promptResult.resolve();
		await runtime.whenIdle(result.sessionId);
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

	it("emits prompt failures clearly and marks the session failed", async () => {
		const events: PiSessionEvent[] = [];
		const { promptResult, session } = createControlledSession();
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
		await waitForScheduledPrompt();
		promptResult.reject(new Error("provider failed"));
		await runtime.whenIdle(result.sessionId);

		expect(events).toContainEqual({
			type: "runtime_error",
			sessionId: result.sessionId,
			code: "pi.prompt_failed",
			message: "provider failed",
			receivedAt: "2026-05-14T12:00:00.000Z",
		});
		expect(events).toContainEqual({
			type: "status",
			sessionId: result.sessionId,
			status: "failed",
			label: "Failed",
			receivedAt: "2026-05-14T12:00:00.000Z",
		});
	});

	it("rejects overlapping submits without replacing the in-flight prompt", async () => {
		const events: PiSessionEvent[] = [];
		const { promptResult, session } = createControlledSession();
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
		const idle = runtime.whenIdle(result.sessionId);

		await expect(runtime.submit({ sessionId: result.sessionId, prompt: "Second" })).rejects.toThrow(
			"Pi session is already running.",
		);
		await waitForScheduledPrompt();
		expect(session.prompt).toHaveBeenCalledTimes(1);

		promptResult.resolve();
		await idle;
		await expect(idle).resolves.toBeUndefined();
	});

	it("keeps prompt ownership active after SDK idle until the prompt promise settles", async () => {
		const events: PiSessionEvent[] = [];
		const { emitSdkEvent, promptResult, session } = createControlledSession();
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
		await waitForScheduledPrompt();
		const idle = runtime.whenIdle(result.sessionId);
		let idleSettled = false;
		void idle.then(() => {
			idleSettled = true;
		});

		emitSdkEvent({ type: "agent_end", messages: [] });

		expect(events).toContainEqual({
			type: "status",
			sessionId: result.sessionId,
			status: "idle",
			label: "Idle",
			receivedAt: "2026-05-14T12:00:00.000Z",
		});
		await expect(runtime.submit({ sessionId: result.sessionId, prompt: "Second" })).rejects.toThrow(
			"Pi session is already running.",
		);
		await Promise.resolve();
		expect(idleSettled).toBe(false);
		expect(session.prompt).toHaveBeenCalledTimes(1);

		promptResult.resolve();
		await idle;
		expect(idleSettled).toBe(true);
	});

	it("marks completed prompts idle so later submit can run and idle abort is a no-op", async () => {
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
		await runtime.whenIdle(result.sessionId);

		await expect(runtime.submit({ sessionId: result.sessionId, prompt: "Again" })).resolves.toEqual({
			sessionId: result.sessionId,
			status: "running",
		});
		await runtime.whenIdle(result.sessionId);
		await expect(runtime.abort({ sessionId: result.sessionId })).resolves.toEqual({
			sessionId: result.sessionId,
			status: "idle",
		});
		expect(session.abort).not.toHaveBeenCalled();
		expect(session.prompt).toHaveBeenCalledTimes(2);
	});

	it("disposes a created SDK session when extension binding fails", async () => {
		const events: PiSessionEvent[] = [];
		const { session } = createFakeSession();
		vi.mocked(session.bindExtensions).mockRejectedValueOnce(new Error("extension bind failed"));
		const runtime = createPiSessionRuntime({
			now,
			emit: (event) => events.push(event),
			createAgentSession: vi.fn(async () => ({ session })),
		});

		await expect(
			runtime.start({
				projectId: "project:/tmp/pi-desktop",
				workspacePath: "/tmp/pi-desktop",
				prompt: "Hello",
			}),
		).rejects.toThrow("extension bind failed");

		expect(session.dispose).toHaveBeenCalled();
		expect(events).toContainEqual({
			type: "runtime_error",
			code: "pi.session_start_failed",
			message: "extension bind failed",
			receivedAt: "2026-05-14T12:00:00.000Z",
		});
	});

	it("suppresses late prompt failure emissions after disposal", async () => {
		const events: PiSessionEvent[] = [];
		const { promptResult, session } = createControlledSession();
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
		await waitForScheduledPrompt();
		await runtime.dispose({ sessionId: result.sessionId });
		promptResult.reject(new Error("late failure"));
		await expect(runtime.whenIdle(result.sessionId)).rejects.toThrow("Pi session not found.");

		expect(session.abort).toHaveBeenCalled();
		expect(session.dispose).toHaveBeenCalled();
		expect(events).not.toContainEqual({
			type: "runtime_error",
			sessionId: result.sessionId,
			code: "pi.prompt_failed",
			message: "late failure",
			receivedAt: "2026-05-14T12:00:00.000Z",
		});
		expect(events).not.toContainEqual({
			type: "status",
			sessionId: result.sessionId,
			status: "failed",
			label: "Failed",
			receivedAt: "2026-05-14T12:00:00.000Z",
		});
	});

	it("disposes all active sessions when the host window closes", async () => {
		const events: PiSessionEvent[] = [];
		const { promptResult, session } = createControlledSession();
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
		await waitForScheduledPrompt();

		await runtime.disposeAll();

		expect(session.abort).toHaveBeenCalled();
		expect(session.dispose).toHaveBeenCalled();
		await expect(runtime.whenIdle(result.sessionId)).rejects.toThrow("Pi session not found.");
		promptResult.resolve();
	});

	it("emits abort failures and rethrows them", async () => {
		const events: PiSessionEvent[] = [];
		const { promptResult, session } = createControlledSession();
		vi.mocked(session.abort).mockRejectedValueOnce(new Error("abort failed"));
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
		await waitForScheduledPrompt();

		await expect(runtime.abort({ sessionId: result.sessionId })).rejects.toThrow("abort failed");
		expect(events).toContainEqual({
			type: "runtime_error",
			sessionId: result.sessionId,
			code: "pi.abort_failed",
			message: "abort failed",
			receivedAt: "2026-05-14T12:00:00.000Z",
		});
		expect(events).toContainEqual({
			type: "status",
			sessionId: result.sessionId,
			status: "failed",
			label: "Failed",
			receivedAt: "2026-05-14T12:00:00.000Z",
		});

		promptResult.resolve();
		await runtime.whenIdle(result.sessionId);
		expect(events.filter((event) => event.type === "status").map((event) => event.status)).toEqual([
			"running",
			"aborting",
			"failed",
		]);
	});

	it("keeps terminal SDK errors failed after the prompt promise resolves", async () => {
		const events: PiSessionEvent[] = [];
		const { emitSdkEvent, promptResult, session } = createControlledSession();
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
		await waitForScheduledPrompt();

		emitSdkEvent({
			type: "message_end",
			message: {
				role: "assistant",
				content: [],
				api: "openai-responses",
				provider: "openai",
				model: "gpt-5.5",
				stopReason: "error",
				errorMessage: "No API key found for provider",
				timestamp: 2,
			},
		} as unknown as AgentSessionEvent);
		promptResult.resolve();
		await runtime.whenIdle(result.sessionId);

		expect(events).toContainEqual({
			type: "runtime_error",
			sessionId: result.sessionId,
			code: "pi.prompt_failed",
			message: "No API key found for provider",
			receivedAt: "2026-05-14T12:00:00.000Z",
		});
		expect(events.filter((event) => event.type === "status").map((event) => event.status)).toEqual(["running"]);
	});
});
