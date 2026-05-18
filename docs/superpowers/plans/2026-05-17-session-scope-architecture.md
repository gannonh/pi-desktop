# Session Scope Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Desktop project chat rows match Pi CLI current-folder resume while making sidebar `CHATS` a Desktop-owned quick-start workspace.

**Architecture:** Keep pinned projects in the Desktop project store. Derive each project's chat rows from Pi `SessionManager.list(project.path)`. Derive `CHATS` rows only from a Desktop quick-start workspace path and add a dedicated standalone chat creation path that uses that workspace as cwd.

**Tech Stack:** Electron main/preload IPC, React renderer, Pi TypeScript SDK `SessionManager`, Zod shared contracts, Vitest, Playwright smoke tests.

---

## File Map

- Modify `src/main/app-paths.ts`: add a Desktop quick-start workspace resolver.
- Modify `src/main/projects/project-service.ts`: add `desktopChatsPath`, rebuild standalone chats from that path only, create standalone draft chats, start projectless sessions in the quick-start workspace, and stop using all-folder session listing for sidebar `CHATS`.
- Modify `src/main/index.ts`: pass the quick-start workspace path and register standalone chat creation IPC.
- Modify `src/main/dev-server/start-dev-web.ts`: pass the quick-start workspace path and wire dev-web standalone chat creation.
- Modify `src/shared/ipc.ts`: add `chat:createStandalone` channel, schemas, and types.
- Modify `src/shared/app-transport.ts`: add RPC operation and response schema for `chat.createStandalone`.
- Modify `src/shared/preload-api.ts`: expose `window.piDesktop.chat.createStandalone()`.
- Modify `src/preload/index.ts`: invoke the new IPC channel.
- Modify `src/renderer/app-api/http-client.ts`: call the new RPC operation in dev-web.
- Modify `src/renderer/app-api/unavailable-api.ts`: add unavailable implementation.
- Modify `src/renderer/components/project-sidebar.tsx`: enable the `CHATS` section new-chat button and call `chat.createStandalone()`.
- Modify `src/renderer/dev-preview-api.ts`: model quick-start standalone chat creation in preview.
- Modify `src/main/sessions/pi-session-index.ts`: remove standalone/all-folder filtering from sidebar indexing if it becomes unused.
- Modify tests under `tests/main`, `tests/shared`, `tests/renderer`, and `tests/smoke`: encode the new scopes.
- Modify `docs/superpowers/specs/2026-05-12-pi-desktop-high-level-roadmap.md`: update M04 wording after implementation if behavior changes from existing roadmap text.

---

### Task 1: Add Desktop quick-start workspace path

**Files:**
- Modify: `src/main/app-paths.ts`
- Test: `tests/main/app-paths.test.ts`

- [ ] **Step 1: Write failing path resolver tests**

Add these tests to `tests/main/app-paths.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	resolveDesktopChatsPath,
	resolveElectronDevUserDataDir,
	resolvePiAgentDir,
	resolvePiSessionFilesDirForCwd,
	resolvePiSessionFilesRoot,
	resolveProjectStorePath,
} from "../../src/main/app-paths";

describe("resolveDesktopChatsPath", () => {
	it("uses an explicit Desktop quick-start chat directory when configured", () => {
		expect(
			resolveDesktopChatsPath({
				env: { PI_DESKTOP_CHATS_DIR: "~/pi-desktop-chats" },
				defaultUserDataDir: "/Users/gannonhall/Library/Application Support/pi-desktop",
				homeDir: "/Users/gannonhall",
			}),
		).toBe("/Users/gannonhall/pi-desktop-chats");
	});

	it("places Desktop quick-start chats under app user data by default", () => {
		expect(
			resolveDesktopChatsPath({
				env: {},
				defaultUserDataDir: "/Users/gannonhall/Library/Application Support/pi-desktop",
				homeDir: "/Users/gannonhall",
			}),
		).toBe("/Users/gannonhall/Library/Application Support/pi-desktop/desktop-chats");
	});
});
```

