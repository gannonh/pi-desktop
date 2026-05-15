# Dev Web Real Data Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `pnpm dev:web` use real local project, chat, and Pi session data through a reusable HTTP/WebSocket app transport.

**Architecture:** Keep `PiDesktopApi` as the renderer contract. Extract a transport-neutral `AppBackend` in main-process code, bind it to Electron IPC for desktop, and bind it to a local HTTP/WebSocket server for web preview. Browser preview installs an HTTP client instead of the current mock preview API.

**Tech Stack:** TypeScript, React, Electron Forge, Vite, Node HTTP, `ws`, Zod, Vitest, Playwright.

---

## File Structure

- Create `src/shared/app-transport.ts`: typed RPC operation names, request schemas, response schema lookup, and WebSocket event envelope schema.
- Create `tests/shared/app-transport.test.ts`: schema tests for representative operations and session events.
- Create `src/main/app-backend.ts`: transport-neutral backend that owns app/project/chat/session operation handling and session event fanout.
- Modify `src/main/index.ts`: create `AppBackend`, register IPC handlers through it, and remove duplicated operation wrappers.
- Create `tests/main/app-backend.test.ts`: backend operation and event fanout tests with fake services/runtime.
- Create `src/main/dev-server/local-dev-server.ts`: local HTTP/WebSocket transport host for `AppBackend`.
- Create `tests/main/local-dev-server.test.ts`: route validation, RPC response, and WebSocket event tests.
- Create `src/main/dev-server/start-dev-web.ts`: one-process dev runner that starts the local app server and Vite renderer.
- Create `src/renderer/app-api/http-client.ts`: browser `PiDesktopApi` implementation backed by HTTP and WebSocket.
- Create `src/renderer/app-api/unavailable-api.ts`: visible structured errors when no app transport exists.
- Modify `src/renderer/main.tsx`: install Electron preload API, HTTP API, or unavailable API.
- Keep `src/renderer/dev-preview-api.ts` only for unit-test fixtures during this plan. Runtime preview should stop importing it.
- Modify `src/renderer/global.d.ts`: allow runtime installation of `window.piDesktop`.
- Modify `package.json`: add `dev:desktop`, update `dev:web`, add `ws`, `tsx`, and `@types/ws`.
- Modify `README.md`: document `pnpm dev:desktop` and `pnpm dev:web` briefly.

---

### Task 1: Add Typed App Transport Contract

**Files:**
- Create: `src/shared/app-transport.ts`
- Create: `tests/shared/app-transport.test.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Write the failing transport schema tests**

Create `tests/shared/app-transport.test.ts`:

```ts
import {
	AppRpcRequestSchema,
	AppRpcResponseSchemas,
	PiSessionEventEnvelopeSchema,
	type AppRpcOperation,
} from "../../src/shared/app-transport";

