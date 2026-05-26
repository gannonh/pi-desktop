import {
	createAgentSessionFromServices,
	createAgentSessionServices,
	SessionManager,
	type AgentSession,
	type AgentSessionEvent,
	type SessionManager as PiSessionManager,
} from "@earendil-works/pi-coding-agent";
import type {
	PiSessionAbortInput,
	PiSessionActionPayload,
	PiSessionDelivery,
	PiSessionDisposeInput,
	PiSessionEvent,
	PiSessionGetSettingsInput,
	PiSessionImageContent,
	PiSessionRemoveQueuedMessageInput,
	PiSessionSetDefaultModelInput,
	PiSessionSetDefaultThinkingLevelInput,
	PiSessionSetModelInput,
	PiSessionSetThinkingLevelInput,
	PiSessionStartPayload,
	PiSessionStatus,
	PiSessionSubmitInput,
	PiSessionUpdateQueuedMessageInput,
} from "../../shared/pi-session";
import { resolvePiAgentDir, resolvePiSessionFilesDirForCwd } from "../app-paths";
import { createRuntimeErrorEvent, normalizePiSessionEvent } from "./pi-session-event-normalizer";
import {
	buildDefaultSettings,
	buildQueuedMessages,
	buildSettingsFromAgentSession,
	setDefaultModel,
	setDefaultThinkingLevel,
} from "./pi-session-settings";

export type PiSdkSession = {
	sessionId: string;
	subscribe: (listener: (event: AgentSessionEvent) => void) => () => void;
	bindExtensions: (bindings: Record<string, never>) => Promise<void>;
	prompt: (
		prompt: string,
		options?: { streamingBehavior?: "steer" | "followUp"; images?: PiSessionImageContent[] },
	) => Promise<void>;
	abort: () => Promise<void>;
	dispose: () => void;
	isStreaming?: () => boolean;
	getSteeringMessages?: () => readonly string[];
	getFollowUpMessages?: () => readonly string[];
	clearQueue?: () => { steering: string[]; followUp: string[] };
	setModel?: (provider: string, modelId: string) => Promise<void>;
	setThinkingLevel?: (level: string) => void;
	modelRegistry?: AgentSession["modelRegistry"];
	model?: AgentSession["model"];
	thinkingLevel?: AgentSession["thinkingLevel"];
};

type CreateAgentSessionResult = {
	session: PiSdkSession;
	agentSession?: AgentSession;
};

type RuntimeStartInput = {
	projectId: string | null;
	chatId: string | null;
	workspacePath: string;
	sessionPath?: string | null;
	prompt: string;
	images?: PiSessionImageContent[];
	modelProvider?: string;
	modelId?: string;
	thinkingLevel?: string;
};

const toPromptImages = (images: PiSessionImageContent[] | undefined) =>
	images && images.length > 0 ? images : undefined;

type RuntimeSessionManager = Pick<PiSessionManager, "getSessionFile" | "getSessionId">;

type RuntimeDeps = {
	now: () => string;
	emit: (event: PiSessionEvent) => void;
	env?: NodeJS.ProcessEnv;
	createSessionManager?: (options: {
		cwd: string;
		sessionPath?: string | null;
		env?: NodeJS.ProcessEnv;
	}) => RuntimeSessionManager;
	createAgentSession?: (options: {
		cwd: string;
		sessionManager: RuntimeSessionManager;
		modelProvider?: string;
		modelId?: string;
		thinkingLevel?: string;
	}) => Promise<CreateAgentSessionResult>;
};

type RuntimeEntry = {
	session: PiSdkSession;
	agentSession: AgentSession | null;
	workspacePath: string;
	status: PiSessionStatus;
	unsubscribe: () => void;
	idle: Promise<void>;
	activePromptToken: symbol | null;
	abortedPromptToken: symbol | null;
	scheduledPrompt: { timeout: ReturnType<typeof setTimeout>; resolve: () => void } | null;
	suppressQueueUpdates: boolean;
	disposed: boolean;
};

