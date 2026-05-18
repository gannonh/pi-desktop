import type { AppRpcRequest } from "../shared/app-transport";
import {
	ChatBranchInputSchema,
	ChatCloneInputSchema,
	ChatCreateInputSchema,
	ChatForkInputSchema,
	ChatRenameInputSchema,
	ChatSelectionInputSchema,
	ChatStandaloneCreateInputSchema,
	ChatStandaloneSelectionInputSchema,
	PiSessionAbortInputSchema,
	PiSessionDisposeInputSchema,
	PiSessionHistoryInputSchema,
	PiSessionOperationFailedCode,
	PiSessionStartInputSchema,
	PiSessionSubmitInputSchema,
	ProjectIdInputSchema,
	ProjectPinnedInputSchema,
	ProjectRenameInputSchema,
	type AppVersion,
} from "../shared/ipc";
import type {
	PiSessionActionPayload,
	PiSessionEvent,
	PiSessionHistoryPayload,
	PiSessionStartPayload,
	PiSessionStatus,
} from "../shared/pi-session";
import type { ProjectStateView } from "../shared/project-state";
import { err, type IpcResult, ok } from "../shared/result";
import { sanitizeRuntimeErrorMessage } from "./pi-session/pi-session-event-normalizer";
import { loadPiSessionHistory, type LoadPiSessionHistoryInput } from "./pi-session/pi-session-history";
import { createPiSessionRuntime } from "./pi-session/pi-session-runtime";
import type { ProjectService } from "./projects/project-service";

type CreateAgentSession = NonNullable<Parameters<typeof createPiSessionRuntime>[0]["createAgentSession"]>;
type CreateSessionManager = NonNullable<Parameters<typeof createPiSessionRuntime>[0]["createSessionManager"]>;
type PiSessionEventListener = (event: PiSessionEvent) => void;

export type AppBackendDeps = {
	appInfo: AppVersion;
	projectService: ProjectService;
	now: () => string;
	env?: NodeJS.ProcessEnv;
	createSessionManager?: CreateSessionManager;
	createAgentSession?: CreateAgentSession;
	loadSessionHistory?: (input: LoadPiSessionHistoryInput) => PiSessionHistoryPayload;
};

export type AppBackendResult = IpcResult<
	AppVersion | ProjectStateView | PiSessionStartPayload | PiSessionActionPayload | PiSessionHistoryPayload
>;

export type AppBackend = {
	handle: (request: AppRpcRequest) => Promise<AppBackendResult>;
	onPiSessionEvent: (listener: (event: PiSessionEvent) => void) => () => void;
	dispose: () => Promise<void>;
};

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const toChatStatus = (status: PiSessionStatus) =>
	status === "failed" ? "failed" : status === "idle" ? "idle" : "running";

const assertNever = (value: never): never => {
	throw new Error(`Unhandled app backend request: ${JSON.stringify(value)}`);
};

