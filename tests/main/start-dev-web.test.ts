import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AppBackend } from "../../src/main/app-backend";
import type { LocalDevServer, LocalDevServerOptions } from "../../src/main/dev-server/local-dev-server";
import {
	resolveDevWebUserDataDir,
	startDevWebServer,
	type StartDevWebServerDeps,
} from "../../src/main/dev-server/start-dev-web";
import { err, ok } from "../../src/shared/result";

const createBackend = (): AppBackend =>
	({
		handle: vi.fn(async () => err("test.unhandled", "Unhandled request.")),
		onPiSessionEvent: vi.fn(() => () => undefined),
		dispose: vi.fn(async () => undefined),
	}) satisfies AppBackend;

const createAppServer = (close = vi.fn(async () => undefined)) =>
	({
		url: "http://127.0.0.1:43210",
		wsUrl: "ws://127.0.0.1:43210/api/events",
		close,
	}) satisfies LocalDevServer;

const createViteServer = (overrides: Partial<StartDevWebServerDeps> = {}) => {
	const listeners = new Map<NodeJS.Signals, () => void>();
	const env: NodeJS.ProcessEnv = {};
	const processLike = {
		env,
		once: vi.fn((signal: NodeJS.Signals, listener: () => void) => {
			listeners.set(signal, listener);
		}),
		removeListener: vi.fn((signal: NodeJS.Signals, listener: () => void) => {
			if (listeners.get(signal) === listener) {
				listeners.delete(signal);
			}
		}),
		exit: vi.fn((() => undefined) as (code?: number) => never),
	};
	const logger = {
		log: vi.fn(),
		error: vi.fn(),
	};
	const backend = createBackend();
	const appServer = createAppServer();
	const vite = {
		listen: vi.fn(async () => undefined),
		close: vi.fn(async () => undefined),
		printUrls: vi.fn(),
	};
	const deps: StartDevWebServerDeps = {
		env: processLike.env,
		logger,
		process: processLike,
		createBackend: vi.fn(() => backend),
		createAppServer: vi.fn(async (_options: LocalDevServerOptions) => appServer),
		createViteServer: vi.fn(async () => vite),
		...overrides,
	};
	return {
		backend,
		appServer,
		vite,
		logger,
		processLike,
		listeners,
		deps,
	};
};

describe("resolveDevWebUserDataDir", () => {
	it("defaults to the Electron dev app user data path on macOS", () => {
		expect(resolveDevWebUserDataDir({}, "/Users/tester", "darwin")).toBe(
			"/Users/tester/Library/Application Support/pi-desktop",
		);
	});

	it("keeps the explicit user data path override", () => {
		expect(
			resolveDevWebUserDataDir({ PI_DESKTOP_USER_DATA_DIR: "/tmp/pi-desktop-web" }, "/Users/tester", "darwin"),
		).toBe("/tmp/pi-desktop-web");
	});
});

