import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

app.whenReady().then(() => {
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
