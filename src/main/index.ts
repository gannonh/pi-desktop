import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AppRpcRequestSchema, type AppRpcOperation } from "../shared/app-transport";
import { IpcChannels } from "../shared/ipc";
import { err } from "../shared/result";
import { createAppBackend, type AppBackend } from "./app-backend";
import { createSmokePiAgentSession } from "./pi-session/smoke-pi-session";
import { initializeGitRepository } from "./projects/git";
import { createProjectService, type ProjectService } from "./projects/project-service";
import { createProjectStore } from "./projects/project-store";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;
let appBackend: AppBackend | null = null;

const createWindow = () => {
	const createdWindow = new BrowserWindow({
		width: 1280,
		height: 820,
		minWidth: 960,
		minHeight: 640,
		frame: false,
		title: "pi-desktop",
		backgroundColor: "#0a0a0a",
		webPreferences: {
			preload: path.join(currentDirectory, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});
	mainWindow = createdWindow;

	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		void createdWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
	} else {
		void createdWindow.loadFile(path.join(currentDirectory, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
	}

	createdWindow.on("closed", () => {
		if (mainWindow === createdWindow) {
			void appBackend?.dispose().catch((error) => {
				console.error("Failed to dispose app backend.", error);
			});
			mainWindow = null;
		}
	});

	return createdWindow;
};

const openFolderDialog = async (): Promise<string | null> => {
	const result = await dialog.showOpenDialog({
		properties: ["openDirectory"],
		title: "Open Project Folder",
	});

	if (result.canceled) {
		return null;
	}

	const selectedPath = result.filePaths[0];
	if (!selectedPath) {
		throw new Error("Folder picker returned no selected path.");
	}

	return selectedPath;
};

const getProjectStorePath = () => {
	const userDataPath = process.env.PI_DESKTOP_USER_DATA_DIR ?? app.getPath("userData");
	return path.join(userDataPath, "project-store.json");
};

const shouldUseSmokePiSession = () => !app.isPackaged && process.env.PI_DESKTOP_SMOKE_PI_SESSION === "1";

const openInFinder = async (projectPath: string): Promise<void> => {
	const result = await shell.openPath(projectPath);
	if (result) {
		throw new Error(result);
	}
};

const registerIpcHandlers = (projectService: ProjectService) => {
	const backend = createAppBackend({
		appInfo: {
			name: app.getName(),
			version: app.getVersion(),
		},
		projectService,
		now: () => new Date().toISOString(),
		createAgentSession: shouldUseSmokePiSession() ? createSmokePiAgentSession : undefined,
	});
	appBackend = backend;

	backend.onPiSessionEvent((event) => {
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send(IpcChannels.piSessionEvent, event);
		}
	});

	const invokeBackend = (operation: AppRpcOperation, input?: unknown) => {
		try {
			const request = AppRpcRequestSchema.parse(input === undefined ? { operation } : { operation, input });
			return backend.handle(request);
		} catch {
			return Promise.resolve(err("ipc.request_invalid", "Invalid IPC request."));
		}
	};

	ipcMain.handle(IpcChannels.appGetVersion, () => invokeBackend("app.getVersion"));
	ipcMain.handle(IpcChannels.projectGetState, () => invokeBackend("project.getState"));
	ipcMain.handle(IpcChannels.projectCreateFromScratch, () => invokeBackend("project.createFromScratch"));
	ipcMain.handle(IpcChannels.projectAddExistingFolder, () => invokeBackend("project.addExistingFolder"));
	ipcMain.handle(IpcChannels.projectSelect, (_event, input) => invokeBackend("project.select", input));
	ipcMain.handle(IpcChannels.projectRename, (_event, input) => invokeBackend("project.rename", input));
	ipcMain.handle(IpcChannels.projectRemove, (_event, input) => invokeBackend("project.remove", input));
	ipcMain.handle(IpcChannels.projectOpenInFinder, (_event, input) => invokeBackend("project.openInFinder", input));
	ipcMain.handle(IpcChannels.projectLocateFolder, (_event, input) => invokeBackend("project.locateFolder", input));
	ipcMain.handle(IpcChannels.projectSetPinned, (_event, input) => invokeBackend("project.setPinned", input));
	ipcMain.handle(IpcChannels.projectCheckAvailability, (_event, input) =>
		invokeBackend("project.checkAvailability", input),
	);
	ipcMain.handle(IpcChannels.chatCreate, (_event, input) => invokeBackend("chat.create", input));
	ipcMain.handle(IpcChannels.chatSelect, (_event, input) => invokeBackend("chat.select", input));
	ipcMain.handle(IpcChannels.piSessionStart, (_event, input) => invokeBackend("piSession.start", input));
	ipcMain.handle(IpcChannels.piSessionSubmit, (_event, input) => invokeBackend("piSession.submit", input));
	ipcMain.handle(IpcChannels.piSessionAbort, (_event, input) => invokeBackend("piSession.abort", input));
	ipcMain.handle(IpcChannels.piSessionDispose, (_event, input) => invokeBackend("piSession.dispose", input));
};

app.whenReady().then(() => {
	const projectService = createProjectService({
		store: createProjectStore(getProjectStorePath()),
		documentsDir: app.getPath("documents"),
		now: () => new Date().toISOString(),
		openFolderDialog,
		openInFinder,
		initializeGitRepository,
	});

	createWindow();
	registerIpcHandlers(projectService);

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
