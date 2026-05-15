import { createServer as createViteServer } from "vite";
import { homedir } from "node:os";
import path from "node:path";
import { createAppBackend } from "../app-backend";
import { createSmokePiAgentSession } from "../pi-session/smoke-pi-session";
import { initializeGitRepository } from "../projects/git";
import { createProjectService } from "../projects/project-service";
import { createProjectStore } from "../projects/project-store";
import { createLocalDevServer } from "./local-dev-server";

const host = "127.0.0.1";
const vitePort = 5173;
const documentsDir = process.env.PI_DESKTOP_DOCUMENTS_DIR ?? path.join(homedir(), "Documents");
const userDataDir = process.env.PI_DESKTOP_USER_DATA_DIR ?? path.join(process.cwd(), ".pi-desktop-dev");

const unavailableNativeOperation = async () => {
	throw new Error("Native desktop operation unavailable in web preview.");
};

const backend = createAppBackend({
	appInfo: { name: "pi-desktop web", version: "dev" },
	projectService: createProjectService({
		store: createProjectStore(path.join(userDataDir, "project-store.json")),
		documentsDir,
		now: () => new Date().toISOString(),
		openFolderDialog: unavailableNativeOperation,
		openInFinder: unavailableNativeOperation,
		initializeGitRepository,
	}),
	now: () => new Date().toISOString(),
	createAgentSession: process.env.PI_DESKTOP_SMOKE_PI_SESSION === "1" ? createSmokePiAgentSession : undefined,
});

const appServer = await createLocalDevServer({ backend, host, port: 0 });
process.env.VITE_PI_DESKTOP_APP_SERVER_URL = appServer.url;

const vite = await createViteServer({
	configFile: "vite.renderer.config.ts",
	server: { host, port: vitePort, strictPort: true },
});

await vite.listen();
vite.printUrls();
console.log(`Local app data bridge: ${appServer.url}`);

const shutdown = async () => {
	await vite.close();
	await appServer.close();
	await backend.dispose();
};

process.once("SIGINT", () => {
	void shutdown().finally(() => process.exit(0));
});
process.once("SIGTERM", () => {
	void shutdown().finally(() => process.exit(0));
});