describe("app transport contract", () => {
	it("validates a project selection RPC request so transports cannot pass loose input", () => {
		const parsed = AppRpcRequestSchema.parse({
			operation: "project.select",
			input: { projectId: "project:/tmp/pi-desktop" },
		});

		expect(parsed).toEqual({
			operation: "project.select",
			input: { projectId: "project:/tmp/pi-desktop" },
		});
	});

	it("rejects a prompt submission without a non-empty prompt", () => {
		const parsed = AppRpcRequestSchema.safeParse({
			operation: "piSession.submit",
			input: { sessionId: "session:one", prompt: "" },
		});

		expect(parsed.success).toBe(false);
	});

	it("parses the response schema for each declared operation", () => {
		const operations = Object.keys(AppRpcResponseSchemas) as AppRpcOperation[];

		expect(operations).toContain("app.getVersion");
		expect(operations).toContain("project.getState");
		expect(operations).toContain("piSession.start");
	});

	it("wraps Pi session events for websocket delivery", () => {
		const parsed = PiSessionEventEnvelopeSchema.parse({
			type: "pi-session:event",
			event: {
				type: "status",
				sessionId: "session:one",
				status: "running",
				label: "Running",
				receivedAt: "2026-05-15T12:00:00.000Z",
			},
		});

		expect(parsed.event.sessionId).toBe("session:one");
	});
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
pnpm vitest run tests/shared/app-transport.test.ts
```

Expected: fail because `src/shared/app-transport.ts` does not exist.

- [ ] **Step 3: Add the transport contract**

Create `src/shared/app-transport.ts`:

```ts
import { z } from "zod";
import {
	AppVersionResultSchema,
	ChatCreateInputSchema,
	ChatSelectionInputSchema,
	PiSessionAbortInputSchema,
	PiSessionActionResultSchema,
	PiSessionDisposeInputSchema,
	PiSessionEventSchema,
	PiSessionStartInputSchema,
	PiSessionStartResultSchema,
	PiSessionSubmitInputSchema,
	ProjectIdInputSchema,
	ProjectPinnedInputSchema,
	ProjectRenameInputSchema,
	ProjectStateViewResultSchema,
} from "./ipc";

export const AppRpcRequestSchema = z.discriminatedUnion("operation", [
	z.strictObject({ operation: z.literal("app.getVersion"), input: z.undefined().optional() }),
	z.strictObject({ operation: z.literal("project.getState"), input: z.undefined().optional() }),
	z.strictObject({ operation: z.literal("project.createFromScratch"), input: z.undefined().optional() }),
	z.strictObject({ operation: z.literal("project.addExistingFolder"), input: z.undefined().optional() }),
	z.strictObject({ operation: z.literal("project.select"), input: ProjectIdInputSchema }),
	z.strictObject({ operation: z.literal("project.rename"), input: ProjectRenameInputSchema }),
	z.strictObject({ operation: z.literal("project.remove"), input: ProjectIdInputSchema }),
	z.strictObject({ operation: z.literal("project.openInFinder"), input: ProjectIdInputSchema }),
	z.strictObject({ operation: z.literal("project.locateFolder"), input: ProjectIdInputSchema }),
	z.strictObject({ operation: z.literal("project.setPinned"), input: ProjectPinnedInputSchema }),
	z.strictObject({ operation: z.literal("project.checkAvailability"), input: ProjectIdInputSchema }),
	z.strictObject({ operation: z.literal("chat.create"), input: ChatCreateInputSchema }),
	z.strictObject({ operation: z.literal("chat.select"), input: ChatSelectionInputSchema }),
	z.strictObject({ operation: z.literal("piSession.start"), input: PiSessionStartInputSchema }),
	z.strictObject({ operation: z.literal("piSession.submit"), input: PiSessionSubmitInputSchema }),
	z.strictObject({ operation: z.literal("piSession.abort"), input: PiSessionAbortInputSchema }),
	z.strictObject({ operation: z.literal("piSession.dispose"), input: PiSessionDisposeInputSchema }),
]);

export const AppRpcResponseSchemas = {
	"app.getVersion": AppVersionResultSchema,
	"project.getState": ProjectStateViewResultSchema,
	"project.createFromScratch": ProjectStateViewResultSchema,
	"project.addExistingFolder": ProjectStateViewResultSchema,
	"project.select": ProjectStateViewResultSchema,
	"project.rename": ProjectStateViewResultSchema,
	"project.remove": ProjectStateViewResultSchema,
	"project.openInFinder": ProjectStateViewResultSchema,
	"project.locateFolder": ProjectStateViewResultSchema,
	"project.setPinned": ProjectStateViewResultSchema,
	"project.checkAvailability": ProjectStateViewResultSchema,
	"chat.create": ProjectStateViewResultSchema,
	"chat.select": ProjectStateViewResultSchema,
	"piSession.start": PiSessionStartResultSchema,
	"piSession.submit": PiSessionActionResultSchema,
	"piSession.abort": PiSessionActionResultSchema,
	"piSession.dispose": PiSessionActionResultSchema,
} as const;

export const PiSessionEventEnvelopeSchema = z.strictObject({
	type: z.literal("pi-session:event"),
	event: PiSessionEventSchema,
});

export type AppRpcRequest = z.infer<typeof AppRpcRequestSchema>;
export type AppRpcOperation = AppRpcRequest["operation"];
export type PiSessionEventEnvelope = z.infer<typeof PiSessionEventEnvelopeSchema>;
```

- [ ] **Step 4: Add shared transport files to coverage**

Modify `vitest.config.ts` coverage include:

```ts
include: [
	"src/shared/**/*.ts",
	"src/renderer/shell/**/*.ts",
	"src/renderer/projects/**/*.ts",
	"src/renderer/chat/**/*.ts",
	"src/main/projects/**/*.ts",
	"src/main/app-backend.ts",
	"src/main/dev-server/**/*.ts",
],
```

- [ ] **Step 5: Run the transport test**

Run:

```bash
pnpm vitest run tests/shared/app-transport.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/app-transport.ts tests/shared/app-transport.test.ts vitest.config.ts
git commit -m "feat(dev): add app transport contract"
```

---

### Task 2: Extract the Transport-Neutral App Backend

**Files:**
- Create: `src/main/app-backend.ts`
- Create: `tests/main/app-backend.test.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Write backend tests for operation handling and event fanout**

Create `tests/main/app-backend.test.ts`:

```ts
import { createAppBackend } from "../../src/main/app-backend";
import type { PiSdkSession } from "../../src/main/pi-session/pi-session-runtime";
import type { ProjectService } from "../../src/main/projects/project-service";
import type { ProjectStateView } from "../../src/shared/project-state";

const emptyState: ProjectStateView = {
	projects: [],
	standaloneChats: [],
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
};

const createProjectService = (): ProjectService => ({
	getState: vi.fn(async () => emptyState),
	createFromScratch: vi.fn(async () => emptyState),
	addExistingFolder: vi.fn(async () => emptyState),
	selectProject: vi.fn(async () => emptyState),
	renameProject: vi.fn(async () => emptyState),
	removeProject: vi.fn(async () => emptyState),
	openProjectInFinder: vi.fn(async () => emptyState),
	locateFolder: vi.fn(async () => emptyState),
	setPinned: vi.fn(async () => emptyState),
	checkAvailability: vi.fn(async () => emptyState),
	getSessionWorkspace: vi.fn(async () => ({
		projectId: "project:one",
		displayName: "one",
		path: "/tmp/one",
	})),
	createChat: vi.fn(async () => emptyState),
	selectChat: vi.fn(async () => emptyState),
});

const createSession = (): PiSdkSession => {
	let listener: ((event: unknown) => void) | undefined;
	return {
		sessionId: "sdk-session:one",
		bindExtensions: vi.fn(async () => undefined),
		prompt: vi.fn(async () => {
			listener?.({ type: "started" });
		}),
		abort: vi.fn(async () => undefined),
		dispose: vi.fn(() => undefined),
		subscribe: vi.fn((nextListener) => {
			listener = nextListener;
			return () => {
				listener = undefined;
			};
		}),
	};
};

describe("app backend", () => {
	it("wraps project operation failures in structured results", async () => {
		const projectService = createProjectService();
		vi.mocked(projectService.getState).mockRejectedValueOnce(new Error("store unavailable"));
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
		});

		const result = await backend.handle({ operation: "project.getState" });

		expect(result).toEqual({
			ok: false,
			error: { code: "project.operation_failed", message: "store unavailable" },
		});
	});

	it("starts a Pi session through the selected workspace and fans out events", async () => {
		const projectService = createProjectService();
		const session = createSession();
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
			createAgentSession: vi.fn(async () => ({ session })),
		});
		const events: unknown[] = [];
		const unsubscribe = backend.onPiSessionEvent((event) => events.push(event));

		const result = await backend.handle({
			operation: "piSession.start",
			input: { projectId: "project:one", prompt: "Hello" },
		});

		unsubscribe();
		expect(result.ok).toBe(true);
		expect(projectService.getSessionWorkspace).toHaveBeenCalledWith({ projectId: "project:one" });
		expect(events).toContainEqual({
			type: "status",
			sessionId: "project:one::sdk-session:one",
			status: "running",
			label: "Running",
			receivedAt: "2026-05-15T12:00:00.000Z",
		});
	});
});
```

- [ ] **Step 2: Run the backend test and confirm it fails**

Run:

```bash
pnpm vitest run tests/main/app-backend.test.ts
```

Expected: fail because `src/main/app-backend.ts` does not exist.

- [ ] **Step 3: Create `AppBackend`**

Create `src/main/app-backend.ts`:

```ts
import {
	PiSessionAbortInputSchema,
	PiSessionDisposeInputSchema,
	PiSessionOperationFailedCode,
	PiSessionStartInputSchema,
	PiSessionSubmitInputSchema,
	ProjectIdInputSchema,
	ProjectPinnedInputSchema,
	ProjectRenameInputSchema,
	ChatCreateInputSchema,
	ChatSelectionInputSchema,
	type AppVersion,
} from "../shared/ipc";
import type { AppRpcRequest } from "../shared/app-transport";
import type { PiSessionEvent } from "../shared/pi-session";
import { err, ok } from "../shared/result";
import { createRuntimeErrorEvent, sanitizeRuntimeErrorMessage } from "./pi-session/pi-session-event-normalizer";
import { createPiSessionRuntime, type PiSdkSession } from "./pi-session/pi-session-runtime";
import type { ProjectService } from "./projects/project-service";

export type AppBackendDeps = {
	appInfo: AppVersion;
	projectService: ProjectService;
	now: () => string;
	createAgentSession?: (input: { workspacePath: string }) => Promise<{ session: PiSdkSession }>;
};

export type AppBackend = {
	handle: (request: AppRpcRequest) => Promise<unknown>;
	onPiSessionEvent: (listener: (event: PiSessionEvent) => void) => () => void;
	dispose: () => Promise<void>;
};

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

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

export const createAppBackend = (deps: AppBackendDeps): AppBackend => {
	const listeners = new Set<(event: PiSessionEvent) => void>();
	const piSessionRuntime = createPiSessionRuntime({
		now: deps.now,
		emit: (event) => {
			for (const listener of listeners) {
				listener(event);
			}
		},
		createAgentSession: deps.createAgentSession,
	});

	return {
		async handle(request) {
			switch (request.operation) {
				case "app.getVersion":
					return ok(deps.appInfo);
				case "project.getState":
					return handleProjectOperation(() => deps.projectService.getState());
				case "project.createFromScratch":
					return handleProjectOperation(() => deps.projectService.createFromScratch());
				case "project.addExistingFolder":
					return handleProjectOperation(() => deps.projectService.addExistingFolder());
				case "project.select":
					return handleProjectOperation(() =>
						deps.projectService.selectProject(ProjectIdInputSchema.parse(request.input)),
					);
				case "project.rename":
					return handleProjectOperation(() =>
						deps.projectService.renameProject(ProjectRenameInputSchema.parse(request.input)),
					);
				case "project.remove":
					return handleProjectOperation(() =>
						deps.projectService.removeProject(ProjectIdInputSchema.parse(request.input)),
					);
				case "project.openInFinder":
					return handleProjectOperation(() =>
						deps.projectService.openProjectInFinder(ProjectIdInputSchema.parse(request.input)),
					);
				case "project.locateFolder":
					return handleProjectOperation(() =>
						deps.projectService.locateFolder(ProjectIdInputSchema.parse(request.input)),
					);
				case "project.setPinned":
					return handleProjectOperation(() =>
						deps.projectService.setPinned(ProjectPinnedInputSchema.parse(request.input)),
					);
				case "project.checkAvailability":
					return handleProjectOperation(() =>
						deps.projectService.checkAvailability(ProjectIdInputSchema.parse(request.input)),
					);
				case "chat.create":
					return handleProjectOperation(() =>
						deps.projectService.createChat(ChatCreateInputSchema.parse(request.input)),
					);
				case "chat.select":
					return handleProjectOperation(() =>
						deps.projectService.selectChat(ChatSelectionInputSchema.parse(request.input)),
					);
				case "piSession.start":
					return handlePiSessionOperation(async () => {
						const parsed = PiSessionStartInputSchema.parse(request.input);
						const workspace = await deps.projectService.getSessionWorkspace({ projectId: parsed.projectId });
						return piSessionRuntime.start({
							projectId: workspace.projectId,
							workspacePath: workspace.path,
							prompt: parsed.prompt,
						});
					});
				case "piSession.submit":
					return handlePiSessionOperation(() =>
						piSessionRuntime.submit(PiSessionSubmitInputSchema.parse(request.input)),
					);
				case "piSession.abort":
					return handlePiSessionOperation(() =>
						piSessionRuntime.abort(PiSessionAbortInputSchema.parse(request.input)),
					);
				case "piSession.dispose":
					return handlePiSessionOperation(() =>
						piSessionRuntime.dispose(PiSessionDisposeInputSchema.parse(request.input)),
					);
			}
		},
		onPiSessionEvent(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		async dispose() {
			await piSessionRuntime.disposeAll();
		},
	};
};
```

Run `pnpm lint`. If Biome flags unused imports, remove them.

- [ ] **Step 4: Wire Electron IPC through `AppBackend`**

Modify `src/main/index.ts`:

```ts
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AppRpcRequestSchema } from "../shared/app-transport";
import { IpcChannels } from "../shared/ipc";
import { createAppBackend, type AppBackend } from "./app-backend";
import { createSmokePiAgentSession } from "./pi-session/smoke-pi-session";
import { initializeGitRepository } from "./projects/git";
import { createProjectService, type ProjectService } from "./projects/project-service";
import { createProjectStore } from "./projects/project-store";
```

Replace the module-level disposer:

```ts
let appBackend: AppBackend | null = null;
```

Inside the window close handler:

```ts
createdWindow.on("closed", () => {
	if (mainWindow === createdWindow) {
		void appBackend?.dispose().catch((error) => {
			console.error("Failed to dispose app backend.", error);
		});
		mainWindow = null;
	}
});
```

Replace `registerIpcHandlers` with:

```ts
const invokeBackend = (operation: AppRpcRequest["operation"], input?: unknown) => {
	if (!appBackend) {
		throw new Error("App backend is not ready.");
	}
	return appBackend.handle(AppRpcRequestSchema.parse({ operation, input }));
};

const registerIpcHandlers = (projectService: ProjectService) => {
	appBackend = createAppBackend({
		appInfo: { name: app.getName(), version: app.getVersion() },
		projectService,
		now: () => new Date().toISOString(),
		createAgentSession: shouldUseSmokePiSession() ? createSmokePiAgentSession : undefined,
	});
	appBackend.onPiSessionEvent((event) => {
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send(IpcChannels.piSessionEvent, event);
		}
	});

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
```

- [ ] **Step 5: Run backend and smoke-focused tests**

Run:

```bash
pnpm vitest run tests/main/app-backend.test.ts tests/main/pi-session-runtime.test.ts tests/shared/ipc.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/main/app-backend.ts src/main/index.ts tests/main/app-backend.test.ts
git commit -m "refactor(dev): route app operations through backend"
```

---

### Task 3: Add the Local Dev HTTP/WebSocket Server

**Files:**
- Create: `src/main/dev-server/local-dev-server.ts`
- Create: `tests/main/local-dev-server.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Add server dependencies**

Run:

```bash
pnpm add ws
pnpm add -D @types/ws tsx
```

Expected: `package.json` and `pnpm-lock.yaml` update.

- [ ] **Step 2: Write the failing local server tests**

Create `tests/main/local-dev-server.test.ts`:

```ts
import WebSocket from "ws";
import { createLocalDevServer } from "../../src/main/dev-server/local-dev-server";
import type { AppBackend } from "../../src/main/app-backend";

const createBackend = (): AppBackend => {
	const listeners = new Set<(event: never) => void>();
	return {
		handle: vi.fn(async (request) => {
			if (request.operation === "app.getVersion") {
				return { ok: true, data: { name: "pi-desktop dev server", version: "dev" } };
			}
			return { ok: false, error: { code: "test.unhandled", message: request.operation } };
		}),
		onPiSessionEvent: vi.fn((listener) => {
			listeners.add(listener as (event: never) => void);
			return () => listeners.delete(listener as (event: never) => void);
		}),
		dispose: vi.fn(async () => undefined),
	};
};

describe("local dev server", () => {
	it("serves typed RPC responses over HTTP", async () => {
		const backend = createBackend();
		const server = await createLocalDevServer({ backend, host: "127.0.0.1", port: 0 });

		try {
			const response = await fetch(`${server.url}/api/rpc`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ operation: "app.getVersion" }),
			});

			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({
				ok: true,
				data: { name: "pi-desktop dev server", version: "dev" },
			});
		} finally {
			await server.close();
		}
	});

	it("returns a structured validation error for invalid RPC input", async () => {
		const backend = createBackend();
		const server = await createLocalDevServer({ backend, host: "127.0.0.1", port: 0 });

		try {
			const response = await fetch(`${server.url}/api/rpc`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ operation: "project.select", input: {} }),
			});

			expect(response.status).toBe(400);
			expect(await response.json()).toEqual({
				ok: false,
				error: {
					code: "dev_server.invalid_request",
					message: "Invalid app RPC request.",
				},
			});
		} finally {
			await server.close();
		}
	});

	it("opens websocket clients for Pi session events", async () => {
		const backend = createBackend();
		const server = await createLocalDevServer({ backend, host: "127.0.0.1", port: 0 });

		try {
			const socket = new WebSocket(server.wsUrl);
			await new Promise<void>((resolve) => socket.once("open", resolve));

			expect(backend.onPiSessionEvent).toHaveBeenCalled();
			socket.close();
		} finally {
			await server.close();
		}
	});
});
```

- [ ] **Step 3: Run the server tests and confirm they fail**

Run:

```bash
pnpm vitest run tests/main/local-dev-server.test.ts
```

Expected: fail because `src/main/dev-server/local-dev-server.ts` does not exist.

- [ ] **Step 4: Implement the local server**

Create `src/main/dev-server/local-dev-server.ts`:

```ts
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer } from "ws";
import { AppRpcRequestSchema, PiSessionEventEnvelopeSchema } from "../../shared/app-transport";
import { err } from "../../shared/result";
import type { AppBackend } from "../app-backend";

