import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	ChatCreateInputSchema,
	ChatSelectionInputSchema,
	IpcChannels,
	ProjectIdInputSchema,
	ProjectPinnedInputSchema,
	ProjectRenameInputSchema,
} from "../shared/ipc";
import { err, ok } from "../shared/result";
import { initializeGitRepository } from "./projects/git";
import { createProjectService, type ProjectService } from "./projects/project-service";
import { createProjectStore } from "./projects/project-store";

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
			sandbox: true,
		},
	});

	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
		return;
	}

	void mainWindow.loadFile(path.join(currentDirectory, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
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

const registerIpcHandlers = (projectService: ProjectService) => {
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
};

app.whenReady().then(() => {
	const projectService = createProjectService({
		store: createProjectStore(path.join(app.getPath("userData"), "project-store.json")),
		documentsDir: app.getPath("documents"),
		now: () => new Date().toISOString(),
		openFolderDialog,
		openInFinder,
		initializeGitRepository,
	});

	registerIpcHandlers(projectService);
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