describe("startDevWebServer", () => {
	it("sets the app server URL environment variable before creating the Vite server", async () => {
		const fixture = createViteServer({
			createViteServer: vi.fn(async () => {
				expect(fixture.processLike.env.VITE_PI_DESKTOP_APP_SERVER_URL).toBe(fixture.appServer.url);
				return fixture.vite;
			}),
		});

		const handle = await startDevWebServer(fixture.deps);

		expect(fixture.deps.createAppServer).toHaveBeenCalledWith({
			backend: fixture.backend,
			host: "127.0.0.1",
			port: 0,
		});
		expect(fixture.deps.createViteServer).toHaveBeenCalledWith({
			configFile: "vite.renderer.config.ts",
			server: { host: "127.0.0.1", port: 5173, strictPort: true },
		});
		expect(fixture.vite.listen).toHaveBeenCalledOnce();
		expect(fixture.vite.printUrls).toHaveBeenCalledOnce();
		expect(fixture.logger.log).toHaveBeenCalledWith(`Local app data bridge: ${fixture.appServer.url}`);
		expect(fixture.logger.log).toHaveBeenCalledWith(expect.stringContaining("pi-desktop workspace store: "));
		expect(fixture.logger.log).toHaveBeenCalledWith(expect.stringContaining("Pi agent config directory: "));
		expect(fixture.logger.log).toHaveBeenCalledWith(expect.stringContaining("Pi session files root: "));

		await handle.shutdown();
	});

	it("closes the app data bridge and backend if Vite server creation fails", async () => {
		const startupError = new Error("Vite creation failed.");
		const fixture = createViteServer({
			createViteServer: vi.fn(async () => {
				throw startupError;
			}),
		});

		await expect(startDevWebServer(fixture.deps)).rejects.toThrow(startupError);

		expect(fixture.appServer.close).toHaveBeenCalledOnce();
		expect(fixture.backend.dispose).toHaveBeenCalledOnce();
	});

	it("closes the app data bridge, Vite server, and backend if Vite listen fails", async () => {
		const startupError = new Error("Vite listen failed.");
		const fixture = createViteServer();
		fixture.vite.listen.mockRejectedValueOnce(startupError);

		await expect(startDevWebServer(fixture.deps)).rejects.toThrow(startupError);

		expect(fixture.vite.close).toHaveBeenCalledOnce();
		expect(fixture.appServer.close).toHaveBeenCalledOnce();
		expect(fixture.backend.dispose).toHaveBeenCalledOnce();
	});

	it("disposes the backend if app data bridge startup fails", async () => {
		const startupError = new Error("App bridge failed.");
		const fixture = createViteServer({
			createAppServer: vi.fn(async () => {
				throw startupError;
			}),
		});

		await expect(startDevWebServer(fixture.deps)).rejects.toThrow(startupError);

		expect(fixture.vite.close).not.toHaveBeenCalled();
		expect(fixture.appServer.close).not.toHaveBeenCalled();
		expect(fixture.backend.dispose).toHaveBeenCalledOnce();
	});

	it("attempts every shutdown step and logs cleanup failures", async () => {
		const cleanupError = new Error("Vite close failed.");
		const fixture = createViteServer();
		fixture.vite.close.mockRejectedValueOnce(cleanupError);
		const handle = await startDevWebServer(fixture.deps);

		await handle.shutdown();

		expect(fixture.vite.close).toHaveBeenCalledOnce();
		expect(fixture.appServer.close).toHaveBeenCalledOnce();
		expect(fixture.backend.dispose).toHaveBeenCalledOnce();
		expect(fixture.logger.error).toHaveBeenCalledWith("Failed to close Vite dev server.", cleanupError);
	});

	it("does not repeat cleanup when shutdown is called more than once", async () => {
		const fixture = createViteServer();
		const handle = await startDevWebServer(fixture.deps);

		await handle.shutdown();
		await handle.shutdown();

		expect(fixture.vite.close).toHaveBeenCalledOnce();
		expect(fixture.appServer.close).toHaveBeenCalledOnce();
		expect(fixture.backend.dispose).toHaveBeenCalledOnce();
	});

	it("deregisters signal handlers when manually shut down", async () => {
		const fixture = createViteServer();
		const handle = await startDevWebServer(fixture.deps);
		const sigintHandler = fixture.listeners.get("SIGINT");
		const sigtermHandler = fixture.listeners.get("SIGTERM");

		await handle.shutdown();

		expect(fixture.processLike.removeListener).toHaveBeenCalledWith("SIGINT", sigintHandler);
		expect(fixture.processLike.removeListener).toHaveBeenCalledWith("SIGTERM", sigtermHandler);
		expect(fixture.listeners.size).toBe(0);
	});

	it("shuts down and exits from process signal handlers", async () => {
		const fixture = createViteServer();
		await startDevWebServer(fixture.deps);

		fixture.listeners.get("SIGINT")?.();
		await new Promise((resolve) => setImmediate(resolve));

		expect(fixture.vite.close).toHaveBeenCalledOnce();
		expect(fixture.appServer.close).toHaveBeenCalledOnce();
		expect(fixture.backend.dispose).toHaveBeenCalledOnce();
		expect(fixture.processLike.exit).toHaveBeenCalledWith(0);
	});

	it("can build the default backend for the app data bridge", async () => {
		const userDataDir = await mkdtemp(path.join(tmpdir(), "pi-desktop-web-test-"));
		const env: NodeJS.ProcessEnv = {
			PI_DESKTOP_DOCUMENTS_DIR: userDataDir,
			PI_DESKTOP_USER_DATA_DIR: userDataDir,
		};
		const fixture = createViteServer({ createBackend: undefined, env });

		try {
			const handle = await startDevWebServer(fixture.deps);

			await expect(handle.backend.handle({ operation: "app.getVersion" })).resolves.toEqual(
				ok({ name: "pi-desktop web", version: "dev" }),
			);

			await handle.shutdown();
		} finally {
			await rm(userDataDir, { force: true, recursive: true });
		}
	});

	it("can start the real local app data bridge through the default app server factory", async () => {
		const fixture = createViteServer({ createAppServer: undefined });
		fixture.backend.handle = vi.fn(async () => ok({ name: "pi-desktop test", version: "dev" }));
		const handle = await startDevWebServer(fixture.deps);

		try {
			const response = await fetch(`${handle.appServer?.url}/api/rpc`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ operation: "app.getVersion" }),
			});

			expect(await response.json()).toEqual({ ok: true, data: { name: "pi-desktop test", version: "dev" } });
		} finally {
			await handle.shutdown();
		}
	});

	it("uses the default environment, logger, and process bindings", async () => {
		const previousUrl = process.env.VITE_PI_DESKTOP_APP_SERVER_URL;
		delete process.env.VITE_PI_DESKTOP_APP_SERVER_URL;
		const processListeners = new Map<NodeJS.Signals, () => void>();
		const processOnce = vi.spyOn(process, "once").mockImplementation((signal, listener) => {
			processListeners.set(signal as NodeJS.Signals, listener as () => void);
			return process;
		});
		const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
		const fixture = createViteServer({ env: undefined, logger: undefined, process: undefined });

		try {
			const handle = await startDevWebServer(fixture.deps);

			expect(process.env.VITE_PI_DESKTOP_APP_SERVER_URL).toBe(fixture.appServer.url);
			expect(consoleLog).toHaveBeenCalledWith(`Local app data bridge: ${fixture.appServer.url}`);
			expect(processOnce).toHaveBeenCalledWith("SIGINT", expect.any(Function));
			expect(processListeners.has("SIGTERM")).toBe(true);

			await handle.shutdown();
		} finally {
			if (previousUrl === undefined) {
				delete process.env.VITE_PI_DESKTOP_APP_SERVER_URL;
			} else {
				process.env.VITE_PI_DESKTOP_APP_SERVER_URL = previousUrl;
			}
			processOnce.mockRestore();
			consoleLog.mockRestore();
		}
	});
});
