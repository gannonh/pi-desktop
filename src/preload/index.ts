import { contextBridge, ipcRenderer } from "electron";
import type { z } from "zod";
import {
	AppVersionResultSchema,
	IpcChannels,
	PiSessionActionResultSchema,
	PiSessionEventSchema,
	PiSessionStartResultSchema,
	ProjectStateViewResultSchema,
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
		select: async (input) => safeInvokeParse(IpcChannels.chatSelect, ProjectStateViewResultSchema, input),
	},
	piSession: {
		start: async (input) => safeInvokeParse(IpcChannels.piSessionStart, PiSessionStartResultSchema, input),
		submit: async (input) => safeInvokeParse(IpcChannels.piSessionSubmit, PiSessionActionResultSchema, input),
		abort: async (input) => safeInvokeParse(IpcChannels.piSessionAbort, PiSessionActionResultSchema, input),
		dispose: async (input) => safeInvokeParse(IpcChannels.piSessionDispose, PiSessionActionResultSchema, input),
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
};

contextBridge.exposeInMainWorld("piDesktop", api);
