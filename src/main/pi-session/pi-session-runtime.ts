import { createAgentSession as createPiAgentSession } from "@earendil-works/pi-coding-agent";
import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import type {
	PiSessionAbortInput,
	PiSessionActionPayload,
	PiSessionDisposeInput,
	PiSessionEvent,
	PiSessionStartPayload,
	PiSessionStatus,
	PiSessionSubmitInput,
} from "../../shared/pi-session";
import { createRuntimeErrorEvent, normalizePiSessionEvent } from "./pi-session-event-normalizer";

export type PiSdkSession = {
	sessionId: string;
	subscribe: (listener: (event: AgentSessionEvent) => void) => () => void;
	bindExtensions: (bindings: Record<string, never>) => Promise<void>;
	prompt: (prompt: string) => Promise<void>;
	abort: () => Promise<void>;
	dispose: () => void;
};

type CreateAgentSessionResult = {
	session: PiSdkSession;
};

type RuntimeStartInput = {
	projectId: string;
	workspacePath: string;
	prompt: string;
};

type RuntimeDeps = {
	now: () => string;
	emit: (event: PiSessionEvent) => void;
	createAgentSession?: (options: { cwd: string }) => Promise<CreateAgentSessionResult>;
};

type RuntimeEntry = {
	session: PiSdkSession;
	status: PiSessionStatus;
	unsubscribe: () => void;
	idle: Promise<void>;
};

const createDesktopSessionId = (projectId: string, piSessionId: string): string => `${projectId}:${piSessionId}`;

export const createPiSessionRuntime = (deps: RuntimeDeps) => {
	const createAgentSession = deps.createAgentSession ?? createPiAgentSession;
	const sessions = new Map<string, RuntimeEntry>();

	const emitStatus = (sessionId: string, status: PiSessionStatus, label: string) => {
		deps.emit({ type: "status", sessionId, status, label, receivedAt: deps.now() });
	};

	const getEntry = (sessionId: string): RuntimeEntry => {
		const entry = sessions.get(sessionId);
		if (!entry) {
			throw new Error("Pi session not found.");
		}
		return entry;
	};

	const runPrompt = (sessionId: string, prompt: string): Promise<void> => {
		const entry = getEntry(sessionId);
		entry.status = "running";
		emitStatus(sessionId, "running", "Running");

		return entry.session.prompt(prompt).catch((error) => {
			entry.status = "failed";
			deps.emit(createRuntimeErrorEvent({ sessionId, code: "pi.prompt_failed", error, now: deps.now }));
			emitStatus(sessionId, "failed", "Failed");
		});
	};

	return {
		async start(input: RuntimeStartInput): Promise<PiSessionStartPayload> {
			let created: CreateAgentSessionResult;
			try {
				created = await createAgentSession({ cwd: input.workspacePath });
				await created.session.bindExtensions({});
			} catch (error) {
				deps.emit(createRuntimeErrorEvent({ code: "pi.session_start_failed", error, now: deps.now }));
				throw error;
			}

			const sessionId = createDesktopSessionId(input.projectId, created.session.sessionId);
			const unsubscribe = created.session.subscribe((event) => {
				for (const normalized of normalizePiSessionEvent({ sessionId, event, now: deps.now })) {
					deps.emit(normalized);
				}
			});
			const entry: RuntimeEntry = {
				session: created.session,
				status: "running",
				unsubscribe,
				idle: Promise.resolve(),
			};
			sessions.set(sessionId, entry);
			entry.idle = runPrompt(sessionId, input.prompt);

			return {
				sessionId,
				projectId: input.projectId,
				workspacePath: input.workspacePath,
				status: "running",
			};
		},

		async submit(input: PiSessionSubmitInput): Promise<PiSessionActionPayload> {
			const entry = getEntry(input.sessionId);
			entry.idle = runPrompt(input.sessionId, input.prompt);
			return { sessionId: input.sessionId, status: entry.status };
		},

		async abort(input: PiSessionAbortInput): Promise<PiSessionActionPayload> {
			const entry = getEntry(input.sessionId);
			entry.status = "aborting";
			emitStatus(input.sessionId, "aborting", "Aborting");
			await entry.session.abort();
			entry.status = "idle";
			emitStatus(input.sessionId, "idle", "Idle");
			return { sessionId: input.sessionId, status: "idle" };
		},

		async dispose(input: PiSessionDisposeInput): Promise<PiSessionActionPayload> {
			const entry = getEntry(input.sessionId);
			entry.unsubscribe();
			entry.session.dispose();
			sessions.delete(input.sessionId);
			return { sessionId: input.sessionId, status: "idle" };
		},

		async whenIdle(sessionId: string): Promise<void> {
			await getEntry(sessionId).idle;
		},
	};
};
