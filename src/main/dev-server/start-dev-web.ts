import { SessionManager } from "@earendil-works/pi-coding-agent";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createServer as createViteServer, type InlineConfig } from "vite";
import {
	resolveElectronDevUserDataDir,
	resolvePiAgentDir,
	resolvePiSessionFilesDirForCwd,
	resolvePiSessionFilesRoot,
	resolveProjectStorePath,
} from "../app-paths";
import { createAppBackend, type AppBackend } from "../app-backend";
import { createSmokePiAgentSession } from "../pi-session/smoke-pi-session";
import { initializeGitRepository } from "../projects/git";
import { createProjectService } from "../projects/project-service";
import { createProjectStore } from "../projects/project-store";
import { createPiSessionLister } from "../sessions/pi-session-index";
import { createLocalDevServer, type LocalDevServer, type LocalDevServerOptions } from "./local-dev-server";

const host = "127.0.0.1";
const vitePort = 5173;

type DevWebViteServer = {
	close: () => Promise<void>;
	listen: () => Promise<unknown>;
	printUrls: () => void;
};
type CreateViteDevServer = (config: InlineConfig) => Promise<DevWebViteServer>;
type DevWebLogger = Pick<Console, "error" | "log">;

type DevWebProcess = {
	env: NodeJS.ProcessEnv;
	once: (signal: NodeJS.Signals, listener: () => void) => unknown;
	off?: (signal: NodeJS.Signals, listener: () => void) => unknown;
	removeListener?: (signal: NodeJS.Signals, listener: () => void) => unknown;
	exit: (code?: number) => never;
};

type DevWebServerResources = {
	backend: AppBackend;
	appServer?: LocalDevServer;
	vite?: DevWebViteServer;
};

export type StartDevWebServerDeps = {
	env?: NodeJS.ProcessEnv;
	logger?: DevWebLogger;
	process?: DevWebProcess;
	createBackend?: () => AppBackend;
	createAppServer?: (options: LocalDevServerOptions) => Promise<LocalDevServer>;
	createViteServer?: CreateViteDevServer;
};

export type DevWebServerHandle = DevWebServerResources & {
	shutdown: () => Promise<void>;
};

const unavailableNativeOperation = async () => {
	throw new Error("Native desktop operation unavailable in web preview.");
};

const writeSessionName = async (sessionPath: string, name: string): Promise<void> => {
	SessionManager.open(sessionPath).appendSessionInfo(name);
};

const forkSession = async (sourcePath: string, targetCwd: string, env: NodeJS.ProcessEnv): Promise<string> => {
	const manager = SessionManager.forkFrom(
		sourcePath,
		targetCwd,
		resolvePiSessionFilesDirForCwd({ cwd: targetCwd, env }),
	);
	const forkedPath = manager.getSessionFile();
	if (!forkedPath) {
		throw new Error("Pi session fork did not create a persisted session file.");
	}
	return forkedPath;
};