export type LocalDevServerOptions = {
	backend: AppBackend;
	host: string;
	port: number;
};

export type LocalDevServer = {
	url: string;
	wsUrl: string;
	close: () => Promise<void>;
};

const readJsonBody = async (request: IncomingMessage): Promise<unknown> =>
	new Promise((resolve, reject) => {
		let body = "";
		request.setEncoding("utf8");
		request.on("data", (chunk) => {
			body += chunk;
		});
		request.on("end", () => {
			try {
				resolve(body.length ? JSON.parse(body) : undefined);
			} catch (error) {
				reject(error);
			}
		});
		request.on("error", reject);
	});

const sendJson = (response: ServerResponse, status: number, data: unknown) => {
	response.writeHead(status, {
		"access-control-allow-origin": "http://127.0.0.1:5173",
		"access-control-allow-methods": "POST, OPTIONS",
		"access-control-allow-headers": "content-type",
		"content-type": "application/json",
	});
	response.end(JSON.stringify(data));
};

export const createLocalDevServer = async ({
	backend,
	host,
	port,
}: LocalDevServerOptions): Promise<LocalDevServer> => {
	const httpServer = createServer(async (request, response) => {
		if (request.method === "OPTIONS") {
			sendJson(response, 204, "");
			return;
		}

		if (request.method !== "POST" || request.url !== "/api/rpc") {
			sendJson(response, 404, err("dev_server.not_found", "Route not found."));
			return;
		}

		let body: unknown;
		try {
			body = await readJsonBody(request);
		} catch {
			sendJson(response, 400, err("dev_server.invalid_json", "Request body must be JSON."));
			return;
		}

		const parsed = AppRpcRequestSchema.safeParse(body);
		if (!parsed.success) {
			sendJson(response, 400, err("dev_server.invalid_request", "Invalid app RPC request."));
			return;
		}

		sendJson(response, 200, await backend.handle(parsed.data));
	});

	const wsServer = new WebSocketServer({ server: httpServer, path: "/api/events" });
	const unsubscribe = backend.onPiSessionEvent((event) => {
		const payload = JSON.stringify(PiSessionEventEnvelopeSchema.parse({ type: "pi-session:event", event }));
		for (const client of wsServer.clients) {
			if (client.readyState === client.OPEN) {
				client.send(payload);
			}
		}
	});

	await new Promise<void>((resolve) => httpServer.listen(port, host, resolve));
	const address = httpServer.address();
	if (!address || typeof address === "string") {
		throw new Error("Local dev server did not expose a TCP address.");
	}

	const baseUrl = `http://${host}:${address.port}`;
	const wsUrl = `ws://${host}:${address.port}/api/events`;

	return {
		url: baseUrl,
		wsUrl,
		close: async () => {
			unsubscribe();
			wsServer.close();
			await new Promise<void>((resolve, reject) => {
				httpServer.close((error) => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
			});
		},
	};
};
```

- [ ] **Step 5: Run the server tests**

Run:

```bash
pnpm vitest run tests/main/local-dev-server.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/main/dev-server/local-dev-server.ts tests/main/local-dev-server.test.ts
git commit -m "feat(dev): add local app bridge server"
```

---

### Task 4: Add the Browser HTTP Client and Bridge-Unavailable API

**Files:**
- Create: `src/renderer/app-api/http-client.ts`
- Create: `src/renderer/app-api/unavailable-api.ts`
- Create: `tests/renderer/http-client.test.ts`
- Create: `tests/renderer/unavailable-api.test.ts`
- Modify: `src/renderer/main.tsx`
- Modify: `src/renderer/global.d.ts`

- [ ] **Step 1: Write failing renderer app API tests**

Create `tests/renderer/http-client.test.ts`:

```ts
import { createHttpPiDesktopApi } from "../../src/renderer/app-api/http-client";

describe("HTTP PiDesktop API client", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("calls typed RPC operations and parses successful responses", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({ ok: true, data: { name: "pi-desktop", version: "dev" } }),
			})),
		);

		const api = createHttpPiDesktopApi({ baseUrl: "http://127.0.0.1:49321" });

		await expect(api.app.getVersion()).resolves.toEqual({
			ok: true,
			data: { name: "pi-desktop", version: "dev" },
		});
		expect(fetch).toHaveBeenCalledWith("http://127.0.0.1:49321/api/rpc", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ operation: "app.getVersion" }),
		});
	});

	it("turns network failure into a visible structured error", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("connection refused");
			}),
		);

		const api = createHttpPiDesktopApi({ baseUrl: "http://127.0.0.1:49321" });

		await expect(api.project.getState()).resolves.toEqual({
			ok: false,
			error: {
				code: "dev_bridge.unavailable",
				message: "Dev data bridge unavailable: connection refused",
			},
		});
	});
});
```

Create `tests/renderer/unavailable-api.test.ts`:

```ts
import { createUnavailablePiDesktopApi } from "../../src/renderer/app-api/unavailable-api";