export const createDesktopSessionId = (projectId: string | null, piSessionId: string): string =>
	`${projectId ?? "standalone"}:${piSessionId}`;

export const createPiSessionRuntime = (deps: RuntimeDeps) => {
	const createSessionManager =
		deps.createSessionManager ??
		((options: { cwd: string; sessionPath?: string | null; env?: NodeJS.ProcessEnv }) => {
			const sessionDir = resolvePiSessionFilesDirForCwd({ cwd: options.cwd, env: deps.env });
			return options.sessionPath
				? SessionManager.open(options.sessionPath, sessionDir, options.cwd)
				: SessionManager.create(options.cwd, sessionDir);
		});
	const createAgentSession =
		deps.createAgentSession ??
		(async (options: {
			cwd: string;
			sessionManager: RuntimeSessionManager;
			modelProvider?: string;
			modelId?: string;
			thinkingLevel?: string;
		}) => {
			const agentDir = resolvePiAgentDir(deps.env);
			const services = await createAgentSessionServices({ cwd: options.cwd, agentDir });
			const model =
				options.modelProvider && options.modelId
					? services.modelRegistry.find(options.modelProvider, options.modelId)
					: undefined;
			const created = await createAgentSessionFromServices({
				services,
				sessionManager: options.sessionManager as PiSessionManager,
				model: model ?? undefined,
				thinkingLevel: options.thinkingLevel as AgentSession["thinkingLevel"] | undefined,
			});
			return {
				session: created.session as unknown as PiSdkSession,
				agentSession: created.session,
			};
		});
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

	const isActivelyPrompting = (entry: RuntimeEntry) => entry.activePromptToken !== null;

	const shouldQueueDelivery = (entry: RuntimeEntry) => isActivelyPrompting(entry) || busyStatuses.has(entry.status);

	const emitSessionSettings = async (sessionId: string, entry: RuntimeEntry) => {
		if (!entry.agentSession) {
			return;
		}
		deps.emit({
			type: "session_settings",
			sessionId,
			settings: await buildSettingsFromAgentSession(entry.agentSession),
			receivedAt: deps.now(),
		});
	};

	const emitQueueUpdate = (sessionId: string, entry: RuntimeEntry) => {
		const steering = entry.session.getSteeringMessages?.() ?? [];
		const followUp = entry.session.getFollowUpMessages?.() ?? [];
		deps.emit({
			type: "queue_update",
			sessionId,
			messages: buildQueuedMessages(steering, followUp),
			receivedAt: deps.now(),
		});
	};

	const clearScheduledPrompt = (entry: RuntimeEntry): boolean => {
		if (!entry.scheduledPrompt) {
			return false;
		}
		clearTimeout(entry.scheduledPrompt.timeout);
		entry.scheduledPrompt.resolve();
		entry.scheduledPrompt = null;
		return true;
	};

	const disposeEntry = async (sessionId: string, entry: RuntimeEntry): Promise<PiSessionActionPayload> => {
		entry.disposed = true;
		clearScheduledPrompt(entry);
		entry.unsubscribe();
		try {
			if (entry.activePromptToken) {
				await entry.session.abort();
			}
		} finally {
			entry.session.dispose();
			sessions.delete(sessionId);
		}
		return { sessionId, status: "idle" };
	};

	const runPrompt = (
		sessionId: string,
		prompt: string,
		delivery: PiSessionDelivery = "prompt",
		images?: PiSessionImageContent[],
	): Promise<void> => {
		const entry = getEntry(sessionId);
		const streamingBehavior = delivery === "followUp" ? "followUp" : delivery === "steer" ? "steer" : undefined;
		const imageContent = toPromptImages(images);
		if (isActivelyPrompting(entry) && !streamingBehavior) {
			throw new Error("Pi session is already running.");
		}

		if (shouldQueueDelivery(entry) && streamingBehavior) {
			emitQueueUpdate(sessionId, entry);
			return entry.session
				.prompt(prompt, { streamingBehavior, images: imageContent })
				.then(() => {
					const currentEntry = sessions.get(sessionId);
					if (currentEntry === entry && !entry.disposed) {
						emitQueueUpdate(sessionId, entry);
					}
				})
				.catch((error) => {
					const currentEntry = sessions.get(sessionId);
					if (currentEntry !== entry || entry.disposed) {
						return;
					}
					entry.status = "failed";
					deps.emit(createRuntimeErrorEvent({ sessionId, code: "pi.prompt_failed", error, now: deps.now }));
					emitStatus(sessionId, "failed", "Failed");
					throw error;
				});
		}

		const promptToken = Symbol("pi-session-prompt");
		entry.activePromptToken = promptToken;
		entry.status = "running";
		emitStatus(sessionId, "running", "Running");

		const idle = entry.session
			.prompt(prompt, { images: imageContent })
			.then(() => {
				const currentEntry = sessions.get(sessionId);
				if (currentEntry === entry && !entry.disposed && entry.activePromptToken === promptToken) {
					if (entry.status === "failed" || entry.status === "aborting") {
						return;
					}
					const shouldEmitIdle = entry.status !== "idle";
					entry.status = "idle";
					if (shouldEmitIdle) {
						emitStatus(sessionId, "idle", "Idle");
					}
				}
			})
			.catch((error) => {
				const currentEntry = sessions.get(sessionId);
				if (currentEntry !== entry || entry.disposed || entry.activePromptToken !== promptToken) {
					return;
				}
				if (entry.status === "aborting" || entry.abortedPromptToken === promptToken) {
					return;
				}
				entry.status = "failed";
				deps.emit(createRuntimeErrorEvent({ sessionId, code: "pi.prompt_failed", error, now: deps.now }));
				emitStatus(sessionId, "failed", "Failed");
			})
			.finally(() => {
				const currentEntry = sessions.get(sessionId);
				if (currentEntry === entry && entry.activePromptToken === promptToken) {
					entry.activePromptToken = null;
				}
			});
		entry.idle = idle;
		return idle;
	};

	const schedulePrompt = (sessionId: string, prompt: string, images?: PiSessionImageContent[]) => {
		const entry = getEntry(sessionId);
		entry.status = "running";
		entry.idle = new Promise<void>((resolve) => {
			const timeout = setTimeout(() => {
				const currentEntry = sessions.get(sessionId);
				if (currentEntry !== entry || entry.disposed) {
					resolve();
					return;
				}
				entry.scheduledPrompt = null;
				void runPrompt(sessionId, prompt, "prompt", images).then(resolve, resolve);
			}, 0);
			entry.scheduledPrompt = { timeout, resolve };
		});
	};

	type QueueManagedSession = PiSdkSession & { clearQueue: NonNullable<PiSdkSession["clearQueue"]> };

	const getQueueManagedSession = (entry: RuntimeEntry): QueueManagedSession => {
		if (typeof entry.session.clearQueue !== "function") {
			throw new Error("Queue management is unavailable for this session.");
		}
		return entry.session as QueueManagedSession;
	};

	const rebuildQueue = async (entry: RuntimeEntry, steering: string[], followUp: string[]) => {
		const queueSession = getQueueManagedSession(entry);
		entry.suppressQueueUpdates = true;
		try {
			queueSession.clearQueue();
			for (const text of steering) {
				await queueSession.prompt(text, { streamingBehavior: "steer" });
			}
			for (const text of followUp) {
				await queueSession.prompt(text, { streamingBehavior: "followUp" });
			}
		} finally {
			entry.suppressQueueUpdates = false;
		}
	};

	const readQueues = (entry: RuntimeEntry) => ({
		steering: [...(entry.session.getSteeringMessages?.() ?? [])],
		followUp: [...(entry.session.getFollowUpMessages?.() ?? [])],
	});

	const clearQueues = (entry: RuntimeEntry) => {
		try {
			entry.session.clearQueue?.();
		} catch (error) {
			console.error("Failed to clear Pi session queues.", error);
		}
	};

	return {
		async start(input: RuntimeStartInput): Promise<PiSessionStartPayload> {
			let created: CreateAgentSessionResult | undefined;
			let sessionManager: RuntimeSessionManager | undefined;
			try {
				sessionManager = createSessionManager({
					cwd: input.workspacePath,
					sessionPath: input.sessionPath ?? undefined,
					env: deps.env,
				});
				created = await createAgentSession({
					cwd: input.workspacePath,
					sessionManager,
					modelProvider: input.modelProvider,
					modelId: input.modelId,
					thinkingLevel: input.thinkingLevel,
				});
				await created.session.bindExtensions({});
			} catch (error) {
				created?.session.dispose();
				deps.emit(createRuntimeErrorEvent({ code: "pi.session_start_failed", error, now: deps.now }));
				throw error;
			}

			const sessionId = createDesktopSessionId(input.projectId, created.session.sessionId);
			const unsubscribe = created.session.subscribe((event) => {
				if (event.type === "queue_update") {
					const entry = sessions.get(sessionId);
					if (!entry || entry.disposed || entry.suppressQueueUpdates) {
						return;
					}
					emitQueueUpdate(sessionId, entry);
					return;
				}
				if (event.type === "thinking_level_changed") {
					const entry = sessions.get(sessionId);
					if (!entry || entry.disposed) {
						return;
					}
					void emitSessionSettings(sessionId, entry);
					return;
				}

				for (const normalized of normalizePiSessionEvent({ sessionId, event, now: deps.now })) {
					const entry = sessions.get(sessionId);
					if (!entry || entry.disposed) {
						return;
					}
					if (normalized.type === "status") {
						entry.status = normalized.status;
					} else if (normalized.type === "runtime_error") {
						entry.status = "failed";
					}
					deps.emit(normalized);
				}
			});
			const entry: RuntimeEntry = {
				session: created.session,
				agentSession: created.agentSession ?? null,
				workspacePath: input.workspacePath,
				status: "running",
				unsubscribe,
				idle: Promise.resolve(),
				activePromptToken: null,
				abortedPromptToken: null,
				scheduledPrompt: null,
				suppressQueueUpdates: false,
				disposed: false,
			};
			sessions.set(sessionId, entry);
			schedulePrompt(sessionId, input.prompt, input.images);
			await emitSessionSettings(sessionId, entry);
			emitQueueUpdate(sessionId, entry);

			return {
				sessionId,
				projectId: input.projectId,
				chatId: input.chatId,
				workspacePath: input.workspacePath,
				sessionPath: sessionManager.getSessionFile() ?? input.sessionPath ?? null,
				status: "running",
				resumed: Boolean(input.sessionPath),
			};
		},

		async submit(input: PiSessionSubmitInput): Promise<PiSessionActionPayload> {
			const entry = getEntry(input.sessionId);
			const shouldQueue = shouldQueueDelivery(entry);
			const delivery = input.delivery ?? (shouldQueue ? "steer" : "prompt");
			const promptRun = runPrompt(input.sessionId, input.prompt, delivery, input.images);
			if (shouldQueue && delivery !== "prompt") {
				await promptRun;
			}
			return { sessionId: input.sessionId, status: "running" };
		},

		async abort(input: PiSessionAbortInput): Promise<PiSessionActionPayload> {
			const entry = getEntry(input.sessionId);
			if (!shouldQueueDelivery(entry)) {
				return { sessionId: input.sessionId, status: entry.status };
			}
			clearScheduledPrompt(entry);
			entry.status = "aborting";
			emitStatus(input.sessionId, "aborting", "Aborting");
			if (entry.activePromptToken) {
				const abortedPromptToken = entry.activePromptToken;
				try {
					await entry.session.abort();
				} catch (error) {
					entry.status = "failed";
					deps.emit(
						createRuntimeErrorEvent({
							sessionId: input.sessionId,
							code: "pi.abort_failed",
							error,
							now: deps.now,
						}),
					);
					emitStatus(input.sessionId, "failed", "Failed");
					throw error;
				}
				entry.abortedPromptToken = abortedPromptToken;
				entry.activePromptToken = null;
			}
			clearQueues(entry);
			entry.status = "idle";
			emitStatus(input.sessionId, "idle", "Idle");
			emitQueueUpdate(input.sessionId, entry);
			return { sessionId: input.sessionId, status: "idle" };
		},

		async dispose(input: PiSessionDisposeInput): Promise<PiSessionActionPayload> {
			const entry = getEntry(input.sessionId);
			return disposeEntry(input.sessionId, entry);
		},

		async getSettings(input: PiSessionGetSettingsInput) {
			const entry = getEntry(input.sessionId);
			if (!entry.agentSession) {
				return buildDefaultSettings({ workspacePath: entry.workspacePath, env: deps.env });
			}
			return buildSettingsFromAgentSession(entry.agentSession);
		},

		async getDefaultSettings(workspacePath?: string) {
			return buildDefaultSettings({ workspacePath, env: deps.env });
		},

		async setModel(input: PiSessionSetModelInput) {
			const entry = getEntry(input.sessionId);
			if (!entry.agentSession) {
				throw new Error("Model selection is unavailable for this session.");
			}
			const model = entry.agentSession.modelRegistry.find(input.provider, input.modelId);
			if (!model) {
				throw new Error(`Model not found: ${input.provider}/${input.modelId}`);
			}
			await entry.agentSession.setModel(model);
			await emitSessionSettings(input.sessionId, entry);
			return buildSettingsFromAgentSession(entry.agentSession);
		},

		async setThinkingLevel(input: PiSessionSetThinkingLevelInput) {
			const entry = getEntry(input.sessionId);
			if (!entry.agentSession) {
				throw new Error("Thinking level selection is unavailable for this session.");
			}
			entry.agentSession.setThinkingLevel(input.level);
			await emitSessionSettings(input.sessionId, entry);
			return buildSettingsFromAgentSession(entry.agentSession);
		},

		setDefaultModel(input: PiSessionSetDefaultModelInput) {
			return setDefaultModel({ ...input, env: deps.env });
		},

		setDefaultThinkingLevel(input: PiSessionSetDefaultThinkingLevelInput) {
			return setDefaultThinkingLevel({ ...input, env: deps.env });
		},

		async updateQueuedMessage(input: PiSessionUpdateQueuedMessageInput) {
			const entry = getEntry(input.sessionId);
			const { steering, followUp } = readQueues(entry);
			const source =
				input.messageId.queue === "steer"
					? { list: steering, other: followUp }
					: { list: followUp, other: steering };
			if (input.messageId.index < 0 || input.messageId.index >= source.list.length) {
				throw new Error("Queued message not found.");
			}
			const text = source.list[input.messageId.index];
			source.list.splice(input.messageId.index, 1);
			if (input.delivery === "steer") {
				steering.push(text);
			} else {
				followUp.push(text);
			}
			await rebuildQueue(entry, steering, followUp);
			emitQueueUpdate(input.sessionId, entry);
			return {
				sessionId: input.sessionId,
				messages: buildQueuedMessages(steering, followUp),
			};
		},

		async removeQueuedMessage(input: PiSessionRemoveQueuedMessageInput) {
			const entry = getEntry(input.sessionId);
			const { steering, followUp } = readQueues(entry);
			const list = input.messageId.queue === "steer" ? steering : followUp;
			if (input.messageId.index < 0 || input.messageId.index >= list.length) {
				throw new Error("Queued message not found.");
			}
			list.splice(input.messageId.index, 1);
			await rebuildQueue(entry, steering, followUp);
			emitQueueUpdate(input.sessionId, entry);
			return {
				sessionId: input.sessionId,
				messages: buildQueuedMessages(steering, followUp),
			};
		},

		async disposeAll(): Promise<void> {
			await Promise.all([...sessions.entries()].map(([sessionId, entry]) => disposeEntry(sessionId, entry)));
		},

		async whenIdle(sessionId: string): Promise<void> {
			await getEntry(sessionId).idle;
		},
	};
};
