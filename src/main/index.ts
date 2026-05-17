import { SessionManager } from "@earendil-works/pi-coding-agent";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AppRpcRequestSchema, type AppRpcOperation } from "../shared/app-transport";
import { IpcChannels } from "../shared/ipc";
import { err } from "../shared/result";
import { createAppBackend, type AppBackend } from "./app-backend";
import { resolveDesktopChatsPath, resolvePiSessionFilesDirForCwd, resolveProjectStorePath } from "./app-paths";
import { createSmokePiAgentSession } from "./pi-session/smoke-pi-session";
import { initializeGitRepository } from "./projects/git";
import { createProjectService, type ProjectService } from "./projects/project-service";
import { createProjectStore } from "./projects/project-store";
import { createPiSessionLister } from "./sessions/pi-session-index";

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

const getProjectStorePath = () =>
	resolveProjectStorePath({ env: process.env, defaultUserDataDir: app.getPath("userData") });

const getDesktopChatsPath = () =>
	resolveDesktopChatsPath({ env: process.env, defaultUserDataDir: app.getPath("userData") });

const shouldUseSmokePiSession = () => !app.isPackaged && process.env.PI_DESKTOP_SMOKE_PI_SESSION === "1";

const openInFinder = async (projectPath: string): Promise<void> => {
	const result = await shell.openPath(projectPath);
	if (result) {
		throw new Error(result);
	}
};

const writeSessionName = async (sessionPath: string, name: string): Promise<void> => {
	SessionManager.open(sessionPath).appendSessionInfo(name);
};

const forkSession = async (sourcePath: string, targetCwd: string): Promise<string> => {
	const manager = SessionManager.forkFrom(
		sourcePath,
		targetCwd,
		resolvePiSessionFilesDirForCwd({ cwd: targetCwd, env: process.env }),
	);
	const forkedPath = manager.getSessionFile();
	if (!forkedPath) {
		throw new Error("Pi session fork did not create a persisted session file.");
	}
	return forkedPath;
};

const cloneSession = async (sourcePath: string, targetCwd: string): Promise<string> => {
	const manager = SessionManager.open(
		sourcePath,
		resolvePiSessionFilesDirForCwd({ cwd: targetCwd, env: process.env }),
		targetCwd,
	);
	const leafId = manager.getLeafId();
	if (!leafId) {
		throw new Error("Cannot clone a session without entries.");
	}
	const clonedPath = manager.createBranchedSession(leafId);
	if (!clonedPath) {
		throw new Error("Pi session clone did not create a persisted session file.");
	}
	return clonedPath;
};

const branchSession = async (sourcePath: string, targetCwd: string, entryId: string): Promise<string> => {
	const manager = SessionManager.open(
		sourcePath,
		resolvePiSessionFilesDirForCwd({ cwd: targetCwd, env: process.env }),
		targetCwd,
	);
	manager.branch(entryId);
	const branchedPath = manager.createBranchedSession(entryId);
	if (!branchedPath) {
		throw new Error("Pi session branch did not create a persisted session file.");
	}
	return branchedPath;
};

const registerIpcHandlers = (projectService: ProjectService) => {
	const backend = createAppBackend({
		appInfo: {
			name: app.getName(),
			version: app.getVersion(),
		},
		projectService,
		now: () => new Date().toISOString(),
		env: process.env,
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
	ipcMain.handle(IpcChannels.chatCreateStandalone, (_event, input) => invokeBackend("chat.createStandalone", input));
	ipcMain.handle(IpcChannels.chatSelect, (_event, input) => invokeBackend("chat.select", input));
	ipcMain.handle(IpcChannels.chatRename, (_event, input) => invokeBackend("chat.rename", input));
	ipcMain.handle(IpcChannels.chatSelectStandalone, (_event, input) => invokeBackend("chat.selectStandalone", input));
	ipcMain.handle(IpcChannels.chatFork, (_event, input) => invokeBackend("chat.fork", input));
	ipcMain.handle(IpcChannels.chatClone, (_event, input) => invokeBackend("chat.clone", input));
	ipcMain.handle(IpcChannels.chatBranch, (_event, input) => invokeBackend("chat.branch", input));
	ipcMain.handle(IpcChannels.piSessionStart, (_event, input) => invokeBackend("piSession.start", input));
	ipcMain.handle(IpcChannels.piSessionSubmit, (_event, input) => invokeBackend("piSession.submit", input));
	ipcMain.handle(IpcChannels.piSessionAbort, (_event, input) => invokeBackend("piSession.abort", input));
	ipcMain.handle(IpcChannels.piSessionHistory, (_event, input) => invokeBackend("piSession.history", input));
	ipcMain.handle(IpcChannels.piSessionDispose, (_event, input) => invokeBackend("piSession.dispose", input));
};

app.whenReady().then(() => {
	const piSessionLister = createPiSessionLister(process.env);
	const projectService = createProjectService({
		store: createProjectStore(getProjectStorePath()),
		documentsDir: app.getPath("documents"),
		desktopChatsPath: getDesktopChatsPath(),
		now: () => new Date().toISOString(),
		openFolderDialog,
		openInFinder,
		initializeGitRepository,
		listProjectSessions: piSessionLister.listProject,
		writeSessionName,
		forkSession,
		cloneSession,
		branchSession,
	});

	createWindow();
	registerIpcHandlers(projectService);

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("before-quit", () => {
	const backend = appBackend;
	appBackend = null;
	void backend?.dispose().catch((error) => {
		console.error("Failed to dispose app backend.", error);
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