describe("unavailable PiDesktop API", () => {
	it("returns startup-visible errors when no transport is installed", async () => {
		const api = createUnavailablePiDesktopApi("No app transport configured.");

		await expect(api.app.getVersion()).resolves.toEqual({
			ok: false,
			error: {
				code: "app_transport.unavailable",
				message: "No app transport configured.",
			},
		});
		await expect(api.project.getState()).resolves.toEqual({
			ok: false,
			error: {
				code: "app_transport.unavailable",
				message: "No app transport configured.",
			},
		});
	});
});
```

- [ ] **Step 2: Run the renderer API tests and confirm they fail**

Run:

```bash
pnpm vitest run tests/renderer/http-client.test.ts tests/renderer/unavailable-api.test.ts
```

Expected: fail because the app API files do not exist.

- [ ] **Step 3: Implement the unavailable API**

Create `src/renderer/app-api/unavailable-api.ts`:

```ts
import type { PiDesktopApi } from "../../shared/preload-api";
import { err } from "../../shared/result";

export const createUnavailablePiDesktopApi = (message: string): PiDesktopApi => {
	const unavailable = async () => err("app_transport.unavailable", message);

	return {
		app: { getVersion: unavailable },
		project: {
			getState: unavailable,
			createFromScratch: unavailable,
			addExistingFolder: unavailable,
			select: unavailable,
			rename: unavailable,
			remove: unavailable,
			openInFinder: unavailable,
			locateFolder: unavailable,
			setPinned: unavailable,
			checkAvailability: unavailable,
		},
		chat: {
			create: unavailable,
			select: unavailable,
		},
		piSession: {
			start: unavailable,
			submit: unavailable,
			abort: unavailable,
			dispose: unavailable,
			onEvent: () => () => undefined,
		},
	};
};
```

- [ ] **Step 4: Implement the HTTP client**

Create `src/renderer/app-api/http-client.ts`:

```ts
import { z } from "zod";
import { AppRpcResponseSchemas, PiSessionEventEnvelopeSchema, type AppRpcOperation } from "../../shared/app-transport";
import {
	AppVersionResultSchema,
	PiSessionActionResultSchema,
	PiSessionStartResultSchema,
	ProjectStateViewResultSchema,
} from "../../shared/ipc";
import type {
	ChatCreateInput,
	ChatSelectionInput,
	PiSessionAbortInput,
	PiSessionDisposeInput,
	PiSessionEvent,
	PiSessionStartInput,
	PiSessionSubmitInput,
	ProjectIdInput,
	ProjectPinnedInput,
	ProjectRenameInput,
} from "../../shared/ipc";
import type { PiDesktopApi } from "../../shared/preload-api";
import { err } from "../../shared/result";

