import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDemoWorkspaceState } from "../shared/demo-workspace";
import { IpcChannels } from "../shared/ipc";
import { err, ok } from "../shared/result";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		width: 1280,
		height: 820,
		minWidth: 960,
		minHeight: 640,
		title: "pi-desktop",
		backgroundColor: "#0a0a0a",
		webPreferences: {
			preload: path.join(currentDirectory, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
		},
	});

	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
		return;
	}

	void mainWindow.loadFile(path.join(currentDirectory, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
};

const registerIpcHandlers = () => {
	ipcMain.handle(IpcChannels.appGetVersion, () =>
		ok({
			name: app.getName(),
			version: app.getVersion(),
		}),
	);

	ipcMain.handle(IpcChannels.workspaceGetInitialState, () => ok(createDemoWorkspaceState()));

	ipcMain.handle(IpcChannels.workspaceSelectFolder, async () => {
		const result = await dialog.showOpenDialog({
			properties: ["openDirectory"],
			title: "Open Project Folder",
		});

		if (result.canceled) {
			return ok({
				status: "cancelled" as const,
			});
		}

		const selectedPath = result.filePaths[0];

		if (!selectedPath) {
			return err("workspace.no_selection", "Folder picker returned no selected path.");
		}

		return ok({
			status: "selected" as const,
			path: selectedPath,
		});
	});
};

app.whenReady().then(() => {
	registerIpcHandlers();
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
