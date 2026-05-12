import { contextBridge, ipcRenderer } from "electron";
import {
	AppVersionResultSchema,
	IpcChannels,
	SelectFolderResultSchema,
	WorkspaceStateResultSchema,
} from "../shared/ipc";
import type { PiDesktopApi } from "../shared/preload-api";

const api: PiDesktopApi = {
	app: {
		getVersion: async () => AppVersionResultSchema.parse(await ipcRenderer.invoke(IpcChannels.appGetVersion)),
	},
	workspace: {
		getInitialState: async () =>
			WorkspaceStateResultSchema.parse(await ipcRenderer.invoke(IpcChannels.workspaceGetInitialState)),
		selectFolder: async () =>
			SelectFolderResultSchema.parse(await ipcRenderer.invoke(IpcChannels.workspaceSelectFolder)),
	},
};

contextBridge.exposeInMainWorld("piDesktop", api);