If the file already imports from `app-paths`, merge the import list rather than duplicating it.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm vitest run tests/main/app-paths.test.ts
```

Expected: fail with `resolveDesktopChatsPath` not exported.

- [ ] **Step 3: Implement the resolver**

Add this export to `src/main/app-paths.ts` after `resolveProjectStorePath`:

```ts
export const resolveDesktopChatsPath = ({
	env = process.env,
	defaultUserDataDir,
	homeDir = homedir(),
}: {
	env?: NodeJS.ProcessEnv;
	defaultUserDataDir: string;
	homeDir?: string;
}): string => {
	const configuredPath = env.PI_DESKTOP_CHATS_DIR
		? expandTildePath(env.PI_DESKTOP_CHATS_DIR, homeDir)
		: path.join(defaultUserDataDir, "desktop-chats");

	return configuredPath;
};
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
pnpm vitest run tests/main/app-paths.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/main/app-paths.ts tests/main/app-paths.test.ts
git commit -m "feat: add desktop chats workspace path"
```

---

### Task 2: Re-scope project service session loading

**Files:**
- Modify: `src/main/projects/project-service.ts`
- Modify: `src/main/index.ts`
- Modify: `src/main/dev-server/start-dev-web.ts`
- Modify: `src/main/sessions/pi-session-index.ts`
- Test: `tests/main/project-service.test.ts`
- Test: `tests/main/pi-session-index.test.ts`

- [ ] **Step 1: Write failing project service scope tests**

In `tests/main/project-service.test.ts`, update the helper type near `createService` so it accepts `desktopChatsPath`:

```ts
const createService = async (
	options: {
		initialStore?: ProjectStore;
		documentsDir?: string;
		desktopChatsPath?: string;
		listProjectSessions?: ProjectServiceDeps["listProjectSessions"];
		writeSessionName?: ProjectServiceDeps["writeSessionName"];
		forkSession?: ProjectServiceDeps["forkSession"];
		cloneSession?: ProjectServiceDeps["cloneSession"];
		branchSession?: ProjectServiceDeps["branchSession"];
		openFolderDialog?: ProjectServiceDeps["openFolderDialog"];
		openInFinder?: ProjectServiceDeps["openInFinder"];
		initializeGitRepository?: ProjectServiceDeps["initializeGitRepository"];
	} = {},
) => {
	const listProjectSessions = vi.fn(options.listProjectSessions ?? (async () => []));
	const memoryStore = createMemoryProjectStore(options.initialStore ?? createEmptyProjectStore());
	const documentsDir = options.documentsDir ?? join(await mkdtemp(join(tmpdir(), "pi-documents-")), "Documents");
	const desktopChatsPath = options.desktopChatsPath ?? join(await mkdtemp(join(tmpdir(), "pi-desktop-chats-")), "desktop-chats");
	// keep the existing helper body, and pass desktopChatsPath into createProjectService
};
```

Then add this test near the existing session-loading tests:

```ts
it("loads sidebar CHATS only from the Desktop quick-start workspace", async () => {
	const projectPath = await mkdtemp(join(tmpdir(), "pi-tracked-"));
	const desktopChatsPath = await mkdtemp(join(tmpdir(), "pi-desktop-chats-"));
	const outsidePath = await mkdtemp(join(tmpdir(), "pi-outside-"));
	const project = createProject(projectPath);
	const projectSession = createSessionInfo({
		path: join(projectPath, "project.jsonl"),
		id: "project-session",
		cwd: projectPath,
		name: "Project session",
	});
	const quickStartSession = createSessionInfo({
		path: join(desktopChatsPath, "quick.jsonl"),
		id: "quick-start",
		cwd: desktopChatsPath,
		name: "Quick start",
	});
	const outsideSession = createSessionInfo({
		path: join(outsidePath, "outside.jsonl"),
		id: "outside",
		cwd: outsidePath,
		name: "Outside",
	});
	const listProjectSessions = vi.fn(async (cwd: string) => {
		if (cwd === projectPath) {
			return [projectSession];
		}
		if (cwd === desktopChatsPath) {
			return [quickStartSession];
		}
		return [outsideSession];
	});
	const { service } = await createService({
		initialStore: {
			...createEmptyProjectStore(),
			projects: [project],
			selectedProjectId: project.id,
		},
		desktopChatsPath,
		listProjectSessions,
	});

	const view = await service.getState();

	expect(listProjectSessions).toHaveBeenCalledWith(projectPath);
	expect(listProjectSessions).toHaveBeenCalledWith(desktopChatsPath);
	expect(view.selectedProject?.chats.map((chat) => chat.title)).toEqual(["Project session"]);
	expect(view.standaloneChats.map((chat) => chat.title)).toEqual(["Quick start"]);
	expect(view.standaloneChats.map((chat) => chat.title)).not.toContain("Outside");
});
```

Replace the old test named `loads standalone chats from Pi sessions outside tracked projects` with this expectation. If a helper named `createSessionInfo` does not exist in the file, add a local helper above the session tests:

```ts
const createSessionInfo = (overrides: Partial<SessionInfo> = {}): SessionInfo => ({
	path: "/tmp/pi-sessions/session.jsonl",
	id: "session",
	cwd: "/tmp/pi",
	name: undefined,
	parentSessionPath: undefined,
	created: new Date("2026-05-12T08:00:00.000Z"),
	modified: new Date("2026-05-12T09:00:00.000Z"),
	messageCount: 2,
	firstMessage: "Session title",
	allMessagesText: "Session title",
	...overrides,
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm vitest run tests/main/project-service.test.ts
```

Expected: fail because `desktopChatsPath` is not part of `ProjectServiceDeps` and `refreshSessionChats` still uses all-folder listing semantics.

- [ ] **Step 3: Change project service dependencies**

In `src/main/projects/project-service.ts`, update `ProjectServiceDeps`:

```ts
export type ProjectServiceDeps = {
	store: ProjectStoreFile;
	documentsDir: string;
	desktopChatsPath: string;
	now: () => string;
	openFolderDialog: () => Promise<string | null>;
	openInFinder: (path: string) => Promise<unknown>;
	initializeGitRepository: (projectPath: string) => Promise<void>;
	listProjectSessions: (cwd: string) => Promise<SessionInfo[]>;
	writeSessionName: (sessionPath: string, name: string) => Promise<void>;
	forkSession: (sourcePath: string, targetCwd: string) => Promise<string>;
	cloneSession: (sourcePath: string, targetCwd: string) => Promise<string>;
	branchSession: (sourcePath: string, targetCwd: string, entryId: string) => Promise<string>;
};
```

Remove `listAllSessions` from the type and from service construction.

- [ ] **Step 4: Replace standalone refresh logic**

In `refreshSessionChats`, replace the standalone session block with:

```ts
const standaloneSessions = await deps.listProjectSessions(deps.desktopChatsPath);
const standaloneChats = standaloneSessions.map((session) => {
	const ui = nextStore.sessionUiByPath[session.path];
	const base = createStandaloneChatFromSessionInfo({
		session,
		status: ui?.status ?? "idle",
		attention: ui?.attention ?? false,
		lastOpenedAt: ui?.lastOpenedAt ?? null,
	});
	return ui ? { ...base, id: ui.chatId } : base;
});
const seenStandaloneSessionPaths = new Set(standaloneChats.map((chat) => chat.sessionPath));
const drafts = nextStore.standaloneChats.filter(
	(chat) => chat.source === "draft" && !seenStandaloneSessionPaths.has(chat.sessionPath),
);
nextStore.standaloneChats = [...standaloneChats, ...drafts];
```

Remove calls to `filterStandaloneSessionInfos`, `listAllSessions`, `trackedProjectPaths`, and `trackedProjectCwds` from `refreshSessionChats` if they become unused.

- [ ] **Step 5: Simplify prune logic**

Replace `pruneStandaloneChatsForTrackedProjects` with a selection-only guard:

```ts
const pruneMissingStandaloneSelection = (store: ProjectStore) => {
	if (
		store.selectedProjectId === null &&
		store.selectedChatId !== null &&
		!store.standaloneChats.some((chat) => chat.id === store.selectedChatId)
	) {
		store.selectedChatId = null;
	}
};
```

Update `saveAndView` to call `pruneMissingStandaloneSelection(store)`.

- [ ] **Step 6: Update app construction**

In `src/main/index.ts`, import `resolveDesktopChatsPath` and update service creation:

```ts
const getDesktopChatsPath = () =>
	resolveDesktopChatsPath({ env: process.env, defaultUserDataDir: app.getPath("userData") });
```

Pass `desktopChatsPath: getDesktopChatsPath()` into `createProjectService`. Remove `listAllSessions` from the dependency object.

In `src/main/dev-server/start-dev-web.ts`, import `resolveDesktopChatsPath` and compute:

```ts
const userDataDir = resolveDevWebUserDataDir(env);
const desktopChatsPath = resolveDesktopChatsPath({ env, defaultUserDataDir: userDataDir });
const projectStorePath = resolveProjectStorePath({
	env,
	defaultUserDataDir: userDataDir,
});
```

Pass `desktopChatsPath` into `createProjectService` and remove `listAllSessions`.

- [ ] **Step 7: Remove unused all-folder helper from sidebar indexing**

If no code uses `filterStandaloneSessionInfos`, remove it from `src/main/sessions/pi-session-index.ts` and delete its test from `tests/main/pi-session-index.test.ts`.

Keep `PiSessionLister.listAll` only if another runtime path still uses it. If no production code uses it after this task, remove `listAll` and its tests. If smoke or future tests still call it directly, keep the method but do not call it from project service.

- [ ] **Step 8: Run focused tests**

Run:

```bash
pnpm vitest run tests/main/project-service.test.ts tests/main/pi-session-index.test.ts tests/main/app-paths.test.ts
```

Expected: pass.

- [ ] **Step 9: Commit**

```bash
git add src/main/projects/project-service.ts src/main/index.ts src/main/dev-server/start-dev-web.ts src/main/sessions/pi-session-index.ts tests/main/project-service.test.ts tests/main/pi-session-index.test.ts tests/main/app-paths.test.ts
git commit -m "fix: scope sidebar chats to desktop workspace"
```

---

### Task 3: Add standalone quick-start chat creation

**Files:**
- Modify: `src/shared/ipc.ts`
- Modify: `src/shared/app-transport.ts`
- Modify: `src/shared/preload-api.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/app-api/http-client.ts`
- Modify: `src/renderer/app-api/unavailable-api.ts`
- Modify: `src/main/app-backend.ts`
- Modify: `src/main/projects/project-service.ts`
- Modify: `src/main/index.ts`
- Test: `tests/shared/ipc.test.ts`
- Test: `tests/shared/app-transport.test.ts`
- Test: `tests/main/app-backend.test.ts`
- Test: `tests/main/project-service.test.ts`

- [ ] **Step 1: Write failing shared contract tests**

In `tests/shared/ipc.test.ts`, update the channel assertion to include:

```ts
chatCreateStandalone: "chat:createStandalone",
```

In the exported schema test, assert the new input shape:

```ts
expect(ChatStandaloneCreateInputSchema.parse({})).toEqual({});
expect(() => ChatStandaloneCreateInputSchema.parse({ projectId: "project:/tmp/pi" })).toThrow();
```

In `tests/shared/app-transport.test.ts`, add:

```ts
expect(
	AppRpcRequestSchema.parse({
		operation: "chat.createStandalone",
		input: {},
	}),
).toEqual({
	operation: "chat.createStandalone",
	input: {},
});
```

- [ ] **Step 2: Run contract tests and verify failure**

Run:

```bash
pnpm vitest run tests/shared/ipc.test.ts tests/shared/app-transport.test.ts
```

Expected: fail because `ChatStandaloneCreateInputSchema` and `chat.createStandalone` do not exist.

- [ ] **Step 3: Add shared IPC contract**

In `src/shared/ipc.ts`, add:

```ts
chatCreateStandalone: "chat:createStandalone",
```

Add schema:

```ts
export const ChatStandaloneCreateInputSchema = z.strictObject({});
```

Export type:

```ts
export type ChatStandaloneCreateInput = z.infer<typeof ChatStandaloneCreateInputSchema>;
```

Add `ChatStandaloneCreateInputSchema` to the export block.

In `src/shared/app-transport.ts`, import `ChatStandaloneCreateInputSchema`, add request branch:

```ts
z.strictObject({ operation: z.literal("chat.createStandalone"), input: ChatStandaloneCreateInputSchema }),
```

Add response mapping:

```ts
"chat.createStandalone": ProjectStateViewResultSchema,
```

- [ ] **Step 4: Add API surfaces**

In `src/shared/preload-api.ts`, import `ChatStandaloneCreateInput` and add:

```ts
createStandalone: (input: ChatStandaloneCreateInput) => Promise<ProjectStateViewResult>;
```

In `src/preload/index.ts`, add:

```ts
createStandalone: async (input) =>
	safeInvokeParse(IpcChannels.chatCreateStandalone, ProjectStateViewResultSchema, input),
```

In `src/renderer/app-api/http-client.ts`, add:

```ts
createStandalone: (input) => callRpc("chat.createStandalone", input),
```

In `src/renderer/app-api/unavailable-api.ts`, add:

```ts
createStandalone: unavailable,
```

- [ ] **Step 5: Write failing service and backend tests**

In `tests/main/project-service.test.ts`, add:

```ts
it("creates a Desktop quick-start draft chat in the desktop chats workspace", async () => {
	const desktopChatsPath = await mkdtemp(join(tmpdir(), "pi-desktop-chats-"));
	const { memoryStore, service } = await createService({ desktopChatsPath });

	const view = await service.createStandaloneChat({});

	expect(view.selectedProjectId).toBeNull();
	expect(view.selectedChat?.cwd).toBe(desktopChatsPath);
	expect(view.selectedChat?.source).toBe("draft");
	expect(memoryStore.read().standaloneChats[0]).toEqual(expect.objectContaining({
		cwd: desktopChatsPath,
		source: "draft",
		title: "New chat",
	}));
});
```

Add another test near `getSessionStartTarget` coverage:

```ts
it("starts projectless draft chats in the Desktop quick-start workspace", async () => {
	const desktopChatsPath = await mkdtemp(join(tmpdir(), "pi-desktop-chats-"));
	const { service } = await createService({ desktopChatsPath });
	const view = await service.createStandaloneChat({});
	const chatId = view.selectedChatId;
	if (!chatId) {
		throw new Error("Expected selected quick-start chat.");
	}

	await expect(service.getSessionStartTarget({ projectId: null, chatId })).resolves.toEqual({
		projectId: null,
		chatId,
		workspacePath: desktopChatsPath,
		sessionPath: null,
	});
});
```

In `tests/main/app-backend.test.ts`, add:

```ts
it("routes chat.createStandalone to the project service", async () => {
	const projectService = createProjectService();
	const backend = createAppBackend({
		appInfo: { name: "pi-desktop", version: "dev" },
		projectService,
		now: () => "2026-05-15T12:00:00.000Z",
	});

	const result = await backend.handle({ operation: "chat.createStandalone", input: {} });

	expect(result).toEqual({ ok: true, data: emptyState });
	expect(projectService.createStandaloneChat).toHaveBeenCalledWith({});
});
```

Update the local `createProjectService` test double in `tests/main/app-backend.test.ts` to include:

```ts
createStandaloneChat: vi.fn(async () => emptyState),
```

- [ ] **Step 6: Run focused tests and verify failure**

Run:

```bash
pnpm vitest run tests/main/project-service.test.ts tests/main/app-backend.test.ts tests/shared/ipc.test.ts tests/shared/app-transport.test.ts
```

Expected: fail because service/backend methods are missing.

- [ ] **Step 7: Implement service method**

In `src/main/projects/project-service.ts`, add to `ProjectService`:

```ts
createStandaloneChat: (input: ChatStandaloneCreateInput) => Promise<ProjectStateView>;
```

Import `ChatStandaloneCreateInput` from `../../shared/ipc`.

Implement the method:

```ts
async createStandaloneChat() {
	return runSerialized(async () => {
		await mkdir(deps.desktopChatsPath, { recursive: true });
		const store = await deps.store.load();
		const now = deps.now();
		const existingChats = store.standaloneChats;
		const chat: StandaloneChatMetadata = {
			id: createChatId(now, existingChats),
			source: "draft",
			sessionId: null,
			sessionPath: null,
			cwd: deps.desktopChatsPath,
			title: "New chat",
			status: "idle",
			attention: false,
			createdAt: now,
			updatedAt: now,
			lastOpenedAt: now,
		};

		store.standaloneChats = [...existingChats, chat];
		store.selectedProjectId = null;
		store.selectedChatId = chat.id;

		return saveAndView(deps.store, store);
	});
},
```

Update `recordSessionStarted` so projectless drafts are removed once the Pi session file exists:

```ts
if (input.projectId === null && input.chatId !== null) {
	store.standaloneChats = store.standaloneChats.filter(
		(chat) => chat.id !== input.chatId || chat.source !== "draft",
	);
}
```

Place it after the existing project draft removal block.

- [ ] **Step 8: Implement backend route and native IPC handler**

In `src/main/app-backend.ts`, import `ChatStandaloneCreateInputSchema` and add switch branch:

```ts
case "chat.createStandalone":
	return handleProjectOperation(() =>
		deps.projectService.createStandaloneChat(ChatStandaloneCreateInputSchema.parse(request.input)),
	);
```

In `src/main/index.ts`, register:

```ts
ipcMain.handle(IpcChannels.chatCreateStandalone, (_event, input) => invokeBackend("chat.createStandalone", input));
```

- [ ] **Step 9: Run focused tests and verify pass**

Run:

```bash
pnpm vitest run tests/main/project-service.test.ts tests/main/app-backend.test.ts tests/shared/ipc.test.ts tests/shared/app-transport.test.ts
```

Expected: pass.

- [ ] **Step 10: Commit**

```bash
git add src/shared/ipc.ts src/shared/app-transport.ts src/shared/preload-api.ts src/preload/index.ts src/renderer/app-api/http-client.ts src/renderer/app-api/unavailable-api.ts src/main/app-backend.ts src/main/projects/project-service.ts src/main/index.ts tests/shared/ipc.test.ts tests/shared/app-transport.test.ts tests/main/app-backend.test.ts tests/main/project-service.test.ts
git commit -m "feat: add desktop quick-start chat creation"
```

---

### Task 4: Wire quick-start creation into renderer and preview data

**Files:**
- Modify: `src/renderer/components/project-sidebar.tsx`
- Modify: `src/renderer/dev-preview-api.ts`
- Test: `tests/renderer/project-sidebar.test.ts`
- Test: `tests/renderer/dev-preview-api.test.ts`

- [ ] **Step 1: Write failing renderer tests**

In `tests/renderer/project-sidebar.test.ts`, add a test that renders `ProjectSidebar` and asserts the `CHATS` new button is enabled:

```ts
it("enables the CHATS new-chat button for Desktop quick-start chats", () => {
	const markup = renderToStaticMarkup(
		createElement(ProjectSidebar, {
			state: createProjectState({ projects: [], standaloneChats: [] }),
			statusMessage: undefined,
			onProjectState: vi.fn(),
		}),
	);

	expect(markup).toContain('aria-label="New quick-start chat"');
	expect(markup).not.toContain('aria-label="New quick-start chat" disabled=""');
});
```

If `createProjectState` is not available in this test file, add:

```ts
const createProjectState = (overrides: Partial<ProjectStateView> = {}): ProjectStateView => ({
	projects: [],
	standaloneChats: [],
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
	...overrides,
});
```

In `tests/renderer/dev-preview-api.test.ts`, add:

```ts
it("creates a quick-start standalone chat in preview mode", async () => {
	installDevPreviewApi();
	const api = window.piDesktop;

	const result = await api.chat.createStandalone({});

	expect(result.ok).toBe(true);
	if (!result.ok) {
		throw new Error("Expected quick-start chat creation to succeed.");
	}
	expect(result.data.selectedProjectId).toBeNull();
	expect(result.data.selectedChat?.source).toBe("draft");
	expect(result.data.selectedChat?.cwd).toContain("desktop-chats");
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run:

```bash
pnpm vitest run tests/renderer/project-sidebar.test.ts tests/renderer/dev-preview-api.test.ts
```

Expected: fail because the button is disabled and preview API lacks `createStandalone`.

- [ ] **Step 3: Enable the CHATS new button**

In `src/renderer/components/project-sidebar.tsx`, replace the disabled CHATS heading button with:

```tsx
<button
	className="project-sidebar__heading-button"
	type="button"
	aria-label="New quick-start chat"
	onClick={() => {
		void runProjectAction(() => window.piDesktop.chat.createStandalone({}));
	}}
>
	<SquarePen className="project-sidebar__icon" />
</button>
```

Use the existing `runProjectAction` function from the component scope.

- [ ] **Step 4: Update preview API**

In `src/renderer/dev-preview-api.ts`, add a `previewDesktopChatsPath` constant:

```ts
const previewDesktopChatsPath = `${previewRoot}/desktop-chats`;
```

Add `createStandalone` to `chat` API:

```ts
createStandalone: async () => {
	const updatedAt = new Date().toISOString();
	const nextChat = standaloneChat(`chat:quick-start:${updatedAt}`, "New chat", updatedAt);
	const chatWithWorkspace = { ...nextChat, cwd: previewDesktopChatsPath };
	standaloneChats.unshift(chatWithWorkspace);
	store.selectedProjectId = null;
	store.selectedChatId = chatWithWorkspace.id;
	return ok();
},
```

- [ ] **Step 5: Run focused tests and verify pass**

Run:

```bash
pnpm vitest run tests/renderer/project-sidebar.test.ts tests/renderer/dev-preview-api.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/project-sidebar.tsx src/renderer/dev-preview-api.ts tests/renderer/project-sidebar.test.ts tests/renderer/dev-preview-api.test.ts
git commit -m "feat: enable desktop quick-start chats"
```

---

### Task 5: Preserve persisted message hydration across both scopes

**Files:**
- Modify: `src/main/pi-session/pi-session-history.ts`
- Modify: `src/main/app-backend.ts`
- Test: `tests/main/pi-session-history.test.ts`
- Test: `tests/main/app-backend.test.ts`
- Test: `tests/renderer/session-state.test.ts`

- [ ] **Step 1: Add regression coverage for quick-start history**

In `tests/main/app-backend.test.ts`, extend the existing `loads persisted Pi session history for a selected chat` test or add this separate test:

```ts
it("loads persisted Pi session history for a quick-start chat", async () => {
	const projectService = createProjectService();
	vi.mocked(projectService.getSessionStartTarget).mockResolvedValueOnce({
		projectId: null,
		chatId: "chat:quick",
		workspacePath: "/tmp/desktop-chats",
		sessionPath: "/tmp/desktop-chats/quick.jsonl",
	});
	const loadSessionHistory = vi.fn(() => ({
		sessionId: "standalone:sdk-session:quick",
		status: "idle" as const,
		statusLabel: "Idle",
		messages: [{ id: "user:quick", role: "user" as const, content: "side discussion", streaming: false }],
	}));
	const backend = createAppBackend({
		appInfo: { name: "pi-desktop", version: "dev" },
		projectService,
		now: () => "2026-05-15T12:00:00.000Z",
		loadSessionHistory,
	});

	const result = await backend.handle({
		operation: "piSession.history",
		input: { projectId: null, chatId: "chat:quick" },
	});

	expect(projectService.getSessionStartTarget).toHaveBeenCalledWith({ projectId: null, chatId: "chat:quick" });
	expect(loadSessionHistory).toHaveBeenCalledWith({
		projectId: null,
		workspacePath: "/tmp/desktop-chats",
		sessionPath: "/tmp/desktop-chats/quick.jsonl",
		env: undefined,
	});
	expect(result).toEqual({
		ok: true,
		data: {
			sessionId: "standalone:sdk-session:quick",
			status: "idle",
			statusLabel: "Idle",
			messages: [{ id: "user:quick", role: "user", content: "side discussion", streaming: false }],
		},
	});
});
```

- [ ] **Step 2: Run focused history tests**

Run:

```bash
pnpm vitest run tests/main/pi-session-history.test.ts tests/main/app-backend.test.ts tests/renderer/session-state.test.ts
```

Expected: pass. If it fails because projectless history passes the wrong `projectId`, fix `piSession.history` in `src/main/app-backend.ts` so it forwards `target.projectId` exactly, including `null`.

- [ ] **Step 3: Commit if code changed**

If code changed:

```bash
git add src/main/app-backend.ts src/main/pi-session/pi-session-history.ts tests/main/app-backend.test.ts tests/main/pi-session-history.test.ts tests/renderer/session-state.test.ts
git commit -m "test: cover quick-start session history"
```

If only tests changed and pass:

```bash
git add tests/main/app-backend.test.ts tests/main/pi-session-history.test.ts tests/renderer/session-state.test.ts
git commit -m "test: cover quick-start session history"
```

---

### Task 6: Update smoke coverage and documentation

**Files:**
- Modify: `tests/smoke/app.spec.ts`
- Modify: `tests/smoke/dev-web.spec.ts`
- Modify: `docs/superpowers/specs/2026-05-12-pi-desktop-high-level-roadmap.md`
- Modify: `docs/superpowers/plans/2026-05-16-m04-project-session-management.md`
- Test: `tests/smoke/app.spec.ts`
- Test: `tests/smoke/dev-web.spec.ts`

- [ ] **Step 1: Add smoke expectations for session scopes**

In `tests/smoke/app.spec.ts`, add or update smoke assertions to verify:

```ts
await expect(page.getByText("PROJECTS")).toBeVisible();
await expect(page.getByText("CHATS")).toBeVisible();
await expect(page.getByRole("button", { name: "New quick-start chat" })).toBeVisible();
await expect(page.getByRole("button", { name: "New quick-start chat" })).toBeEnabled();
```

If the smoke fixture seeds project sessions, assert project session names appear under the pinned project and do not appear in the `CHATS` section. Use existing locators in the file and prefer accessible names over CSS selectors.

In `tests/smoke/dev-web.spec.ts`, assert the same enabled quick-start button for the web preview path.

- [ ] **Step 2: Run smoke tests and verify failures or pass**

Run:

```bash
pnpm test:smoke
```

Expected: pass after renderer and backend wiring. If smoke seed data still assumes `CHATS` is all-folder scope, update the seed to use the Desktop quick-start workspace only.

- [ ] **Step 3: Update docs**

In `docs/superpowers/specs/2026-05-12-pi-desktop-high-level-roadmap.md`, update M04 session-management wording to state:

```md
- Project rows are pinned Desktop folders. Project chat rows mirror Pi CLI current-folder resume for that folder.
- Sidebar CHATS is a Desktop quick-start workspace, not Pi CLI all-folder resume.
```

In `docs/superpowers/plans/2026-05-16-m04-project-session-management.md`, add a short closeout note:

```md
## Session Scope Correction

M04 now treats `PROJECTS` as Desktop-pinned folders and treats each project's chat rows as Pi current-folder sessions. Sidebar `CHATS` is scoped to the Desktop quick-start workspace rather than all sessions outside pinned projects.
```

- [ ] **Step 4: Run docs and smoke verification**

Run:

```bash
pnpm format:check
pnpm test:smoke
```

Expected: format check passes and smoke tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/smoke/app.spec.ts tests/smoke/dev-web.spec.ts docs/superpowers/specs/2026-05-12-pi-desktop-high-level-roadmap.md docs/superpowers/plans/2026-05-16-m04-project-session-management.md
git commit -m "test: verify desktop session scopes"
```

---

### Task 7: Final verification and UAT evidence

**Files:**
- Create: `uat-evidence/session-scopes-<timestamp>/evidence.md`
- Create: `uat-evidence/session-scopes-<timestamp>/screenshots/*.png`

- [ ] **Step 1: Run full deterministic checks**

Run:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm format:check
pnpm test:smoke
```

Expected:

- `pnpm typecheck` passes.
- `pnpm test` passes.
- `pnpm lint` passes, allowing only the existing Biome schema-version info if it still appears.
- `pnpm format:check` passes.
- `pnpm test:smoke` passes.

- [ ] **Step 2: Capture manual comparison evidence**

Create an evidence directory:

```bash
mkdir -p uat-evidence/session-scopes-$(date +%Y%m%d-%H%M%S)/screenshots
```

Run the app:

```bash
pnpm dev:desktop
```

Capture screenshots proving:

1. Pi CLI `/resume` current-folder list for `/Volumes/EVO/dev/pi-desktop`.
2. Desktop `pi-desktop` project chat rows match the CLI current-folder session titles.
3. Desktop `CHATS` does not contain those project session titles.
4. Desktop `CHATS` new button creates a quick-start draft and can start a session.

Use `agent_browser` or the existing Playwright Electron capture harness if available. Save artifacts under the evidence directory.

- [ ] **Step 3: Write UAT report**

Create `uat-evidence/session-scopes-<timestamp>/evidence.md` with:

```md
# Session Scope UAT Evidence

## Verification Commands

- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm format:check`
- `pnpm test:smoke`

## Manual Checks

- Pi CLI current-folder resume for `/Volumes/EVO/dev/pi-desktop` lists the same project sessions as Desktop `pi-desktop` project rows.
- Desktop `CHATS` is scoped to Desktop quick-start sessions.
- Desktop `CHATS` does not duplicate project sessions.
- Starting from `CHATS` uses the Desktop quick-start workspace.

## Artifacts

- `screenshots/<actual-file-name>.png`

## Recommendation

Pending user sign-off.
```

Replace `<actual-file-name>.png` with real artifact paths.

- [ ] **Step 4: Commit final evidence if tracked policy allows**

If evidence files are intentionally gitignored, do not commit them. Commit only code/docs/test changes that remain uncommitted:

```bash
git status --short
```

Expected: clean working tree or only gitignored `uat-evidence/` artifacts.

---

## Self-Review

Spec coverage:

- `PROJECTS` as pinned folders: Task 2 and Task 6.
- Project rows as current-folder Pi sessions: Task 2 and Task 6.
- `CHATS` as Desktop quick-start workspace: Task 1, Task 2, Task 3, Task 4, and Task 6.
- No all-folder sidebar mapping: Task 2 and Task 6.
- Existing data rebuild from Pi scopes: Task 2.
- Persisted message hydration: Task 5.
- UAT evidence: Task 7.

Placeholder scan: no placeholder implementation steps remain. Every code-changing step includes exact paths and concrete snippets.

Type consistency:

- `ChatStandaloneCreateInputSchema`, `ChatStandaloneCreateInput`, `chat.createStandalone`, `chatCreateStandalone`, and `ProjectService.createStandaloneChat` names are consistent across shared contracts, transports, preload, backend, and service.
- `desktopChatsPath` is the service dependency name used across main, dev-web, tests, and service implementation.
- `resolveDesktopChatsPath` is the app path resolver used by Electron and dev-web.
