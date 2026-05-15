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
	disposed: boolean;
};

const createDesktopSessionId = (projectId: string, piSessionId: string): string => `${projectId}:${piSessionId}`;

export const createPiSessionRuntime = (deps: RuntimeDeps) => {
	const createAgentSession = deps.createAgentSession ?? createPiAgentSession;
	const sessions = new Map<string, RuntimeEntry>();
	const busyStatuses = new Set<PiSessionStatus>(["running", "retrying", "aborting"]);

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

	const assertNotBusy = (entry: RuntimeEntry) => {
		if (busyStatuses.has(entry.status)) {
			throw new Error("Pi session is already running.");
		}
	};

	const runPrompt = (sessionId: string, prompt: string): Promise<void> => {
		const entry = getEntry(sessionId);
		entry.status = "running";
		emitStatus(sessionId, "running", "Running");

		return entry.session
			.prompt(prompt)
			.then(() => {
				if (!entry.disposed && (entry.status === "running" || entry.status === "retrying")) {
					entry.status = "idle";
				}
			})
			.catch((error) => {
				if (entry.disposed) {
					return;
				}
				entry.status = "failed";
				deps.emit(createRuntimeErrorEvent({ sessionId, code: "pi.prompt_failed", error, now: deps.now }));
				emitStatus(sessionId, "failed", "Failed");
			});
	};

	return {
		async start(input: RuntimeStartInput): Promise<PiSessionStartPayload> {
			let created: CreateAgentSessionResult | undefined;
			try {
				created = await createAgentSession({ cwd: input.workspacePath });
				await created.session.bindExtensions({});
			} catch (error) {
				created?.session.dispose();
				deps.emit(createRuntimeErrorEvent({ code: "pi.session_start_failed", error, now: deps.now }));
				throw error;
			}

			const sessionId = createDesktopSessionId(input.projectId, created.session.sessionId);
			const unsubscribe = created.session.subscribe((event) => {
				for (const normalized of normalizePiSessionEvent({ sessionId, event, now: deps.now })) {
					const entry = sessions.get(sessionId);
					if (!entry || entry.disposed) {
						return;
					}
					if (normalized.type === "status") {
						entry.status = normalized.status;
					}
					deps.emit(normalized);
				}
			});
			const entry: RuntimeEntry = {
				session: created.session,
				status: "running",
				unsubscribe,
				idle: Promise.resolve(),
				disposed: false,
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
			assertNotBusy(entry);
			entry.idle = runPrompt(input.sessionId, input.prompt);
			return { sessionId: input.sessionId, status: "running" };
		},

		async abort(input: PiSessionAbortInput): Promise<PiSessionActionPayload> {
			const entry = getEntry(input.sessionId);
			if (!busyStatuses.has(entry.status)) {
				return { sessionId: input.sessionId, status: entry.status };
			}
			entry.status = "aborting";
			emitStatus(input.sessionId, "aborting", "Aborting");
			try {
				await entry.session.abort();
			} catch (error) {
				entry.status = "failed";
				deps.emit(
					createRuntimeErrorEvent({ sessionId: input.sessionId, code: "pi.abort_failed", error, now: deps.now }),
				);
				emitStatus(input.sessionId, "failed", "Failed");
				throw error;
			}
			entry.status = "idle";
			emitStatus(input.sessionId, "idle", "Idle");
			return { sessionId: input.sessionId, status: "idle" };
		},

		async dispose(input: PiSessionDisposeInput): Promise<PiSessionActionPayload> {
			const entry = getEntry(input.sessionId);
			entry.disposed = true;
			entry.unsubscribe();
			try {
				if (busyStatuses.has(entry.status)) {
					await entry.session.abort();
				}
			} finally {
				entry.session.dispose();
				sessions.delete(input.sessionId);
			}
			return { sessionId: input.sessionId, status: "idle" };
		},

		async whenIdle(sessionId: string): Promise<void> {
			await getEntry(sessionId).idle;
		},
	};
};
