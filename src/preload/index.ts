import { contextBridge, ipcRenderer } from "electron";
import type { z } from "zod";
import {
	AppVersionResultSchema,
	ClipboardWriteTextResultSchema,
	IpcChannels,
	PiSessionActionResultSchema,
	PiSessionEventSchema,
	PiSessionHistoryResultSchema,
	PiSessionQueueResultSchema,
	PiSessionRuntimeCommandsResultSchema,
	PiSessionSettingsResultSchema,
	PiSessionStartResultSchema,
	ProjectStateViewResultSchema,
	WorkspaceListDirectoryResultSchema,
	WorkspaceReadFileResultSchema,
	WorkspaceWriteFileResultSchema,
	SourceControlCheckIgnoredResultSchema,
	SourceControlGetStatusResultSchema,
	SourceControlMutationResultSchema,
} from "../shared/ipc";
import type { PiDesktopApi } from "../shared/preload-api";
import { createIpcError, type IpcResult } from "../shared/result";

type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Unknown IPC error.");

const safeInvokeParse = async <TResult extends IpcResult<unknown>>(
	channel: IpcChannel,
	schema: z.ZodType<TResult>,
	input?: unknown,
): Promise<TResult> => {
	try {
		return schema.parse(await ipcRenderer.invoke(channel, input));
	} catch (error) {
		return {
			ok: false,
			error: createIpcError("ipc.invoke_failed", `IPC call failed for ${channel}: ${toErrorMessage(error)}`),
		} as TResult;
	}
};