type HttpClientOptions = {
	baseUrl: string;
};

const toMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const createHttpPiDesktopApi = ({ baseUrl }: HttpClientOptions): PiDesktopApi => {
	const listeners = new Set<(event: PiSessionEvent) => void>();
	let socket: WebSocket | null = null;

	const call = async <TInput>(
		operation: AppRpcOperation,
		input: TInput | undefined,
		schema: z.ZodType<unknown>,
	) => {
		try {
			const response = await fetch(`${baseUrl}/api/rpc`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(input === undefined ? { operation } : { operation, input }),
			});
			return schema.parse(await response.json());
		} catch (error) {
			return err("dev_bridge.unavailable", `Dev data bridge unavailable: ${toMessage(error)}`);
		}
	};

	const ensureSocket = () => {
		if (socket || listeners.size === 0) {
			return;
		}

		socket = new WebSocket(`${baseUrl.replace(/^http/, "ws")}/api/events`);
		socket.addEventListener("message", (message) => {
			const parsed = PiSessionEventEnvelopeSchema.safeParse(JSON.parse(String(message.data)));
			if (parsed.success) {
				for (const listener of listeners) {
					listener(parsed.data.event);
				}
			}
		});
		socket.addEventListener("close", () => {
			socket = null;
		});
	};

	return {
		app: {
			getVersion: () => call("app.getVersion", undefined, AppVersionResultSchema),
		},
		project: {
			getState: () => call("project.getState", undefined, ProjectStateViewResultSchema),
			createFromScratch: () =>
				call("project.createFromScratch", undefined, ProjectStateViewResultSchema),
			addExistingFolder: () =>
				call("project.addExistingFolder", undefined, ProjectStateViewResultSchema),
			select: (input: ProjectIdInput) => call("project.select", input, ProjectStateViewResultSchema),
			rename: (input: ProjectRenameInput) => call("project.rename", input, ProjectStateViewResultSchema),
			remove: (input: ProjectIdInput) => call("project.remove", input, ProjectStateViewResultSchema),
			openInFinder: (input: ProjectIdInput) =>
				call("project.openInFinder", input, ProjectStateViewResultSchema),
			locateFolder: (input: ProjectIdInput) => call("project.locateFolder", input, ProjectStateViewResultSchema),
			setPinned: (input: ProjectPinnedInput) => call("project.setPinned", input, ProjectStateViewResultSchema),
			checkAvailability: (input: ProjectIdInput) =>
				call("project.checkAvailability", input, ProjectStateViewResultSchema),
		},
		chat: {
			create: (input: ChatCreateInput) => call("chat.create", input, ProjectStateViewResultSchema),
			select: (input: ChatSelectionInput) => call("chat.select", input, ProjectStateViewResultSchema),
		},
		piSession: {
			start: (input: PiSessionStartInput) => call("piSession.start", input, PiSessionStartResultSchema),
			submit: (input: PiSessionSubmitInput) => call("piSession.submit", input, PiSessionActionResultSchema),
			abort: (input: PiSessionAbortInput) => call("piSession.abort", input, PiSessionActionResultSchema),
			dispose: (input: PiSessionDisposeInput) => call("piSession.dispose", input, PiSessionActionResultSchema),
			onEvent: (listener) => {
				listeners.add(listener);
				ensureSocket();
				return () => {
					listeners.delete(listener);
					if (listeners.size === 0) {
						socket?.close();
						socket = null;
					}
				};
			},
		},
	};
};
```

- [ ] **Step 5: Install the correct API at renderer boot**

Modify `src/renderer/global.d.ts`:

```ts
import type { PiDesktopApi } from "../shared/preload-api";