const cloneSession = async (sourcePath: string, targetCwd: string, env: NodeJS.ProcessEnv): Promise<string> => {
	const manager = SessionManager.open(sourcePath, resolvePiSessionFilesDirForCwd({ cwd: targetCwd, env }), targetCwd);
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

const branchSession = async (
	sourcePath: string,
	targetCwd: string,
	entryId: string,
	env: NodeJS.ProcessEnv,
): Promise<string> => {
	const manager = SessionManager.open(sourcePath, resolvePiSessionFilesDirForCwd({ cwd: targetCwd, env }), targetCwd);
	manager.branch(entryId);
	const branchedPath = manager.createBranchedSession(entryId);
	if (!branchedPath) {
		throw new Error("Pi session branch did not create a persisted session file.");
	}
	return branchedPath;
};

export const resolveDevWebUserDataDir = (
	env: NodeJS.ProcessEnv = process.env,
	homeDir = homedir(),
	platform: NodeJS.Platform | string = process.platform,
): string => env.PI_DESKTOP_USER_DATA_DIR ?? resolveElectronDevUserDataDir(homeDir, platform);

export const createDevWebBackend = (env: NodeJS.ProcessEnv = process.env): AppBackend => {
	const documentsDir = env.PI_DESKTOP_DOCUMENTS_DIR ?? path.join(homedir(), "Documents");
	const piSessionLister = createPiSessionLister(env);
	const projectStorePath = resolveProjectStorePath({
		env,
		defaultUserDataDir: resolveDevWebUserDataDir(env),
	});

	return createAppBackend({
		appInfo: { name: "pi-desktop web", version: "dev" },
		projectService: createProjectService({
			store: createProjectStore(projectStorePath),
			documentsDir,
			now: () => new Date().toISOString(),
			openFolderDialog: unavailableNativeOperation,
			openInFinder: unavailableNativeOperation,
			initializeGitRepository,
			listProjectSessions: piSessionLister.listProject,
			listAllSessions: piSessionLister.listAll,
			writeSessionName,
			forkSession: (sourcePath, targetCwd) => forkSession(sourcePath, targetCwd, env),
			cloneSession: (sourcePath, targetCwd) => cloneSession(sourcePath, targetCwd, env),
			branchSession: (sourcePath, targetCwd, entryId) => branchSession(sourcePath, targetCwd, entryId, env),
		}),
		now: () => new Date().toISOString(),
		env,
		createAgentSession: env.PI_DESKTOP_SMOKE_PI_SESSION === "1" ? createSmokePiAgentSession : undefined,
	});
};

const cleanupDevWebResources = async (resources: DevWebServerResources, logger: DevWebLogger) => {
	const cleanupSteps: { label: string; cleanup: () => Promise<void> }[] = [];
	if (resources.vite !== undefined) {
		const vite = resources.vite;
		cleanupSteps.push({ label: "Vite dev server", cleanup: () => vite.close() });
	}
	if (resources.appServer !== undefined) {
		const appServer = resources.appServer;
		cleanupSteps.push({ label: "local app data bridge", cleanup: () => appServer.close() });
	}
	cleanupSteps.push({ label: "app backend", cleanup: () => resources.backend.dispose() });

	const results = await Promise.allSettled(cleanupSteps.map((step) => step.cleanup()));
	for (const [index, result] of results.entries()) {
		if (result.status === "rejected") {
			logger.error(`Failed to close ${cleanupSteps[index]?.label}.`, result.reason);
		}
	}
};

export const startDevWebServer = async (deps: StartDevWebServerDeps = {}): Promise<DevWebServerHandle> => {
	const env = deps.env ?? process.env;
	const logger = deps.logger ?? console;
	const processLike = deps.process ?? process;
	const backend = (deps.createBackend ?? (() => createDevWebBackend(env)))();
	const createAppServer = deps.createAppServer ?? createLocalDevServer;
	const createVite = deps.createViteServer ?? createViteServer;
	const resources: DevWebServerResources = { backend };
	const signalHandlers = new Map<NodeJS.Signals, () => void>();
	let shutdownStarted = false;

	const unregisterSignalHandlers = () => {
		for (const [signal, listener] of signalHandlers) {
			if (processLike.off) {
				processLike.off(signal, listener);
			} else {
				processLike.removeListener?.(signal, listener);
			}
		}
		signalHandlers.clear();
	};

	const shutdown = async () => {
		if (shutdownStarted) {
			return;
		}
		shutdownStarted = true;
		unregisterSignalHandlers();
		await cleanupDevWebResources(resources, logger);
	};

	try {
		resources.appServer = await createAppServer({ backend, host, port: 0 });
		env.VITE_PI_DESKTOP_APP_SERVER_URL = resources.appServer.url;

		resources.vite = await createVite({
			configFile: "vite.renderer.config.ts",
			server: { host, port: vitePort, strictPort: true },
		});

		await resources.vite.listen();
		resources.vite.printUrls();
		logger.log(`Local app data bridge: ${resources.appServer.url}`);
		logger.log(
			`pi-desktop workspace store: ${resolveProjectStorePath({
				env,
				defaultUserDataDir: resolveDevWebUserDataDir(env),
			})}`,
		);
		logger.log(`Pi agent config directory: ${resolvePiAgentDir(env)}`);
		logger.log(`Pi session files root: ${resolvePiSessionFilesRoot(env)}`);
	} catch (error) {
		await shutdown();
		throw error;
	}

	const registerSignalHandler = (signal: NodeJS.Signals) => {
		const listener = () => {
			void shutdown().finally(() => processLike.exit(0));
		};
		signalHandlers.set(signal, listener);
		processLike.once(signal, listener);
	};

	registerSignalHandler("SIGINT");
	registerSignalHandler("SIGTERM");

	return { ...resources, shutdown };
};

const entrypoint = process.argv[1];
if (entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href) {
	await startDevWebServer();
}
