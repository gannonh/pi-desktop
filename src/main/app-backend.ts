import type { AppRpcRequest } from "../shared/app-transport";
import {
	ChatCreateInputSchema,
	ChatSelectionInputSchema,
	PiSessionAbortInputSchema,
	PiSessionDisposeInputSchema,
	PiSessionOperationFailedCode,
	PiSessionStartInputSchema,
	PiSessionSubmitInputSchema,
	ProjectIdInputSchema,
	ProjectPinnedInputSchema,
	ProjectRenameInputSchema,
	type AppVersion,
} from "../shared/ipc";
import type { PiSessionActionPayload, PiSessionEvent, PiSessionStartPayload } from "../shared/pi-session";
import type { ProjectStateView } from "../shared/project-state";
import { err, type IpcResult, ok } from "../shared/result";
import { sanitizeRuntimeErrorMessage } from "./pi-session/pi-session-event-normalizer";
import { createPiSessionRuntime } from "./pi-session/pi-session-runtime";
import type { ProjectService } from "./projects/project-service";

type CreateAgentSession = NonNullable<Parameters<typeof createPiSessionRuntime>[0]["createAgentSession"]>;
type PiSessionEventListener = (event: PiSessionEvent) => void;

export type AppBackendDeps = {
	appInfo: AppVersion;
	projectService: ProjectService;
	now: () => string;
	createAgentSession?: CreateAgentSession;
};

export type AppBackendResult = IpcResult<
	AppVersion | ProjectStateView | PiSessionStartPayload | PiSessionActionPayload
>;

export type AppBackend = {
	handle: (request: AppRpcRequest) => Promise<AppBackendResult>;
	onPiSessionEvent: (listener: (event: PiSessionEvent) => void) => () => void;
	dispose: () => Promise<void>;
};

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

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
	};
	const piSessionRuntime = createPiSessionRuntime({
		now: deps.now,
		emit: emitPiSessionEvent,
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
		operation: () => Promise<PiSessionStartPayload | PiSessionActionPayload>,
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
				case "chat.select":
					return handleProjectOperation(() =>
						deps.projectService.selectChat(ChatSelectionInputSchema.parse(request.input)),
					);
				case "piSession.start":
					return handlePiSessionOperation(async () => {
						const parsed = PiSessionStartInputSchema.parse(request.input);
						const workspace = await deps.projectService.getSessionWorkspace({ projectId: parsed.projectId });
						return piSessionRuntime.start({
							projectId: workspace.projectId,
							workspacePath: workspace.path,
							prompt: parsed.prompt,
						});
					});
				case "piSession.submit":
					return handlePiSessionOperation(() =>
						piSessionRuntime.submit(PiSessionSubmitInputSchema.parse(request.input)),
					);
				case "piSession.abort":
					return handlePiSessionOperation(() =>
						piSessionRuntime.abort(PiSessionAbortInputSchema.parse(request.input)),
					);
				case "piSession.dispose":
					return handlePiSessionOperation(() =>
						piSessionRuntime.dispose(PiSessionDisposeInputSchema.parse(request.input)),
					);
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
