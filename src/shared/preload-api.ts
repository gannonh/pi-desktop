import type { AppVersionResult, SelectFolderResult, WorkspaceStateResult } from "./ipc";

export interface PiDesktopApi {
	app: {
		getVersion: () => Promise<AppVersionResult>;
	};
	workspace: {
		getInitialState: () => Promise<WorkspaceStateResult>;
		selectFolder: () => Promise<SelectFolderResult>;
	};
}