declare global {
	interface Window {
		piDesktop: PiDesktopApi;
	}
}
```

Modify `src/renderer/main.tsx`:

```ts
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createHttpPiDesktopApi } from "./app-api/http-client";
import { createUnavailablePiDesktopApi } from "./app-api/unavailable-api";
import "./styles.css";

if (!("piDesktop" in window)) {
	const bridgeUrl = import.meta.env.VITE_PI_DESKTOP_APP_SERVER_URL;
	Object.defineProperty(window, "piDesktop", {
		configurable: true,
		value:
			typeof bridgeUrl === "string" && bridgeUrl.length > 0
				? createHttpPiDesktopApi({ baseUrl: bridgeUrl })
				: createUnavailablePiDesktopApi("No app transport configured."),
	});
}

const root = document.getElementById("root");

if (!root) {
	throw new Error("Renderer root element was not found");
}

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
```

- [ ] **Step 6: Run the renderer API tests**

Run:

```bash
pnpm vitest run tests/renderer/http-client.test.ts tests/renderer/unavailable-api.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/app-api/http-client.ts src/renderer/app-api/unavailable-api.ts src/renderer/main.tsx src/renderer/global.d.ts tests/renderer/http-client.test.ts tests/renderer/unavailable-api.test.ts
git commit -m "feat(dev): add browser app api client"
```

---

### Task 5: Add the `pnpm dev:web` Runner

**Files:**
- Create: `src/main/dev-server/start-dev-web.ts`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Create the dev web runner**

Create `src/main/dev-server/start-dev-web.ts`:

```ts
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
	server: { host, port: vitePort },
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
```

- [ ] **Step 2: Update scripts**

Modify `package.json` scripts:

```json
"dev": "pnpm dev:desktop",
"dev:desktop": "PNPM_CONFIG_NODE_LINKER=hoisted electron-forge start",
"dev:web": "tsx src/main/dev-server/start-dev-web.ts",
```

- [ ] **Step 3: Document the commands**

Modify `README.md` development section to include:

```md
pnpm dev:desktop
```

Starts the Electron desktop app in development mode.

```md
pnpm dev:web
```

Starts the browser preview and a local app data bridge. The preview uses the same persisted project/chat store and Pi session runtime boundary as the desktop app. Native folder picker operations return a visible unsupported-operation error in web preview.
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add package.json README.md src/main/dev-server/start-dev-web.ts
git commit -m "feat(dev): run web preview with real data bridge"
```