const api: PiDesktopApi = {
	app: {
		getVersion: async () => safeInvokeParse(IpcChannels.appGetVersion, AppVersionResultSchema),
	},
	project: {
		getState: async () => safeInvokeParse(IpcChannels.projectGetState, ProjectStateViewResultSchema),
		createFromScratch: async () =>
			safeInvokeParse(IpcChannels.projectCreateFromScratch, ProjectStateViewResultSchema),
		addExistingFolder: async () =>
			safeInvokeParse(IpcChannels.projectAddExistingFolder, ProjectStateViewResultSchema),
		select: async (input) => safeInvokeParse(IpcChannels.projectSelect, ProjectStateViewResultSchema, input),
		rename: async (input) => safeInvokeParse(IpcChannels.projectRename, ProjectStateViewResultSchema, input),
		remove: async (input) => safeInvokeParse(IpcChannels.projectRemove, ProjectStateViewResultSchema, input),
		openInFinder: async (input) =>
			safeInvokeParse(IpcChannels.projectOpenInFinder, ProjectStateViewResultSchema, input),
		locateFolder: async (input) =>
			safeInvokeParse(IpcChannels.projectLocateFolder, ProjectStateViewResultSchema, input),
		setPinned: async (input) => safeInvokeParse(IpcChannels.projectSetPinned, ProjectStateViewResultSchema, input),
		checkAvailability: async (input) =>
			safeInvokeParse(IpcChannels.projectCheckAvailability, ProjectStateViewResultSchema, input),
	},
	chat: {
		create: async (input) => safeInvokeParse(IpcChannels.chatCreate, ProjectStateViewResultSchema, input),
		createStandalone: async (input) =>
			safeInvokeParse(IpcChannels.chatCreateStandalone, ProjectStateViewResultSchema, input),
		select: async (input) => safeInvokeParse(IpcChannels.chatSelect, ProjectStateViewResultSchema, input),
		rename: async (input) => safeInvokeParse(IpcChannels.chatRename, ProjectStateViewResultSchema, input),
		selectStandalone: async (input) =>
			safeInvokeParse(IpcChannels.chatSelectStandalone, ProjectStateViewResultSchema, input),
		fork: async (input) => safeInvokeParse(IpcChannels.chatFork, ProjectStateViewResultSchema, input),
		clone: async (input) => safeInvokeParse(IpcChannels.chatClone, ProjectStateViewResultSchema, input),
		branch: async (input) => safeInvokeParse(IpcChannels.chatBranch, ProjectStateViewResultSchema, input),
	},
	piSession: {
		start: async (input) => safeInvokeParse(IpcChannels.piSessionStart, PiSessionStartResultSchema, input),
		submit: async (input) => safeInvokeParse(IpcChannels.piSessionSubmit, PiSessionActionResultSchema, input),
		abort: async (input) => safeInvokeParse(IpcChannels.piSessionAbort, PiSessionActionResultSchema, input),
		history: async (input) => safeInvokeParse(IpcChannels.piSessionHistory, PiSessionHistoryResultSchema, input),
		prepare: async (input) => safeInvokeParse(IpcChannels.piSessionPrepare, PiSessionStartResultSchema, input),
		attach: async (input) => safeInvokeParse(IpcChannels.piSessionAttach, PiSessionStartResultSchema, input),
		dispose: async (input) => safeInvokeParse(IpcChannels.piSessionDispose, PiSessionActionResultSchema, input),
		getSettings: async (input) =>
			safeInvokeParse(IpcChannels.piSessionGetSettings, PiSessionSettingsResultSchema, input),
		getDefaultSettings: async (input) =>
			safeInvokeParse(IpcChannels.piSessionGetDefaultSettings, PiSessionSettingsResultSchema, input),
		getCommands: async (input) =>
			safeInvokeParse(IpcChannels.piSessionGetCommands, PiSessionRuntimeCommandsResultSchema, input),
		setModel: async (input) => safeInvokeParse(IpcChannels.piSessionSetModel, PiSessionSettingsResultSchema, input),
		setThinkingLevel: async (input) =>
			safeInvokeParse(IpcChannels.piSessionSetThinkingLevel, PiSessionSettingsResultSchema, input),
		setDefaultModel: async (input) =>
			safeInvokeParse(IpcChannels.piSessionSetDefaultModel, PiSessionSettingsResultSchema, input),
		setDefaultThinkingLevel: async (input) =>
			safeInvokeParse(IpcChannels.piSessionSetDefaultThinkingLevel, PiSessionSettingsResultSchema, input),
		updateQueuedMessage: async (input) =>
			safeInvokeParse(IpcChannels.piSessionUpdateQueuedMessage, PiSessionQueueResultSchema, input),
		removeQueuedMessage: async (input) =>
			safeInvokeParse(IpcChannels.piSessionRemoveQueuedMessage, PiSessionQueueResultSchema, input),
		onEvent: (listener) => {
			const handler = (_event: Electron.IpcRendererEvent, payload: unknown) => {
				const parsed = PiSessionEventSchema.safeParse(payload);
				if (parsed.success) {
					listener(parsed.data);
				}
			};
			ipcRenderer.on(IpcChannels.piSessionEvent, handler);
			return () => ipcRenderer.removeListener(IpcChannels.piSessionEvent, handler);
		},
	},
	workspaceFiles: {
		listDirectory: async (input) =>
			safeInvokeParse(IpcChannels.workspaceFilesListDirectory, WorkspaceListDirectoryResultSchema, input),
		readFile: async (input) =>
			safeInvokeParse(IpcChannels.workspaceFilesReadFile, WorkspaceReadFileResultSchema, input),
		writeFile: async (input) =>
			safeInvokeParse(IpcChannels.workspaceFilesWriteFile, WorkspaceWriteFileResultSchema, input),
	},
	sourceControl: {
		getStatus: async (input) =>
			safeInvokeParse(IpcChannels.sourceControlGetStatus, SourceControlGetStatusResultSchema, input),
		checkIgnored: async (input) =>
			safeInvokeParse(IpcChannels.sourceControlCheckIgnored, SourceControlCheckIgnoredResultSchema, input),
		stage: async (input) => safeInvokeParse(IpcChannels.sourceControlStage, SourceControlMutationResultSchema, input),
		unstage: async (input) =>
			safeInvokeParse(IpcChannels.sourceControlUnstage, SourceControlMutationResultSchema, input),
		discard: async (input) =>
			safeInvokeParse(IpcChannels.sourceControlDiscard, SourceControlMutationResultSchema, input),
		bulkStage: async (input) =>
			safeInvokeParse(IpcChannels.sourceControlBulkStage, SourceControlMutationResultSchema, input),
		bulkUnstage: async (input) =>
			safeInvokeParse(IpcChannels.sourceControlBulkUnstage, SourceControlMutationResultSchema, input),
		bulkDiscard: async (input) =>
			safeInvokeParse(IpcChannels.sourceControlBulkDiscard, SourceControlMutationResultSchema, input),
		initializeRepository: async (input) =>
			safeInvokeParse(IpcChannels.sourceControlInitializeRepository, SourceControlMutationResultSchema, input),
	},
	clipboard: {
		writeText: async (input) =>
			safeInvokeParse(IpcChannels.clipboardWriteText, ClipboardWriteTextResultSchema, input),
	},
};

contextBridge.exposeInMainWorld("piDesktop", api);
