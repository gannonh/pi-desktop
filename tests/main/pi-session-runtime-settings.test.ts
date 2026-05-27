import type { AgentSession } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import { createPiSessionRuntime, type PiSdkSession } from "../../src/main/pi-session/pi-session-runtime";
import type { PiSessionEvent } from "../../src/shared/pi-session";

const now = (): string => "2026-05-14T12:00:00.000Z";

const settingsModel = {
	provider: "openai",
	id: "gpt-5.5",
	name: "5.5 High",
} as NonNullable<AgentSession["model"]>;

type SettingsAgentSession = Pick<
	AgentSession,
	"model" | "thinkingLevel" | "getAvailableThinkingLevels" | "setModel" | "setThinkingLevel"
> & {
	modelRegistry: Pick<AgentSession["modelRegistry"], "find" | "getAvailable">;
};

type SettingsAgentSessionOverrides = Partial<Omit<SettingsAgentSession, "modelRegistry">> & {
	modelRegistry?: Partial<SettingsAgentSession["modelRegistry"]>;
};

type StartedSettingsRuntime = {
	events: PiSessionEvent[];
	runtime: ReturnType<typeof createPiSessionRuntime>;
	sessionId: string;
};

type RuntimeFailureExpectation = {
	events: PiSessionEvent[];
	sessionId: string;
	code: string;
	message: string;
};

function createSettledSession(): PiSdkSession {
	return {
		sessionId: "sdk-session:one",
		subscribe: vi.fn(() => () => undefined),
		bindExtensions: vi.fn(async () => undefined),
		prompt: vi.fn(async () => undefined),
		abort: vi.fn(async () => undefined),
		dispose: vi.fn(() => undefined),
		getSteeringMessages: vi.fn(() => []),
		getFollowUpMessages: vi.fn(() => []),
		clearQueue: vi.fn(() => ({ steering: [], followUp: [] })),
	};
}

function createSettingsAgentSession(overrides: SettingsAgentSessionOverrides = {}): AgentSession {
	const modelRegistry: SettingsAgentSession["modelRegistry"] = {
		find: overrides.modelRegistry?.find ?? vi.fn(() => settingsModel),
		getAvailable: overrides.modelRegistry?.getAvailable ?? vi.fn(() => [settingsModel]),
	};
	const agentSession: SettingsAgentSession = {
		model: settingsModel,
		thinkingLevel: "off" as AgentSession["thinkingLevel"],
		getAvailableThinkingLevels: vi.fn(() => ["off", "high"] as AgentSession["thinkingLevel"][]),
		setModel: vi.fn(async () => undefined),
		setThinkingLevel: vi.fn(() => undefined),
		...overrides,
		modelRegistry,
	};

	return agentSession as AgentSession;
}

async function startSettingsRuntime(agentSession: AgentSession): Promise<StartedSettingsRuntime> {
	const events: PiSessionEvent[] = [];
	const session = createSettledSession();
	const runtime = createPiSessionRuntime({
		now,
		emit: (event) => events.push(event),
		createAgentSession: vi.fn(async () => ({ session, agentSession })),
	});

	const started = await runtime.start({
		projectId: "project:/tmp/pi-desktop",
		chatId: "chat:one",
		workspacePath: "/tmp/pi-desktop",
		prompt: "Hello",
	});
	await runtime.whenIdle(started.sessionId);
	events.length = 0;

	return { events, runtime, sessionId: started.sessionId };
}

function expectSessionFailure({ events, sessionId, code, message }: RuntimeFailureExpectation): void {
	expect(events).toContainEqual({
		type: "runtime_error",
		sessionId,
		code,
		message,
		receivedAt: "2026-05-14T12:00:00.000Z",
	});
	expect(events).toContainEqual({
		type: "status",
		sessionId,
		status: "failed",
		label: "Failed",
		receivedAt: "2026-05-14T12:00:00.000Z",
	});
}

describe("createPiSessionRuntime settings selection", () => {
	it("emits a session-scoped failure when active model selection is invalid", async () => {
		const agentSession = createSettingsAgentSession({
			modelRegistry: {
				find: vi.fn(() => undefined),
			},
		});
		const { events, runtime, sessionId } = await startSettingsRuntime(agentSession);

		await expect(runtime.setModel({ sessionId, provider: "openai", modelId: "missing" })).rejects.toThrow(
			"Model not found: openai/missing",
		);

		expectSessionFailure({
			events,
			sessionId,
			code: "pi.model_selection_failed",
			message: "Model not found: openai/missing",
		});
	});

	it("emits a session-scoped failure when active thinking selection fails", async () => {
		const error = new Error("Thinking level is unavailable for this model");
		const agentSession = createSettingsAgentSession({
			getAvailableThinkingLevels: vi.fn(() => ["off", "high", "xhigh"] as AgentSession["thinkingLevel"][]),
			setThinkingLevel: vi.fn(() => {
				throw error;
			}),
		});
		const { events, runtime, sessionId } = await startSettingsRuntime(agentSession);

		await expect(runtime.setThinkingLevel({ sessionId, level: "xhigh" })).rejects.toThrow(error.message);

		expectSessionFailure({
			events,
			sessionId,
			code: "pi.thinking_level_selection_failed",
			message: error.message,
		});
	});
});
