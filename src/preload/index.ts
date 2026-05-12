import { contextBridge, ipcRenderer } from "electron";
import type { z } from "zod";
import {
	AppVersionResultSchema,
	IpcChannels,
	SelectFolderResultSchema,
	WorkspaceStateResultSchema,
} from "../shared/ipc";
import type { PiDesktopApi } from "../shared/preload-api";
import { createIpcError, type IpcResult } from "../shared/result";

type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Unknown IPC error.");

const safeInvokeParse = async <TResult extends IpcResult<unknown>>(
	channel: IpcChannel,
	schema: z.ZodType<TResult>,
): Promise<TResult> => {
	try {
		return schema.parse(await ipcRenderer.invoke(channel));
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
	workspace: {
		getInitialState: async () => safeInvokeParse(IpcChannels.workspaceGetInitialState, WorkspaceStateResultSchema),
		selectFolder: async () => safeInvokeParse(IpcChannels.workspaceSelectFolder, SelectFolderResultSchema),
	},
};

contextBridge.exposeInMainWorld("piDesktop", api);
