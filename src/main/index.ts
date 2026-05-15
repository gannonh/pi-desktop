import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	ChatCreateInputSchema,
	ChatSelectionInputSchema,
	IpcChannels,
	PiSessionOperationFailedCode,
	ProjectIdInputSchema,
	ProjectPinnedInputSchema,
	ProjectRenameInputSchema,
} from "../shared/ipc";
import {
	PiSessionAbortInputSchema,
	PiSessionDisposeInputSchema,
	PiSessionStartInputSchema,
	PiSessionSubmitInputSchema,
} from "../shared/pi-session";
import { err, ok } from "../shared/result";
import { sanitizeRuntimeErrorMessage } from "./pi-session/pi-session-event-normalizer";
import { createPiSessionRuntime } from "./pi-session/pi-session-runtime";
import { createSmokePiAgentSession } from "./pi-session/smoke-pi-session";
import { initializeGitRepository } from "./projects/git";
import { createProjectService, type ProjectService } from "./projects/project-service";
import { createProjectStore } from "./projects/project-store";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;

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

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

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

const handleProjectOperation = async (operation: () => Promise<unknown>) => {
	try {
		return ok(await operation());
	} catch (error) {
		return err("project.operation_failed", toErrorMessage(error));
	}
};

const handlePiSessionOperation = async (operation: () => Promise<unknown>) => {
	try {
		return ok(await operation());
	} catch (error) {
		return err(PiSessionOperationFailedCode, sanitizeRuntimeErrorMessage(error));
	}
};

const registerIpcHandlers = (projectService: ProjectService) => {
	const piSessionRuntime = createPiSessionRuntime({
		now: () => new Date().toISOString(),
		emit: (event) => {
			if (mainWindow && !mainWindow.isDestroyed()) {
				mainWindow.webContents.send(IpcChannels.piSessionEvent, event);
			}
		},
		createAgentSession: shouldUseSmokePiSession() ? createSmokePiAgentSession : undefined,
	});

	ipcMain.handle(IpcChannels.appGetVersion, () =>
		ok({
			name: app.getName(),
			version: app.getVersion(),
		}),
	);

	ipcMain.handle(IpcChannels.projectGetState, () => handleProjectOperation(() => projectService.getState()));
	ipcMain.handle(IpcChannels.projectCreateFromScratch, () =>
		handleProjectOperation(() => projectService.createFromScratch()),
	);
	ipcMain.handle(IpcChannels.projectAddExistingFolder, () =>
		handleProjectOperation(() => projectService.addExistingFolder()),
	);
	ipcMain.handle(IpcChannels.projectSelect, (_event, input) =>
		handleProjectOperation(() => projectService.selectProject(ProjectIdInputSchema.parse(input))),
	);
	ipcMain.handle(IpcChannels.projectRename, (_event, input) =>
		handleProjectOperation(() => projectService.renameProject(ProjectRenameInputSchema.parse(input))),
	);
	ipcMain.handle(IpcChannels.projectRemove, (_event, input) =>
		handleProjectOperation(() => projectService.removeProject(ProjectIdInputSchema.parse(input))),
	);
	ipcMain.handle(IpcChannels.projectOpenInFinder, (_event, input) =>
		handleProjectOperation(() => projectService.openProjectInFinder(ProjectIdInputSchema.parse(input))),
	);
	ipcMain.handle(IpcChannels.projectLocateFolder, (_event, input) =>
		handleProjectOperation(() => projectService.locateFolder(ProjectIdInputSchema.parse(input))),
	);
	ipcMain.handle(IpcChannels.projectSetPinned, (_event, input) =>
		handleProjectOperation(() => projectService.setPinned(ProjectPinnedInputSchema.parse(input))),
	);
	ipcMain.handle(IpcChannels.projectCheckAvailability, (_event, input) =>
		handleProjectOperation(() => projectService.checkAvailability(ProjectIdInputSchema.parse(input))),
	);
	ipcMain.handle(IpcChannels.chatCreate, (_event, input) =>
		handleProjectOperation(() => projectService.createChat(ChatCreateInputSchema.parse(input))),
	);
	ipcMain.handle(IpcChannels.chatSelect, (_event, input) =>
		handleProjectOperation(() => projectService.selectChat(ChatSelectionInputSchema.parse(input))),
	);
	ipcMain.handle(IpcChannels.piSessionStart, (_event, input) =>
		handlePiSessionOperation(async () => {
			const parsed = PiSessionStartInputSchema.parse(input);
			const workspace = await projectService.getSessionWorkspace({ projectId: parsed.projectId });
			return piSessionRuntime.start({
				projectId: workspace.projectId,
				workspacePath: workspace.path,
				prompt: parsed.prompt,
			});
		}),
	);
	ipcMain.handle(IpcChannels.piSessionSubmit, (_event, input) =>
		handlePiSessionOperation(() => piSessionRuntime.submit(PiSessionSubmitInputSchema.parse(input))),
	);
	ipcMain.handle(IpcChannels.piSessionAbort, (_event, input) =>
		handlePiSessionOperation(() => piSessionRuntime.abort(PiSessionAbortInputSchema.parse(input))),
	);
	ipcMain.handle(IpcChannels.piSessionDispose, (_event, input) =>
		handlePiSessionOperation(() => piSessionRuntime.dispose(PiSessionDisposeInputSchema.parse(input))),
	);
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