---

### Task 6: Verify Real Web Preview Behavior

**Files:**
- Modify: `tests/renderer/dev-preview-api.test.ts`

- [ ] **Step 1: Stop treating `dev-preview-api` as runtime preview coverage**

Modify `tests/renderer/dev-preview-api.test.ts` `describe` name:

```ts
describe("dev preview fixture API", () => {
```

Keep these tests as fixture coverage for unit tests during this plan.

- [ ] **Step 2: Run targeted unit tests**

Run:

```bash
pnpm vitest run tests/renderer/dev-preview-api.test.ts tests/renderer/unavailable-api.test.ts
```

Expected: pass.

- [ ] **Step 3: Manually verify `pnpm dev:web`**

Run:

```bash
PI_DESKTOP_SMOKE_PI_SESSION=1 pnpm dev:web
```

Expected terminal output includes:

```text
Local app data bridge: http://127.0.0.1:
```

Open `http://127.0.0.1:5173/`. Expected UI:

- The sidebar shows real persisted projects from `.pi-desktop-dev/project-store.json` or the configured `PI_DESKTOP_USER_DATA_DIR`.
- New chat creation updates the displayed state.
- A prompt in an available project streams `Pi session streaming is connected.` when `PI_DESKTOP_SMOKE_PI_SESSION=1`.

Stop the server with `Ctrl-C`.

- [ ] **Step 4: Commit**

```bash
git add tests/renderer/dev-preview-api.test.ts
git commit -m "test(dev): rename preview fixture coverage"
```

---

### Task 7: Final Verification

**Files:**
- No planned source edits.

- [ ] **Step 1: Run all checks**

Run:

```bash
pnpm check
```

Expected: format, lint, typecheck, unit coverage, and smoke tests pass.

- [ ] **Step 2: Inspect final git state**

Run:

```bash
git status --short
git log --oneline -5
```

Expected: no unstaged changes except any intentional plan/document updates. Latest commits should correspond to the task commits above.

- [ ] **Step 3: Push the branch when requested**

Run only when the user asks to push:

```bash
git push
```

Expected: branch updates the existing pull request.
