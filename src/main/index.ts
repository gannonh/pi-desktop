import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, clipboard, dialog, ipcMain, shell } from "electron";
import { type AppRpcOperation, AppRpcRequestSchema } from "../shared/app-transport";
import { ClipboardWriteTextInputSchema, IpcChannels } from "../shared/ipc";
import { err, ok } from "../shared/result";
import { type AppBackend, createAppBackend } from "./app-backend";
import { resolveDesktopChatsPath, resolveProjectStorePath } from "./app-paths";
import { branchSession, cloneSession, forkSession, writeSessionName } from "./pi-session/pi-session-file-actions";
import { createSmokePiAgentSession, loadSmokePiSessionHistory } from "./pi-session/smoke-pi-session";
import { initializeGitRepository } from "./projects/git";
import { createProjectService, type ProjectService } from "./projects/project-service";
import { createProjectStore } from "./projects/project-store";
import { createPiSessionLister, readSessionInfoForPath } from "./sessions/pi-session-index";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;
let appBackend: AppBackend | null = null;

const createWindow = () => {
	const smokeHeadless = shouldRunSmokeHeadless();
	const createdWindow = new BrowserWindow({
		width: 1280,
		height: 820,
		minWidth: 960,
		minHeight: 640,
		show: !smokeHeadless,
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

const shouldRunSmokeHeadless = () => process.env.PI_DESKTOP_SMOKE_HEADLESS === "1";

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
		initializeGitRepository,
		now: () => new Date().toISOString(),
		env: process.env,
		createAgentSession: shouldUseSmokePiSession() ? createSmokePiAgentSession : undefined,
		loadSessionHistory: shouldUseSmokePiSession() ? loadSmokePiSessionHistory : undefined,
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
	ipcMain.handle(IpcChannels.piSessionPrepare, (_event, input) => invokeBackend("piSession.prepare", input));
	ipcMain.handle(IpcChannels.piSessionAttach, (_event, input) => invokeBackend("piSession.attach", input));
	ipcMain.handle(IpcChannels.piSessionDispose, (_event, input) => invokeBackend("piSession.dispose", input));
	ipcMain.handle(IpcChannels.piSessionGetSettings, (_event, input) => invokeBackend("piSession.getSettings", input));
	ipcMain.handle(IpcChannels.piSessionGetCommands, (_event, input) => invokeBackend("piSession.getCommands", input));
	ipcMain.handle(IpcChannels.piSessionGetDefaultSettings, (_event, input) =>
		invokeBackend("piSession.getDefaultSettings", input),
	);
	ipcMain.handle(IpcChannels.piSessionSetModel, (_event, input) => invokeBackend("piSession.setModel", input));
	ipcMain.handle(IpcChannels.piSessionSetThinkingLevel, (_event, input) =>
		invokeBackend("piSession.setThinkingLevel", input),
	);
	ipcMain.handle(IpcChannels.piSessionSetDefaultModel, (_event, input) =>
		invokeBackend("piSession.setDefaultModel", input),
	);
	ipcMain.handle(IpcChannels.piSessionSetDefaultThinkingLevel, (_event, input) =>
		invokeBackend("piSession.setDefaultThinkingLevel", input),
	);
	ipcMain.handle(IpcChannels.piSessionUpdateQueuedMessage, (_event, input) =>
		invokeBackend("piSession.updateQueuedMessage", input),
	);
	ipcMain.handle(IpcChannels.piSessionRemoveQueuedMessage, (_event, input) =>
		invokeBackend("piSession.removeQueuedMessage", input),
	);
	ipcMain.handle(IpcChannels.workspaceFilesListDirectory, (_event, input) =>
		invokeBackend("workspaceFiles.listDirectory", input),
	);
	ipcMain.handle(IpcChannels.workspaceFilesReadFile, (_event, input) =>
		invokeBackend("workspaceFiles.readFile", input),
	);
	ipcMain.handle(IpcChannels.workspaceFilesWriteFile, (_event, input) =>
		invokeBackend("workspaceFiles.writeFile", input),
	);
	ipcMain.handle(IpcChannels.sourceControlGetStatus, (_event, input) =>
		invokeBackend("sourceControl.getStatus", input),
	);
	ipcMain.handle(IpcChannels.sourceControlCheckIgnored, (_event, input) =>
		invokeBackend("sourceControl.checkIgnored", input),
	);
	ipcMain.handle(IpcChannels.sourceControlStage, (_event, input) => invokeBackend("sourceControl.stage", input));
	ipcMain.handle(IpcChannels.sourceControlUnstage, (_event, input) => invokeBackend("sourceControl.unstage", input));
	ipcMain.handle(IpcChannels.sourceControlDiscard, (_event, input) => invokeBackend("sourceControl.discard", input));
	ipcMain.handle(IpcChannels.sourceControlBulkStage, (_event, input) =>
		invokeBackend("sourceControl.bulkStage", input),
	);
	ipcMain.handle(IpcChannels.sourceControlBulkUnstage, (_event, input) =>
		invokeBackend("sourceControl.bulkUnstage", input),
	);
	ipcMain.handle(IpcChannels.sourceControlBulkDiscard, (_event, input) =>
		invokeBackend("sourceControl.bulkDiscard", input),
	);
	ipcMain.handle(IpcChannels.sourceControlInitializeRepository, (_event, input) =>
		invokeBackend("sourceControl.initializeRepository", input),
	);
	ipcMain.handle(IpcChannels.sourceControlCommit, (_event, input) => invokeBackend("sourceControl.commit", input));
	ipcMain.handle(IpcChannels.sourceControlGetDiff, (_event, input) => invokeBackend("sourceControl.getDiff", input));
	ipcMain.handle(IpcChannels.sourceControlGetUpstreamStatus, (_event, input) =>
		invokeBackend("sourceControl.getUpstreamStatus", input),
	);
	ipcMain.handle(IpcChannels.sourceControlFetch, (_event, input) => invokeBackend("sourceControl.fetch", input));
	ipcMain.handle(IpcChannels.sourceControlPush, (_event, input) => invokeBackend("sourceControl.push", input));
	ipcMain.handle(IpcChannels.sourceControlForcePushWithLease, (_event, input) =>
		invokeBackend("sourceControl.forcePushWithLease", input),
	);
	ipcMain.handle(IpcChannels.sourceControlPull, (_event, input) => invokeBackend("sourceControl.pull", input));
	ipcMain.handle(IpcChannels.sourceControlSync, (_event, input) => invokeBackend("sourceControl.sync", input));
	ipcMain.handle(IpcChannels.sourceControlFastForward, (_event, input) =>
		invokeBackend("sourceControl.fastForward", input),
	);
	ipcMain.handle(IpcChannels.sourceControlPublish, (_event, input) => invokeBackend("sourceControl.publish", input));
	ipcMain.handle(IpcChannels.sourceControlRebaseFromBase, (_event, input) =>
		invokeBackend("sourceControl.rebaseFromBase", input),
	);
	ipcMain.handle(IpcChannels.sourceControlGetBranchCompare, (_event, input) =>
		invokeBackend("sourceControl.getBranchCompare", input),
	);
	ipcMain.handle(IpcChannels.sourceControlAbortConflict, (_event, input) =>
		invokeBackend("sourceControl.abortConflict", input),
	);
	ipcMain.handle(IpcChannels.sourceControlCreatePullRequest, (_event, input) =>
		invokeBackend("sourceControl.createPullRequest", input),
	);
	ipcMain.handle(IpcChannels.sourceControlGetPullRequestInfo, (_event, input) =>
		invokeBackend("sourceControl.getPullRequestInfo", input),
	);
	ipcMain.handle(IpcChannels.clipboardWriteText, (_event, input) => {
		const parsed = ClipboardWriteTextInputSchema.safeParse(input);
		if (!parsed.success) {
			return err("clipboard.input_invalid", "Clipboard text input is invalid.");
		}
		clipboard.writeText(parsed.data.text);
		return ok({ written: true as const });
	});
};

app.whenReady().then(() => {
	if (shouldRunSmokeHeadless() && process.platform === "darwin") {
		app.dock?.hide();
	}

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
		readSessionInfoForPath,
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