export const createAppBackend = (deps: AppBackendDeps): AppBackend => {
	const piSessionListeners = new Set<PiSessionEventListener>();
	const emitPiSessionEvent = (event: PiSessionEvent) => {
		for (const listener of [...piSessionListeners]) {
			try {
				listener(event);
			} catch (error) {
				console.error("Pi session event listener failed.", error);
			}
		}

		if (event.type === "status") {
			void deps.projectService
				.recordSessionStatus({
					sessionId: event.sessionId,
					status: toChatStatus(event.status),
					attention: event.status === "failed",
					updatedAt: event.receivedAt,
				})
				.catch((error) => {
					console.error("Failed to record Pi session status.", error);
				});
		}
		if (event.type === "runtime_error" && event.sessionId) {
			void deps.projectService
				.recordSessionStatus({
					sessionId: event.sessionId,
					status: "failed",
					attention: true,
					updatedAt: event.receivedAt,
				})
				.catch((error) => {
					console.error("Failed to record Pi session status.", error);
				});
		}
	};
	const piSessionRuntime = createPiSessionRuntime({
		now: deps.now,
		emit: emitPiSessionEvent,
		env: deps.env,
		createSessionManager: deps.createSessionManager,
		createAgentSession: deps.createAgentSession,
	});

	const handleProjectOperation = async (operation: () => Promise<ProjectStateView>): Promise<AppBackendResult> => {
		try {
			return ok(await operation());
		} catch (error) {
			return err("project.operation_failed", toErrorMessage(error));
		}
	};

	const handlePiSessionOperation = async (
		operation: () => Promise<PiSessionStartPayload | PiSessionActionPayload | PiSessionHistoryPayload>,
	): Promise<AppBackendResult> => {
		try {
			return ok(await operation());
		} catch (error) {
			return err(PiSessionOperationFailedCode, sanitizeRuntimeErrorMessage(error));
		}
	};

	return {
		handle(request) {
			switch (request.operation) {
				case "app.getVersion":
					return Promise.resolve(ok(deps.appInfo));
				case "project.getState":
					return handleProjectOperation(() => deps.projectService.getState());
				case "project.createFromScratch":
					return handleProjectOperation(() => deps.projectService.createFromScratch());
				case "project.addExistingFolder":
					return handleProjectOperation(() => deps.projectService.addExistingFolder());
				case "project.select":
					return handleProjectOperation(() =>
						deps.projectService.selectProject(ProjectIdInputSchema.parse(request.input)),
					);
				case "project.rename":
					return handleProjectOperation(() =>
						deps.projectService.renameProject(ProjectRenameInputSchema.parse(request.input)),
					);
				case "project.remove":
					return handleProjectOperation(() =>
						deps.projectService.removeProject(ProjectIdInputSchema.parse(request.input)),
					);
				case "project.openInFinder":
					return handleProjectOperation(() =>
						deps.projectService.openProjectInFinder(ProjectIdInputSchema.parse(request.input)),
					);
				case "project.locateFolder":
					return handleProjectOperation(() =>
						deps.projectService.locateFolder(ProjectIdInputSchema.parse(request.input)),
					);
				case "project.setPinned":
					return handleProjectOperation(() =>
						deps.projectService.setPinned(ProjectPinnedInputSchema.parse(request.input)),
					);
				case "project.checkAvailability":
					return handleProjectOperation(() =>
						deps.projectService.checkAvailability(ProjectIdInputSchema.parse(request.input)),
					);
				case "chat.create":
					return handleProjectOperation(() =>
						deps.projectService.createChat(ChatCreateInputSchema.parse(request.input)),
					);
				case "chat.createStandalone":
					return handleProjectOperation(() =>
						deps.projectService.createStandaloneChat(ChatStandaloneCreateInputSchema.parse(request.input)),
					);
				case "chat.select":
					return handleProjectOperation(() =>
						deps.projectService.selectChat(ChatSelectionInputSchema.parse(request.input)),
					);
				case "chat.selectStandalone":
					return handleProjectOperation(() =>
						deps.projectService.selectStandaloneChat(ChatStandaloneSelectionInputSchema.parse(request.input)),
					);
				case "chat.rename":
					return handleProjectOperation(() =>
						deps.projectService.renameChat(ChatRenameInputSchema.parse(request.input)),
					);
				case "chat.fork":
					return handleProjectOperation(() =>
						deps.projectService.forkChat(ChatForkInputSchema.parse(request.input)),
					);
				case "chat.clone":
					return handleProjectOperation(() =>
						deps.projectService.cloneChat(ChatCloneInputSchema.parse(request.input)),
					);
				case "chat.branch":
					return handleProjectOperation(() =>
						deps.projectService.branchChat(ChatBranchInputSchema.parse(request.input)),
					);
				case "piSession.start":
					return handlePiSessionOperation(async () => {
						const parsed = PiSessionStartInputSchema.parse(request.input);
						const target = await deps.projectService.getSessionStartTarget({
							projectId: parsed.projectId,
							chatId: parsed.chatId ?? null,
						});
						const started = await piSessionRuntime.start({
							projectId: target.projectId,
							chatId: target.chatId,
							workspacePath: target.workspacePath,
							sessionPath: target.sessionPath,
							prompt: parsed.prompt,
						});
						try {
							const recorded = await deps.projectService.recordSessionStarted({
								projectId: started.projectId,
								chatId: started.chatId,
								sessionId: started.sessionId,
								sessionPath: started.sessionPath,
								status: toChatStatus(started.status),
							});
							return { ...started, chatId: recorded.chatId };
						} catch (error) {
							await piSessionRuntime.dispose({ sessionId: started.sessionId }).catch((disposeError) => {
								console.error("Failed to dispose Pi session after metadata recording failed.", disposeError);
							});
							throw error;
						}
					});
				case "piSession.submit":
					return handlePiSessionOperation(() =>
						piSessionRuntime.submit(PiSessionSubmitInputSchema.parse(request.input)),
					);
				case "piSession.abort":
					return handlePiSessionOperation(() =>
						piSessionRuntime.abort(PiSessionAbortInputSchema.parse(request.input)),
					);
				case "piSession.history":
					return handlePiSessionOperation(async () => {
						const parsed = PiSessionHistoryInputSchema.parse(request.input);
						const target = await deps.projectService.getSessionStartTarget({
							projectId: parsed.projectId,
							chatId: parsed.chatId,
						});
						if (!target.sessionPath) {
							throw new Error("Chat does not have a Pi session file yet.");
						}
						return (deps.loadSessionHistory ?? loadPiSessionHistory)({
							projectId: target.projectId,
							workspacePath: target.workspacePath,
							sessionPath: target.sessionPath,
							env: deps.env,
						});
					});
				case "piSession.dispose":
					return handlePiSessionOperation(async () => {
						const disposed = await piSessionRuntime.dispose(PiSessionDisposeInputSchema.parse(request.input));
						await deps.projectService.recordSessionStatus({
							sessionId: disposed.sessionId,
							status: toChatStatus(disposed.status),
							attention: disposed.status === "failed",
							updatedAt: deps.now(),
						});
						return disposed;
					});
				default:
					return assertNever(request);
			}
		},
		onPiSessionEvent(listener) {
			piSessionListeners.add(listener);
			return () => {
				piSessionListeners.delete(listener);
			};
		},
		dispose() {
			return piSessionRuntime.disposeAll();
		},
	};
};
