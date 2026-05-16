# M04 Project and Session Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make sidebar project and chat management functional against persisted Pi session metadata, including project actions, availability recovery, session lists, resume, names, status labels, filters, show-more controls, and stable Pi SDK fork/clone hooks.

**Architecture:** Keep Pi as the session source by reading and opening Pi JSONL sessions through `SessionManager`. Keep desktop-only metadata in the existing project JSON store for project records, selected chat ids, UI status overrides, last-opened timestamps, and draft chats that do not yet have a Pi session file. Route all renderer operations through the existing transport boundary so Electron IPC and dev-web HTTP stay aligned.

**Tech Stack:** Electron main/preload IPC, React renderer, TypeScript strict mode, Zod transport schemas, Vitest, Playwright smoke tests, `@earendil-works/pi-coding-agent` `SessionManager` and `createAgentSession`.

---

## Scope check

M04 touches project CRUD, session indexing, resume, runtime state, and sidebar UI. These are coupled through the `ProjectStateView` contract and must land together so the app remains runnable after every task. Later coding panels, transcript storage beyond Pi JSONL, provider settings, and git worktree UI stay outside this plan.

Branch support is limited to stable `SessionManager` APIs already exported by `@earendil-works/pi-coding-agent`: `forkFrom()`, `open()`, `getLeafId()`, `createBranchedSession()`, and `branch()`. The UI exposes fork and clone for whole chats. Entry-level branch selection is implemented as a typed backend operation with tests and no sidebar button because M04 has no transcript tree selector.

## File structure

Create:
- `src/main/sessions/pi-session-index.ts` - lists Pi sessions from `SessionManager` and converts `SessionInfo` records into renderer-safe chat metadata.
- `tests/main/pi-session-index.test.ts` - unit tests for session-to-chat mapping, project filtering, standalone filtering, and title selection.

Modify:
- `src/shared/project-state.ts` - extend chat metadata with Pi session ids, paths, cwd, timestamps, attention flags, and persisted UI metadata.
- `src/shared/pi-session.ts` - add optional chat scope to start payloads and add session path/resume metadata to start results.
- `src/shared/ipc.ts` - add chat rename, chat fork, chat clone, chat branch, standalone chat select, and updated Pi session schemas.
- `src/shared/app-transport.ts` - add matching RPC operations and response schemas.
- `src/shared/preload-api.ts` - expose the new typed API methods.
- `src/preload/index.ts` - wire Electron IPC invocations for new methods.
- `src/renderer/app-api/http-client.ts` - wire dev-web RPC calls for new methods.
- `src/renderer/app-api/unavailable-api.ts` - return visible unavailable errors for new methods.
- `src/main/projects/project-service.ts` - derive chat lists from Pi session metadata, preserve draft chats, handle standalone selection, persist session UI metadata, implement chat rename/fork/clone/branch, and provide runtime start targets.
- `src/main/projects/project-store.ts` - validate migrated stores with new optional fields and defaults.
- `src/main/app-backend.ts` - route new chat operations and update session metadata on runtime start/status events.
- `src/main/index.ts` - construct the Pi session lister and register new IPC handlers.
- `src/main/dev-server/local-dev-server.ts` - route new RPC operations through the backend.
- `src/main/pi-session/pi-session-runtime.ts` - open existing Pi session files for resume, return the Pi session file path, and accept injected `SessionManager` instances in tests.
- `src/renderer/projects/project-view-model.ts` - make filters and show-more behavior data-backed and support standalone selected chats.
- `src/renderer/components/project-sidebar.tsx` - enable rename, locate missing folder, filters, show more, standalone select, fork, and clone actions.
- `src/renderer/components/project-main.tsx` - show selected projectless chat recovery and resume states.
- `src/renderer/components/chat-shell.tsx` - render session title/status metadata and preserve resume copy.
- `src/renderer/App.tsx` - pass selected chat ids into session start, support standalone session resume, and refresh project state after session lifecycle changes.
- Existing tests under `tests/main`, `tests/shared`, `tests/renderer`, and `tests/smoke` listed in each task.

---

### Task 1: Extend shared project and chat metadata

**Files:**
- Modify: `src/shared/project-state.ts`
- Test: `tests/shared/project-state.test.ts`

- [ ] **Step 1: Write the failing shared metadata tests**

Append these tests to `tests/shared/project-state.test.ts`:

```ts
it("keeps Pi-backed chat metadata in recency order", () => {
	const first = {
		id: "chat:session:first",
		projectId: "project:/tmp/pi",
		source: "pi-session" as const,
		sessionId: "session-first",
		sessionPath: "/tmp/sessions/first.jsonl",
		cwd: "/tmp/pi",
		title: "First",
		status: "idle" as const,
		attention: false,
		createdAt: "2026-05-12T09:00:00.000Z",
		updatedAt: "2026-05-12T10:00:00.000Z",
		lastOpenedAt: null,
	};
	const second = {
		...first,
		id: "chat:session:second",
		sessionId: "session-second",
		sessionPath: "/tmp/sessions/second.jsonl",
		title: "Second",
		updatedAt: "2026-05-12T11:00:00.000Z",
	};

	expect(sortChats([first, second]).map((chat) => chat.id)).toEqual(["chat:session:second", "chat:session:first"]);
});

it("creates a state view with standalone selected chat metadata", () => {
	const standalone = {
		id: "chat:standalone",
		source: "pi-session" as const,
		sessionId: "session-standalone",
		sessionPath: "/tmp/sessions/standalone.jsonl",
		cwd: "/tmp/outside-project",
		title: "Standalone work",
		status: "idle" as const,
		attention: false,
		createdAt: "2026-05-12T09:00:00.000Z",
		updatedAt: "2026-05-12T10:00:00.000Z",
		lastOpenedAt: "2026-05-12T10:15:00.000Z",
	};

	const view = createProjectStateView({
		...createEmptyProjectStore(),
		standaloneChats: [standalone],
		selectedProjectId: null,
		selectedChatId: standalone.id,
	});

	expect(view.selectedProject).toBeNull();
	expect(view.selectedChat).toEqual(standalone);
	expect(view.standaloneChats).toEqual([standalone]);
});

it("parses legacy stores without standalone chats or session UI metadata", () => {
	const parsed = ProjectStoreSchema.parse({
		projects: [],
		selectedProjectId: null,
		selectedChatId: null,
		chatsByProject: {},
	});

	expect(parsed.standaloneChats).toEqual([]);
	expect(parsed.sessionUiByPath).toEqual({});
});
```

- [ ] **Step 2: Run the shared metadata tests to verify failure**

Run:

```bash
pnpm vitest run tests/shared/project-state.test.ts
```

Expected: FAIL because `ChatMetadata` does not include `source`, `sessionId`, `sessionPath`, `cwd`, `createdAt`, `lastOpenedAt`, or `attention`, and `ProjectStoreSchema` does not default `standaloneChats` or `sessionUiByPath`.

- [ ] **Step 3: Update `src/shared/project-state.ts` schemas and helpers**

Replace the chat schemas and project store schema in `src/shared/project-state.ts` with this code:

```ts
export const ChatStatusSchema = z.enum(["idle", "running", "failed"]);
export const ChatSourceSchema = z.enum(["draft", "pi-session"]);

export const ChatMetadataSchema = z.strictObject({
	id: z.string().min(1),
	projectId: z.string().min(1),
	source: ChatSourceSchema,
	sessionId: z.string().min(1).nullable(),
	sessionPath: z.string().min(1).nullable(),
	cwd: z.string().min(1),
	title: z.string().min(1),
	status: ChatStatusSchema,
	attention: z.boolean(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	lastOpenedAt: z.string().datetime().nullable(),
});

export const StandaloneChatMetadataSchema = ChatMetadataSchema.omit({ projectId: true });

export const SessionUiMetadataSchema = z.strictObject({
	chatId: z.string().min(1),
	sessionId: z.string().min(1).nullable(),
	sessionPath: z.string().min(1),
	projectId: z.string().min(1).nullable(),
	lastOpenedAt: z.string().datetime().nullable(),
	status: ChatStatusSchema.optional(),
	attention: z.boolean().optional(),
});

export const ProjectStoreSchema = z.strictObject({
	projects: z.array(ProjectRecordSchema),
	selectedProjectId: z.string().min(1).nullable(),
	selectedChatId: z.string().min(1).nullable(),
	chatsByProject: z.record(z.string().min(1), z.array(ChatMetadataSchema)),
	standaloneChats: z.array(StandaloneChatMetadataSchema).default([]),
	sessionUiByPath: z.record(z.string().min(1), SessionUiMetadataSchema).default({}),
});
```

Update the exported types below the schemas:

```ts
export type ChatStatus = z.infer<typeof ChatStatusSchema>;
export type ChatSource = z.infer<typeof ChatSourceSchema>;
export type ProjectAvailability = z.infer<typeof ProjectAvailabilitySchema>;
export type ProjectRecord = z.infer<typeof ProjectRecordSchema>;
export type ChatMetadata = z.infer<typeof ChatMetadataSchema>;
export type StandaloneChatMetadata = z.infer<typeof StandaloneChatMetadataSchema>;
export type SessionUiMetadata = z.infer<typeof SessionUiMetadataSchema>;
export type ProjectStore = z.infer<typeof ProjectStoreSchema>;
export type ProjectWithChats = z.infer<typeof ProjectWithChatsSchema>;
export type ProjectStateView = z.infer<typeof ProjectStateViewSchema>;
```

Update `createEmptyProjectStore()`:

```ts
export const createEmptyProjectStore = (): ProjectStore => ({
	projects: [],
	selectedProjectId: null,
	selectedChatId: null,
	chatsByProject: {},
	standaloneChats: [],
	sessionUiByPath: {},
});
```

Update `ProjectStateViewSchema` and `createProjectStateView()` so `selectedChat` can point to either a project chat or a standalone chat:

```ts
export const ProjectStateViewSchema = z.strictObject({
	projects: z.array(ProjectWithChatsSchema),
	standaloneChats: z.array(StandaloneChatMetadataSchema).default([]),
	selectedProjectId: z.string().min(1).nullable(),
	selectedChatId: z.string().min(1).nullable(),
	selectedProject: ProjectWithChatsSchema.nullable(),
	selectedChat: z.union([ChatMetadataSchema, StandaloneChatMetadataSchema]).nullable(),
});

export const createProjectStateView = (store: ProjectStore): ProjectStateView => {
	const projects = sortProjects(store.projects).map((project) => ({
		...project,
		chats: sortChats(store.chatsByProject[project.id] ?? []),
	}));
	const standaloneChats = sortStandaloneChats(store.standaloneChats);
	const selectedProject = projects.find((project) => project.id === store.selectedProjectId) ?? null;
	const selectedChat =
		selectedProject?.chats.find((chat) => chat.id === store.selectedChatId) ??
		(store.selectedProjectId === null
			? standaloneChats.find((chat) => chat.id === store.selectedChatId) ?? null
			: null);

	return {
		projects,
		standaloneChats,
		selectedProjectId: store.selectedProjectId,
		selectedChatId: store.selectedChatId,
		selectedProject,
		selectedChat,
	};
};
```

- [ ] **Step 4: Run the shared metadata tests to verify pass**

Run:

```bash
pnpm vitest run tests/shared/project-state.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit shared metadata changes**

```bash
git add src/shared/project-state.ts tests/shared/project-state.test.ts
git commit -m "feat: extend chat metadata for pi sessions"
```

---

### Task 2: Add Pi session indexing

**Files:**
- Create: `src/main/sessions/pi-session-index.ts`
- Create: `tests/main/pi-session-index.test.ts`

- [ ] **Step 1: Write failing Pi session index tests**

Create `tests/main/pi-session-index.test.ts`:

```ts
import type { SessionInfo } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import {
	createChatFromSessionInfo,
	createStandaloneChatFromSessionInfo,
	filterStandaloneSessionInfos,
	getChatTitleFromSessionInfo,
} from "../../src/main/sessions/pi-session-index";
import { createProjectId } from "../../src/shared/project-state";

const createSessionInfo = (overrides: Partial<SessionInfo> = {}): SessionInfo => ({
	path: "/tmp/pi-sessions/2026_session.jsonl",
	id: "session-1",
	cwd: "/tmp/pi",
	name: undefined,
	parentSessionPath: undefined,
	created: new Date("2026-05-12T09:00:00.000Z"),
	modified: new Date("2026-05-12T10:00:00.000Z"),
	messageCount: 2,
	firstMessage: "Explain the renderer state",
	allMessagesText: "Explain the renderer state\nUse the project store.",
	...overrides,
});

describe("pi session index", () => {
	it("uses explicit Pi session names before first message text", () => {
		expect(getChatTitleFromSessionInfo(createSessionInfo({ name: "Renderer plan" }))).toBe("Renderer plan");
	});

	it("uses first message text when the Pi session has no explicit name", () => {
		expect(getChatTitleFromSessionInfo(createSessionInfo())).toBe("Explain the renderer state");
	});

	it("uses an untitled label for sessions without names or messages", () => {
		expect(getChatTitleFromSessionInfo(createSessionInfo({ firstMessage: "", messageCount: 0 }))).toBe(
			"Untitled session",
		);
	});

	it("creates project chat metadata from Pi SessionInfo", () => {
		const session = createSessionInfo();
		const projectId = createProjectId(session.cwd);

		expect(createChatFromSessionInfo({ session, projectId, status: "idle", attention: false })).toEqual({
			id: "chat:session:session-1",
			projectId,
			source: "pi-session",
			sessionId: "session-1",
			sessionPath: "/tmp/pi-sessions/2026_session.jsonl",
			cwd: "/tmp/pi",
			title: "Explain the renderer state",
			status: "idle",
			attention: false,
			createdAt: "2026-05-12T09:00:00.000Z",
			updatedAt: "2026-05-12T10:00:00.000Z",
			lastOpenedAt: null,
		});
	});

	it("creates standalone chat metadata from Pi SessionInfo", () => {
		const session = createSessionInfo({ cwd: "/tmp/outside" });

		expect(createStandaloneChatFromSessionInfo({ session, status: "failed", attention: true })).toEqual({
			id: "chat:session:session-1",
			source: "pi-session",
			sessionId: "session-1",
			sessionPath: "/tmp/pi-sessions/2026_session.jsonl",
			cwd: "/tmp/outside",
			title: "Explain the renderer state",
			status: "failed",
			attention: true,
			createdAt: "2026-05-12T09:00:00.000Z",
			updatedAt: "2026-05-12T10:00:00.000Z",
			lastOpenedAt: null,
		});
	});

	it("filters standalone sessions away from tracked project paths", () => {
		const project = createSessionInfo({ id: "project-session", cwd: "/tmp/pi" });
		const standalone = createSessionInfo({ id: "standalone-session", cwd: "/tmp/other" });

		expect(filterStandaloneSessionInfos([project, standalone], new Set(["/tmp/pi"])).map((session) => session.id)).toEqual([
			"standalone-session",
		]);
	});
});
```

- [ ] **Step 2: Run the Pi session index tests to verify failure**

Run:

```bash
pnpm vitest run tests/main/pi-session-index.test.ts
```

Expected: FAIL because `src/main/sessions/pi-session-index.ts` does not exist.

- [ ] **Step 3: Create the Pi session index module**

Create `src/main/sessions/pi-session-index.ts`:

```ts
import { resolve } from "node:path";
import { SessionManager, type SessionInfo } from "@earendil-works/pi-coding-agent";
import { createProjectId, type ChatMetadata, type ChatStatus, type StandaloneChatMetadata } from "../../shared/project-state";
import { resolvePiSessionFilesDirForCwd } from "../app-paths";

export type PiSessionListProgress = (loaded: number, total: number) => void;

export type PiSessionLister = {
	listProject: (cwd: string, onProgress?: PiSessionListProgress) => Promise<SessionInfo[]>;
	listAll: (onProgress?: PiSessionListProgress) => Promise<SessionInfo[]>;
};

export const createPiSessionLister = (env?: NodeJS.ProcessEnv): PiSessionLister => ({
	listProject: (cwd, onProgress) =>
		SessionManager.list(cwd, resolvePiSessionFilesDirForCwd({ cwd, env }), onProgress),
	listAll: (onProgress) => SessionManager.listAll(onProgress),
});

export const getChatTitleFromSessionInfo = (session: SessionInfo): string => {
	const explicitName = session.name?.trim();
	if (explicitName) {
		return explicitName;
	}

	const firstMessage = session.firstMessage.trim();
	if (firstMessage) {
		return firstMessage.length > 80 ? `${firstMessage.slice(0, 77)}...` : firstMessage;
	}

	return "Untitled session";
};

export const createChatFromSessionInfo = ({
	session,
	projectId = createProjectId(session.cwd),
	status,
	attention,
	lastOpenedAt = null,
}: {
	session: SessionInfo;
	projectId?: string;
	status: ChatStatus;
	attention: boolean;
	lastOpenedAt?: string | null;
}): ChatMetadata => ({
	id: `chat:session:${session.id}`,
	projectId,
	source: "pi-session",
	sessionId: session.id,
	sessionPath: session.path,
	cwd: session.cwd,
	title: getChatTitleFromSessionInfo(session),
	status,
	attention,
	createdAt: session.created.toISOString(),
	updatedAt: session.modified.toISOString(),
	lastOpenedAt,
});

export const createStandaloneChatFromSessionInfo = ({
	session,
	status,
	attention,
	lastOpenedAt = null,
}: {
	session: SessionInfo;
	status: ChatStatus;
	attention: boolean;
	lastOpenedAt?: string | null;
}): StandaloneChatMetadata => {
	const { projectId: _projectId, ...chat } = createChatFromSessionInfo({
		session,
		projectId: createProjectId(session.cwd),
		status,
		attention,
		lastOpenedAt,
	});
	return chat;
};

export const filterStandaloneSessionInfos = (
	sessions: readonly SessionInfo[],
	trackedProjectPaths: ReadonlySet<string>,
): SessionInfo[] => {
	const tracked = new Set([...trackedProjectPaths].map((projectPath) => resolve(projectPath)));
	return sessions.filter((session) => !tracked.has(resolve(session.cwd)));
};
```

- [ ] **Step 4: Run the Pi session index tests to verify pass**

Run:

```bash
pnpm vitest run tests/main/pi-session-index.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Pi session index**

```bash
git add src/main/sessions/pi-session-index.ts tests/main/pi-session-index.test.ts
git commit -m "feat: index pi session metadata"
```

---

### Task 3: Derive project and standalone chat lists from real sessions

**Files:**
- Modify: `src/main/projects/project-service.ts`
- Modify: `tests/main/project-service.test.ts`

- [ ] **Step 1: Write failing service tests for real session metadata**

Append these tests to `tests/main/project-service.test.ts`:

```ts
it("loads project chats from Pi session metadata", async () => {
	const projectPath = await mkdtemp(join(tmpdir(), "pi-project-sessions-"));
	const project = createProject(projectPath);
	const session = {
		path: join(projectPath, ".pi-session.jsonl"),
		id: "session-project",
		cwd: projectPath,
		name: "Project session",
		parentSessionPath: undefined,
		created: new Date("2026-05-12T08:00:00.000Z"),
		modified: new Date("2026-05-12T11:00:00.000Z"),
		messageCount: 4,
		firstMessage: "ignored because name wins",
		allMessagesText: "Project session text",
	};
	const { service } = await createService({
		initialStore: {
			...createEmptyProjectStore(),
			projects: [project],
			selectedProjectId: project.id,
		},
		listProjectSessions: async () => [session],
	});

	const view = await service.getState();

	expect(view.selectedProject?.chats).toEqual([
		expect.objectContaining({
			id: "chat:session:session-project",
			projectId: project.id,
			source: "pi-session",
			sessionId: "session-project",
			sessionPath: session.path,
			title: "Project session",
			updatedAt: "2026-05-12T11:00:00.000Z",
		}),
	]);
});

it("loads standalone chats from Pi sessions outside tracked projects", async () => {
	const projectPath = await mkdtemp(join(tmpdir(), "pi-tracked-"));
	const outsidePath = await mkdtemp(join(tmpdir(), "pi-outside-"));
	const project = createProject(projectPath);
	const trackedSession = {
		path: join(projectPath, "tracked.jsonl"),
		id: "tracked",
		cwd: projectPath,
		name: "Tracked",
		parentSessionPath: undefined,
		created: new Date("2026-05-12T08:00:00.000Z"),
		modified: new Date("2026-05-12T09:00:00.000Z"),
		messageCount: 2,
		firstMessage: "Tracked",
		allMessagesText: "Tracked",
	};
	const standaloneSession = {
		...trackedSession,
		path: join(outsidePath, "standalone.jsonl"),
		id: "standalone",
		cwd: outsidePath,
		name: "Standalone",
	};
	const { service } = await createService({
		initialStore: {
			...createEmptyProjectStore(),
			projects: [project],
		},
		listAllSessions: async () => [trackedSession, standaloneSession],
	});

	const view = await service.getState();

	expect(view.standaloneChats.map((chat) => chat.id)).toEqual(["chat:session:standalone"]);
	expect(view.standaloneChats[0]?.title).toBe("Standalone");
});

it("selects standalone chats through the service", async () => {
	const standaloneChat = {
		id: "chat:standalone",
		source: "pi-session" as const,
		sessionId: "standalone",
		sessionPath: "/tmp/standalone.jsonl",
		cwd: "/tmp/outside",
		title: "Standalone",
		status: "idle" as const,
		attention: false,
		createdAt: firstNow,
		updatedAt: firstNow,
		lastOpenedAt: null,
	};
	const { memoryStore, service } = await createService({
		initialStore: {
			...createEmptyProjectStore(),
			standaloneChats: [standaloneChat],
		},
		now: () => secondNow,
	});

	const view = await service.selectStandaloneChat({ chatId: standaloneChat.id });

	expect(view.selectedProjectId).toBeNull();
	expect(view.selectedChatId).toBe(standaloneChat.id);
	expect(view.selectedChat).toEqual({ ...standaloneChat, lastOpenedAt: secondNow });
	expect(memoryStore.read().standaloneChats[0]?.lastOpenedAt).toBe(secondNow);
});
```

Update the `createService` helper options in the same test file:

```ts
		listProjectSessions?: ProjectServiceDeps["listProjectSessions"];
		listAllSessions?: ProjectServiceDeps["listAllSessions"];
```

Pass the new dependencies into `createProjectService()`:

```ts
			listProjectSessions: options.listProjectSessions ?? (async () => []),
			listAllSessions: options.listAllSessions ?? (async () => []),
```

- [ ] **Step 2: Run project service tests to verify failure**

Run:

```bash
pnpm vitest run tests/main/project-service.test.ts
```

Expected: FAIL because `ProjectServiceDeps` has no `listProjectSessions`, `listAllSessions`, or `selectStandaloneChat`.

- [ ] **Step 3: Add session-list dependencies and selection inputs**

In `src/main/projects/project-service.ts`, add imports:

```ts
import type { SessionInfo } from "@earendil-works/pi-coding-agent";
import {
	createChatFromSessionInfo,
	createStandaloneChatFromSessionInfo,
	filterStandaloneSessionInfos,
} from "../sessions/pi-session-index";
import type { ChatStandaloneSelectionInput } from "../../shared/ipc";
```

Extend `ProjectServiceDeps`:

```ts
	listProjectSessions: (cwd: string) => Promise<SessionInfo[]>;
	listAllSessions: () => Promise<SessionInfo[]>;
```

Extend `ProjectService`:

```ts
	selectStandaloneChat: (input: ChatStandaloneSelectionInput) => Promise<ProjectStateView>;
```

Add this helper near `saveAndView`:

```ts
const refreshSessionChats = async (deps: ProjectServiceDeps, store: ProjectStore): Promise<ProjectStore> => {
	const nextStore = structuredClone(store);
	const trackedProjectPaths = new Set(nextStore.projects.map((project) => project.path));

	for (const project of nextStore.projects) {
		if (project.availability.status !== "available") {
			continue;
		}

		const sessions = await deps.listProjectSessions(project.path);
		const uiByPath = nextStore.sessionUiByPath;
		const piChats = sessions.map((session) => {
			const ui = uiByPath[session.path];
			const base = createChatFromSessionInfo({
				session,
				projectId: project.id,
				status: ui?.status ?? "idle",
				attention: ui?.attention ?? false,
				lastOpenedAt: ui?.lastOpenedAt ?? null,
			});
			return ui ? { ...base, id: ui.chatId } : base;
		});
		const drafts = (nextStore.chatsByProject[project.id] ?? []).filter((chat) => chat.source === "draft");
		nextStore.chatsByProject[project.id] = [...piChats, ...drafts];
	}

	const standaloneSessions = filterStandaloneSessionInfos(await deps.listAllSessions(), trackedProjectPaths);
	nextStore.standaloneChats = standaloneSessions.map((session) => {
		const ui = nextStore.sessionUiByPath[session.path];
		const base = createStandaloneChatFromSessionInfo({
			session,
			status: ui?.status ?? "idle",
			attention: ui?.attention ?? false,
			lastOpenedAt: ui?.lastOpenedAt ?? null,
		});
		return ui ? { ...base, id: ui.chatId } : base;
	});

	return nextStore;
};
```

Change `getState()` so it refreshes Pi session chats before creating the view:

```ts
		async getState() {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const changed = await refreshAllProjectAvailability(store, deps.now());
				const withSessions = await refreshSessionChats(deps, store);
				if (changed || JSON.stringify(withSessions) !== JSON.stringify(store)) {
					await deps.store.save(withSessions);
				}

				return createProjectStateView(withSessions);
			});
		},
```

Add the standalone selection method in the returned service object:

```ts
		async selectStandaloneChat(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const refreshed = await refreshSessionChats(deps, store);
				const chatIndex = refreshed.standaloneChats.findIndex((chat) => chat.id === input.chatId);
				if (chatIndex === -1) {
					throw new Error("Standalone chat not found.");
				}

				const now = deps.now();
				refreshed.standaloneChats[chatIndex] = {
					...refreshed.standaloneChats[chatIndex],
					lastOpenedAt: now,
				};
				const selected = refreshed.standaloneChats[chatIndex];
				if (selected.sessionPath) {
					refreshed.sessionUiByPath[selected.sessionPath] = {
						chatId: selected.id,
						sessionId: selected.sessionId,
						sessionPath: selected.sessionPath,
						projectId: null,
						lastOpenedAt: now,
						status: selected.status,
						attention: selected.attention,
					};
				}
				refreshed.selectedProjectId = null;
				refreshed.selectedChatId = input.chatId;

				return saveAndView(deps.store, refreshed);
			});
		},
```

- [ ] **Step 4: Update draft chat creation to use extended metadata**

Replace the `chat` object inside `createChat()` with:

```ts
				const chat: ChatMetadata = {
					id: createChatId(now, existingChats),
					projectId: input.projectId,
					source: "draft",
					sessionId: null,
					sessionPath: null,
					cwd: store.projects[findProjectIndex(store, input.projectId)].path,
					title: "New chat",
					status: "idle",
					attention: false,
					createdAt: now,
					updatedAt: now,
					lastOpenedAt: now,
				};
```

- [ ] **Step 5: Run project service tests to verify pass**

Run:

```bash
pnpm vitest run tests/main/project-service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit session-backed project service changes**

```bash
git add src/main/projects/project-service.ts tests/main/project-service.test.ts
git commit -m "feat: load chats from pi session metadata"
```

---

### Task 4: Add typed chat management and session action IPC contracts

**Files:**
- Modify: `src/shared/ipc.ts`
- Modify: `src/shared/app-transport.ts`
- Modify: `src/shared/preload-api.ts`
- Modify: `tests/shared/ipc.test.ts`
- Modify: `tests/shared/app-transport.test.ts`

- [ ] **Step 1: Write failing shared transport tests**

Append to `tests/shared/ipc.test.ts`:

```ts
it("parses chat rename, standalone select, fork, clone, and branch inputs", () => {
	expect(ChatRenameInputSchema.parse({ projectId: "project:/tmp/pi", chatId: "chat:1", title: "New name" })).toEqual({
		projectId: "project:/tmp/pi",
		chatId: "chat:1",
		title: "New name",
	});
	expect(ChatStandaloneSelectionInputSchema.parse({ chatId: "chat:standalone" })).toEqual({
		chatId: "chat:standalone",
	});
	expect(ChatForkInputSchema.parse({ projectId: "project:/tmp/pi", chatId: "chat:1" })).toEqual({
		projectId: "project:/tmp/pi",
		chatId: "chat:1",
	});
	expect(ChatCloneInputSchema.parse({ projectId: "project:/tmp/pi", chatId: "chat:1" })).toEqual({
		projectId: "project:/tmp/pi",
		chatId: "chat:1",
	});
	expect(ChatBranchInputSchema.parse({ projectId: "project:/tmp/pi", chatId: "chat:1", entryId: "abcd1234" })).toEqual({
		projectId: "project:/tmp/pi",
		chatId: "chat:1",
		entryId: "abcd1234",
	});
});
```

Append to `tests/shared/app-transport.test.ts`:

```ts
it("accepts M04 chat management RPC operations", () => {
	expect(AppRpcRequestSchema.parse({ operation: "chat.rename", input: { projectId: "project:/tmp/pi", chatId: "chat:1", title: "Renamed" } }).operation).toBe("chat.rename");
	expect(AppRpcRequestSchema.parse({ operation: "chat.selectStandalone", input: { chatId: "chat:standalone" } }).operation).toBe("chat.selectStandalone");
	expect(AppRpcRequestSchema.parse({ operation: "chat.fork", input: { projectId: "project:/tmp/pi", chatId: "chat:1" } }).operation).toBe("chat.fork");
	expect(AppRpcRequestSchema.parse({ operation: "chat.clone", input: { projectId: "project:/tmp/pi", chatId: "chat:1" } }).operation).toBe("chat.clone");
	expect(AppRpcRequestSchema.parse({ operation: "chat.branch", input: { projectId: "project:/tmp/pi", chatId: "chat:1", entryId: "abcd1234" } }).operation).toBe("chat.branch");
});
```

- [ ] **Step 2: Run shared transport tests to verify failure**

Run:

```bash
pnpm vitest run tests/shared/ipc.test.ts tests/shared/app-transport.test.ts
```

Expected: FAIL because the new schemas and RPC operations do not exist.

- [ ] **Step 3: Add schemas and IPC channel constants**

In `src/shared/ipc.ts`, add channel constants:

```ts
	chatRename: "chat:rename",
	chatSelectStandalone: "chat:selectStandalone",
	chatFork: "chat:fork",
	chatClone: "chat:clone",
	chatBranch: "chat:branch",
```

Add input schemas:

```ts
export const ChatRenameInputSchema = z.strictObject({
	projectId: z.string().min(1).nullable(),
	chatId: z.string().min(1),
	title: z.string().trim().min(1),
});

export const ChatStandaloneSelectionInputSchema = z.strictObject({
	chatId: z.string().min(1),
});

export const ChatForkInputSchema = z.strictObject({
	projectId: z.string().min(1),
	chatId: z.string().min(1),
});

export const ChatCloneInputSchema = ChatForkInputSchema;

export const ChatBranchInputSchema = ChatForkInputSchema.extend({
	entryId: z.string().min(1),
});
```

Export types:

```ts
export type ChatRenameInput = z.infer<typeof ChatRenameInputSchema>;
export type ChatStandaloneSelectionInput = z.infer<typeof ChatStandaloneSelectionInputSchema>;
export type ChatForkInput = z.infer<typeof ChatForkInputSchema>;
export type ChatCloneInput = z.infer<typeof ChatCloneInputSchema>;
export type ChatBranchInput = z.infer<typeof ChatBranchInputSchema>;
```

- [ ] **Step 4: Add RPC operations and preload API methods**

In `src/shared/app-transport.ts`, import the new schemas and add these operations to `AppRpcRequestSchema`:

```ts
	z.strictObject({ operation: z.literal("chat.rename"), input: ChatRenameInputSchema }),
	z.strictObject({ operation: z.literal("chat.selectStandalone"), input: ChatStandaloneSelectionInputSchema }),
	z.strictObject({ operation: z.literal("chat.fork"), input: ChatForkInputSchema }),
	z.strictObject({ operation: z.literal("chat.clone"), input: ChatCloneInputSchema }),
	z.strictObject({ operation: z.literal("chat.branch"), input: ChatBranchInputSchema }),
```

Add response schemas:

```ts
	"chat.rename": ProjectStateViewResultSchema,
	"chat.selectStandalone": ProjectStateViewResultSchema,
	"chat.fork": ProjectStateViewResultSchema,
	"chat.clone": ProjectStateViewResultSchema,
	"chat.branch": ProjectStateViewResultSchema,
```

In `src/shared/preload-api.ts`, extend `chat`:

```ts
		rename: (input: ChatRenameInput) => Promise<ProjectStateViewResult>;
		selectStandalone: (input: ChatStandaloneSelectionInput) => Promise<ProjectStateViewResult>;
		fork: (input: ChatForkInput) => Promise<ProjectStateViewResult>;
		clone: (input: ChatCloneInput) => Promise<ProjectStateViewResult>;
		branch: (input: ChatBranchInput) => Promise<ProjectStateViewResult>;
```

- [ ] **Step 5: Run shared transport tests to verify pass**

Run:

```bash
pnpm vitest run tests/shared/ipc.test.ts tests/shared/app-transport.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit transport contract changes**

```bash
git add src/shared/ipc.ts src/shared/app-transport.ts src/shared/preload-api.ts tests/shared/ipc.test.ts tests/shared/app-transport.test.ts
git commit -m "feat: add chat management transport contracts"
```

---

### Task 5: Implement chat rename, fork, clone, and branch service operations

**Files:**
- Modify: `src/main/projects/project-service.ts`
- Modify: `tests/main/project-service.test.ts`

- [ ] **Step 1: Write failing chat action service tests**

Append to `tests/main/project-service.test.ts`:

```ts
it("renames a Pi-backed chat through the session name writer", async () => {
	const projectPath = await mkdtemp(join(tmpdir(), "pi-rename-session-"));
	const project = createProject(projectPath);
	const chat = {
		id: "chat:session:rename",
		projectId: project.id,
		source: "pi-session" as const,
		sessionId: "rename",
		sessionPath: join(projectPath, "rename.jsonl"),
		cwd: projectPath,
		title: "Old title",
		status: "idle" as const,
		attention: false,
		createdAt: firstNow,
		updatedAt: firstNow,
		lastOpenedAt: null,
	};
	const writtenNames: Array<{ sessionPath: string; name: string }> = [];
	const { service } = await createService({
		initialStore: {
			...createEmptyProjectStore(),
			projects: [project],
			chatsByProject: { [project.id]: [chat] },
		},
		writeSessionName: async (sessionPath, name) => writtenNames.push({ sessionPath, name }),
	});

	await service.renameChat({ projectId: project.id, chatId: chat.id, title: "New title" });

	expect(writtenNames).toEqual([{ sessionPath: chat.sessionPath, name: "New title" }]);
});

it("renames a draft chat in the desktop store", async () => {
	const projectPath = await mkdtemp(join(tmpdir(), "pi-rename-draft-"));
	const project = createProject(projectPath);
	const chat = {
		id: "chat:draft",
		projectId: project.id,
		source: "draft" as const,
		sessionId: null,
		sessionPath: null,
		cwd: projectPath,
		title: "Old draft",
		status: "idle" as const,
		attention: false,
		createdAt: firstNow,
		updatedAt: firstNow,
		lastOpenedAt: null,
	};
	const { memoryStore, service } = await createService({
		initialStore: {
			...createEmptyProjectStore(),
			projects: [project],
			chatsByProject: { [project.id]: [chat] },
		},
		now: () => secondNow,
	});

	await service.renameChat({ projectId: project.id, chatId: chat.id, title: "New draft" });

	expect(memoryStore.read().chatsByProject[project.id]?.[0]).toEqual({
		...chat,
		title: "New draft",
		updatedAt: secondNow,
	});
});

it("forks a Pi-backed chat into the same project", async () => {
	const projectPath = await mkdtemp(join(tmpdir(), "pi-fork-session-"));
	const project = createProject(projectPath);
	const sourcePath = join(projectPath, "source.jsonl");
	const forkedPath = join(projectPath, "forked.jsonl");
	const chat = {
		id: "chat:session:source",
		projectId: project.id,
		source: "pi-session" as const,
		sessionId: "source",
		sessionPath: sourcePath,
		cwd: projectPath,
		title: "Source chat",
		status: "idle" as const,
		attention: false,
		createdAt: firstNow,
		updatedAt: firstNow,
		lastOpenedAt: null,
	};
	const forked: Array<{ sourcePath: string; targetCwd: string }> = [];
	const { service } = await createService({
		initialStore: {
			...createEmptyProjectStore(),
			projects: [project],
			chatsByProject: { [project.id]: [chat] },
		},
		forkSession: async (source, targetCwd) => {
			forked.push({ sourcePath: source, targetCwd });
			return forkedPath;
		},
	});

	await service.forkChat({ projectId: project.id, chatId: chat.id });

	expect(forked).toEqual([{ sourcePath, targetCwd: projectPath }]);
});

it("rejects clone for a draft chat without a Pi session path", async () => {
	const projectPath = await mkdtemp(join(tmpdir(), "pi-clone-draft-"));
	const project = createProject(projectPath);
	const chat = {
		id: "chat:draft",
		projectId: project.id,
		source: "draft" as const,
		sessionId: null,
		sessionPath: null,
		cwd: projectPath,
		title: "Draft",
		status: "idle" as const,
		attention: false,
		createdAt: firstNow,
		updatedAt: firstNow,
		lastOpenedAt: null,
	};
	const { service } = await createService({
		initialStore: {
			...createEmptyProjectStore(),
			projects: [project],
			chatsByProject: { [project.id]: [chat] },
		},
	});

	await expectRejectsWithMessage(
		service.cloneChat({ projectId: project.id, chatId: chat.id }),
		"Chat does not have a Pi session file yet.",
	);
});
```

Extend the `createService` test helper with these dependency options:

```ts
		writeSessionName?: ProjectServiceDeps["writeSessionName"];
		forkSession?: ProjectServiceDeps["forkSession"];
		cloneSession?: ProjectServiceDeps["cloneSession"];
		branchSession?: ProjectServiceDeps["branchSession"];
```

Pass defaults into `createProjectService()`:

```ts
			writeSessionName: options.writeSessionName ?? (async () => undefined),
			forkSession: options.forkSession ?? (async () => "/tmp/forked.jsonl"),
			cloneSession: options.cloneSession ?? (async () => "/tmp/cloned.jsonl"),
			branchSession: options.branchSession ?? (async () => "/tmp/branched.jsonl"),
```

- [ ] **Step 2: Run chat action service tests to verify failure**

Run:

```bash
pnpm vitest run tests/main/project-service.test.ts
```

Expected: FAIL because `ProjectServiceDeps` and `ProjectService` do not include chat rename, fork, clone, and branch operations.

- [ ] **Step 3: Add chat action dependencies and service methods**

In `src/main/projects/project-service.ts`, extend `ProjectServiceDeps`:

```ts
	writeSessionName: (sessionPath: string, name: string) => Promise<void>;
	forkSession: (sourcePath: string, targetCwd: string) => Promise<string>;
	cloneSession: (sourcePath: string, targetCwd: string) => Promise<string>;
	branchSession: (sourcePath: string, targetCwd: string, entryId: string) => Promise<string>;
```

Extend `ProjectService`:

```ts
	renameChat: (input: ChatRenameInput) => Promise<ProjectStateView>;
	forkChat: (input: ChatForkInput) => Promise<ProjectStateView>;
	cloneChat: (input: ChatCloneInput) => Promise<ProjectStateView>;
	branchChat: (input: ChatBranchInput) => Promise<ProjectStateView>;
```

Add this helper:

```ts
const findProjectChat = (store: ProjectStore, projectId: string, chatId: string): ChatMetadata => {
	findProjectIndex(store, projectId);
	const chat = (store.chatsByProject[projectId] ?? []).find((candidate) => candidate.id === chatId);
	if (!chat) {
		throw new Error("Chat not found.");
	}
	return chat;
};

const requireSessionPath = (chat: ChatMetadata): string => {
	if (!chat.sessionPath) {
		throw new Error("Chat does not have a Pi session file yet.");
	}
	return chat.sessionPath;
};
```

Add methods in the returned service object:

```ts
		async renameChat(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const now = deps.now();

				if (input.projectId === null) {
					const chatIndex = store.standaloneChats.findIndex((chat) => chat.id === input.chatId);
					if (chatIndex === -1) throw new Error("Standalone chat not found.");
					const chat = store.standaloneChats[chatIndex];
					if (chat.sessionPath) await deps.writeSessionName(chat.sessionPath, input.title);
					store.standaloneChats[chatIndex] = { ...chat, title: input.title, updatedAt: now };
					return saveAndView(deps.store, store);
				}

				const chat = findProjectChat(store, input.projectId, input.chatId);
				if (chat.sessionPath) {
					await deps.writeSessionName(chat.sessionPath, input.title);
				}
				store.chatsByProject[input.projectId] = (store.chatsByProject[input.projectId] ?? []).map((candidate) =>
					candidate.id === input.chatId ? { ...candidate, title: input.title, updatedAt: now } : candidate,
				);
				return saveAndView(deps.store, store);
			});
		},

		async forkChat(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const project = store.projects[findProjectIndex(store, input.projectId)];
				const chat = findProjectChat(store, input.projectId, input.chatId);
				const forkedPath = await deps.forkSession(requireSessionPath(chat), project.path);
				store.sessionUiByPath[forkedPath] = {
					chatId: `chat:session:fork:${Date.now()}`,
					sessionId: null,
					sessionPath: forkedPath,
					projectId: project.id,
					lastOpenedAt: deps.now(),
					status: "idle",
					attention: false,
				};
				return saveAndView(deps.store, await refreshSessionChats(deps, store));
			});
		},

		async cloneChat(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const project = store.projects[findProjectIndex(store, input.projectId)];
				const chat = findProjectChat(store, input.projectId, input.chatId);
				const clonedPath = await deps.cloneSession(requireSessionPath(chat), project.path);
				store.sessionUiByPath[clonedPath] = {
					chatId: `chat:session:clone:${Date.now()}`,
					sessionId: null,
					sessionPath: clonedPath,
					projectId: project.id,
					lastOpenedAt: deps.now(),
					status: "idle",
					attention: false,
				};
				return saveAndView(deps.store, await refreshSessionChats(deps, store));
			});
		},

		async branchChat(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const project = store.projects[findProjectIndex(store, input.projectId)];
				const chat = findProjectChat(store, input.projectId, input.chatId);
				const branchedPath = await deps.branchSession(requireSessionPath(chat), project.path, input.entryId);
				store.sessionUiByPath[branchedPath] = {
					chatId: `chat:session:branch:${Date.now()}`,
					sessionId: null,
					sessionPath: branchedPath,
					projectId: project.id,
					lastOpenedAt: deps.now(),
					status: "idle",
					attention: false,
				};
				return saveAndView(deps.store, await refreshSessionChats(deps, store));
			});
		},
```

- [ ] **Step 4: Run project service tests to verify pass**

Run:

```bash
pnpm vitest run tests/main/project-service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit chat action service changes**

```bash
git add src/main/projects/project-service.ts tests/main/project-service.test.ts
git commit -m "feat: add chat session management actions"
```

---

### Task 6: Resume existing Pi sessions in the runtime

**Files:**
- Modify: `src/shared/pi-session.ts`
- Modify: `src/main/pi-session/pi-session-runtime.ts`
- Modify: `tests/main/pi-session-runtime.test.ts`

- [ ] **Step 1: Write failing runtime resume tests**

Append to `tests/main/pi-session-runtime.test.ts`:

```ts
it("starts from an existing session manager when resuming a session path", async () => {
	const events: PiSessionEvent[] = [];
	const { session } = createFakeSession();
	const createdManagers: string[] = [];
	const runtime = createPiSessionRuntime({
		now,
		emit: (event) => events.push(event),
		createSessionManager: vi.fn(({ sessionPath }) => {
			createdManagers.push(sessionPath ?? "new");
			return {
				getSessionFile: () => sessionPath ?? "/tmp/new.jsonl",
				getSessionId: () => "sdk-session:one",
			} as never;
		}),
		createAgentSession: vi.fn(async () => ({ session })),
	});

	const result = await runtime.start({
		projectId: "project:/tmp/pi-desktop",
		chatId: "chat:session:sdk-session:one",
		workspacePath: "/tmp/pi-desktop",
		sessionPath: "/tmp/session.jsonl",
		prompt: "Resume this",
	});

	expect(createdManagers).toEqual(["/tmp/session.jsonl"]);
	expect(result.sessionPath).toBe("/tmp/session.jsonl");
	expect(result.resumed).toBe(true);
});
```

- [ ] **Step 2: Run runtime tests to verify failure**

Run:

```bash
pnpm vitest run tests/main/pi-session-runtime.test.ts
```

Expected: FAIL because runtime `start()` does not accept `chatId`, `sessionPath`, or injected `createSessionManager`.

- [ ] **Step 3: Extend shared Pi session start schemas**

In `src/shared/pi-session.ts`, update `PiSessionStartInputSchema`:

```ts
export const PiSessionStartInputSchema = z.strictObject({
	projectId: z.string().min(1).nullable(),
	chatId: z.string().min(1).nullable().optional(),
	prompt: z.string().trim().min(1),
});
```

Update `PiSessionStartPayloadSchema`:

```ts
export const PiSessionStartPayloadSchema = z.strictObject({
	sessionId: z.string().min(1),
	projectId: z.string().min(1).nullable(),
	chatId: z.string().min(1).nullable(),
	workspacePath: z.string().min(1),
	sessionPath: z.string().min(1).nullable(),
	status: PiSessionStatusSchema,
	resumed: z.boolean(),
});
```

- [ ] **Step 4: Add runtime session manager injection and resume support**

In `src/main/pi-session/pi-session-runtime.ts`, import the public type:

```ts
import { createAgentSession as createPiAgentSession, SessionManager, type SessionManager as PiSessionManager } from "@earendil-works/pi-coding-agent";
```

Update `RuntimeStartInput`:

```ts
type RuntimeStartInput = {
	projectId: string | null;
	chatId: string | null;
	workspacePath: string;
	sessionPath?: string | null;
	prompt: string;
};
```

Update `RuntimeDeps`:

```ts
	createAgentSession?: (options: { cwd: string; sessionManager: PiSessionManager }) => Promise<CreateAgentSessionResult>;
	createSessionManager?: (options: { cwd: string; sessionPath?: string | null; env?: NodeJS.ProcessEnv }) => PiSessionManager;
```

Add the default session manager factory near `createAgentSession`:

```ts
	const createSessionManager =
		deps.createSessionManager ??
		((options: { cwd: string; sessionPath?: string | null; env?: NodeJS.ProcessEnv }) => {
			const sessionDir = resolvePiSessionFilesDirForCwd({ cwd: options.cwd, env: options.env });
			return options.sessionPath
				? SessionManager.open(options.sessionPath, sessionDir, options.cwd)
				: SessionManager.create(options.cwd, sessionDir);
		});
```

Replace the default `createAgentSession` body with:

```ts
	const createAgentSession =
		deps.createAgentSession ??
		((options: { cwd: string; sessionManager: PiSessionManager }) =>
			createPiAgentSession({
				cwd: options.cwd,
				agentDir: resolvePiAgentDir(deps.env),
				sessionManager: options.sessionManager,
			}));
```

Inside `start()`, create the session manager before creating the agent session:

```ts
		async start(input: RuntimeStartInput): Promise<PiSessionStartPayload> {
			let created: CreateAgentSessionResult | undefined;
			const sessionManager = createSessionManager({
				cwd: input.workspacePath,
				sessionPath: input.sessionPath,
				env: deps.env,
			});
			try {
				created = await createAgentSession({ cwd: input.workspacePath, sessionManager });
				await created.session.bindExtensions({});
			} catch (error) {
				created?.session.dispose();
				deps.emit(createRuntimeErrorEvent({ code: "pi.session_start_failed", error, now: deps.now }));
				throw error;
			}
```

Update the returned payload:

```ts
			return {
				sessionId,
				projectId: input.projectId,
				chatId: input.chatId,
				workspacePath: input.workspacePath,
				sessionPath: sessionManager.getSessionFile() ?? input.sessionPath ?? null,
				status: "running",
				resumed: Boolean(input.sessionPath),
			};
```

- [ ] **Step 5: Run runtime tests to verify pass**

Run:

```bash
pnpm vitest run tests/main/pi-session-runtime.test.ts tests/shared/pi-session.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit runtime resume changes**

```bash
git add src/shared/pi-session.ts src/main/pi-session/pi-session-runtime.ts tests/main/pi-session-runtime.test.ts
git commit -m "feat: resume pi sessions from metadata"
```

---

### Task 7: Wire backend, IPC, preload, HTTP, and native Pi session actions

**Files:**
- Modify: `src/main/app-backend.ts`
- Modify: `src/main/index.ts`
- Modify: `src/main/dev-server/local-dev-server.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/app-api/http-client.ts`
- Modify: `src/renderer/app-api/unavailable-api.ts`
- Modify: `tests/main/app-backend.test.ts`
- Modify: `tests/main/local-dev-server.test.ts`
- Modify: `tests/renderer/http-client.test.ts`
- Modify: `tests/renderer/unavailable-api.test.ts`

- [ ] **Step 1: Write failing backend routing tests**

Append to `tests/main/app-backend.test.ts`:

```ts
it("routes chat rename through the project service", async () => {
	const projectService = createProjectServiceStub();
	const backend = createAppBackend({ appInfo, projectService, now });

	await backend.handle({
		operation: "chat.rename",
		input: { projectId: "project:/tmp/pi", chatId: "chat:1", title: "Renamed" },
	});

	expect(projectService.renameChat).toHaveBeenCalledWith({
		projectId: "project:/tmp/pi",
		chatId: "chat:1",
		title: "Renamed",
	});
});

it("starts a resumed project chat from its session path", async () => {
	const projectService = createProjectServiceStub({
		getSessionStartTarget: vi.fn(async () => ({
			projectId: "project:/tmp/pi",
			chatId: "chat:session:one",
			workspacePath: "/tmp/pi",
			sessionPath: "/tmp/session.jsonl",
		})),
	});
	const backend = createAppBackend({
		appInfo,
		projectService,
		now,
		createAgentSession: vi.fn(async () => ({ session: createFakeSdkSession("sdk-session") })),
		createSessionManager: vi.fn(() => ({
			getSessionFile: () => "/tmp/session.jsonl",
			getSessionId: () => "sdk-session",
		}) as never),
	});

	const result = await backend.handle({
		operation: "piSession.start",
		input: { projectId: "project:/tmp/pi", chatId: "chat:session:one", prompt: "Continue" },
	});

	expect(result.ok).toBe(true);
	if (result.ok) {
		expect(result.data).toEqual(expect.objectContaining({ chatId: "chat:session:one", sessionPath: "/tmp/session.jsonl", resumed: true }));
	}
});
```

Update the test stub type in the same file with methods used by M04:

```ts
renameChat: vi.fn(async () => emptyProjectState),
selectStandaloneChat: vi.fn(async () => emptyProjectState),
forkChat: vi.fn(async () => emptyProjectState),
cloneChat: vi.fn(async () => emptyProjectState),
branchChat: vi.fn(async () => emptyProjectState),
getSessionStartTarget: vi.fn(async () => ({ projectId: "project:/tmp/pi", chatId: null, workspacePath: "/tmp/pi", sessionPath: null })),
recordSessionStarted: vi.fn(async () => undefined),
recordSessionStatus: vi.fn(async () => undefined),
```

- [ ] **Step 2: Run backend and transport tests to verify failure**

Run:

```bash
pnpm vitest run tests/main/app-backend.test.ts tests/renderer/http-client.test.ts tests/renderer/unavailable-api.test.ts
```

Expected: FAIL because backend and client API methods are not wired.

- [ ] **Step 3: Route new operations in `src/main/app-backend.ts`**

Import new schemas from `src/shared/ipc.ts`:

```ts
	ChatBranchInputSchema,
	ChatCloneInputSchema,
	ChatForkInputSchema,
	ChatRenameInputSchema,
	ChatStandaloneSelectionInputSchema,
```

Extend `AppBackendDeps`:

```ts
	createSessionManager?: Parameters<typeof createPiSessionRuntime>[0]["createSessionManager"];
```

Pass `createSessionManager` to `createPiSessionRuntime()`:

```ts
		createSessionManager: deps.createSessionManager,
```

Add cases to `handle(request)`:

```ts
				case "chat.rename":
					return handleProjectOperation(() =>
						deps.projectService.renameChat(ChatRenameInputSchema.parse(request.input)),
					);
				case "chat.selectStandalone":
					return handleProjectOperation(() =>
						deps.projectService.selectStandaloneChat(ChatStandaloneSelectionInputSchema.parse(request.input)),
					);
				case "chat.fork":
					return handleProjectOperation(() =>
						deps.projectService.forkChat(ChatForkInputSchema.parse(request.input)),
					);
				case "chat.clone":
					return handleProjectOperation(() =>
						deps.projectService.cloneChat(ChatCloneInputSchema.parse(request.input)),
					);
				case "chat.branch":
					return handleProjectOperation(() =>
						deps.projectService.branchChat(ChatBranchInputSchema.parse(request.input)),
					);
```

Replace the `piSession.start` case with:

```ts
				case "piSession.start":
					return handlePiSessionOperation(async () => {
						const parsed = PiSessionStartInputSchema.parse(request.input);
						const target = await deps.projectService.getSessionStartTarget({
							projectId: parsed.projectId,
							chatId: parsed.chatId ?? null,
						});
						const started = await piSessionRuntime.start({
							projectId: target.projectId,
							chatId: target.chatId,
							workspacePath: target.workspacePath,
							sessionPath: target.sessionPath,
							prompt: parsed.prompt,
						});
						await deps.projectService.recordSessionStarted({
							projectId: started.projectId,
							chatId: started.chatId,
							sessionId: started.sessionId,
							sessionPath: started.sessionPath,
							status: started.status,
						});
						return started;
					});
```

In `emitPiSessionEvent`, after listener emission, update persisted status without blocking event delivery:

```ts
		if (event.type === "status") {
			void deps.projectService.recordSessionStatus({
				sessionId: event.sessionId,
				status: event.status === "failed" ? "failed" : event.status === "running" ? "running" : "idle",
				attention: event.status === "failed",
				updatedAt: event.receivedAt,
			});
		}
		if (event.type === "runtime_error" && event.sessionId) {
			void deps.projectService.recordSessionStatus({
				sessionId: event.sessionId,
				status: "failed",
				attention: true,
				updatedAt: event.receivedAt,
			});
		}
```

- [ ] **Step 4: Implement native dependencies in `src/main/index.ts`**

Add imports:

```ts
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { createPiSessionLister } from "./sessions/pi-session-index";
import { resolvePiSessionFilesDirForCwd } from "./app-paths";
```

When creating `projectService`, add dependencies:

```ts
	listProjectSessions: createPiSessionLister(process.env).listProject,
	listAllSessions: createPiSessionLister(process.env).listAll,
	writeSessionName: async (sessionPath, name) => {
		const manager = SessionManager.open(sessionPath);
		manager.appendSessionInfo(name);
	},
	forkSession: async (sourcePath, targetCwd) => {
		const manager = SessionManager.forkFrom(sourcePath, targetCwd, resolvePiSessionFilesDirForCwd({ cwd: targetCwd, env: process.env }));
		return manager.getSessionFile() ?? sourcePath;
	},
	cloneSession: async (sourcePath, targetCwd) => {
		const manager = SessionManager.open(sourcePath, resolvePiSessionFilesDirForCwd({ cwd: targetCwd, env: process.env }), targetCwd);
		const leafId = manager.getLeafId();
		if (!leafId) throw new Error("Cannot clone a session without entries.");
		const clonedPath = manager.createBranchedSession(leafId);
		if (!clonedPath) throw new Error("Pi session clone did not create a persisted session file.");
		return clonedPath;
	},
	branchSession: async (sourcePath, targetCwd, entryId) => {
		const manager = SessionManager.open(sourcePath, resolvePiSessionFilesDirForCwd({ cwd: targetCwd, env: process.env }), targetCwd);
		manager.branch(entryId);
		const branchedPath = manager.createBranchedSession(entryId);
		if (!branchedPath) throw new Error("Pi session branch did not create a persisted session file.");
		return branchedPath;
	},
```

- [ ] **Step 5: Wire preload, HTTP, and unavailable APIs**

In `src/preload/index.ts`, add methods to `chat`:

```ts
		rename: async (input) => safeInvokeParse(IpcChannels.chatRename, ProjectStateViewResultSchema, input),
		selectStandalone: async (input) =>
			safeInvokeParse(IpcChannels.chatSelectStandalone, ProjectStateViewResultSchema, input),
		fork: async (input) => safeInvokeParse(IpcChannels.chatFork, ProjectStateViewResultSchema, input),
		clone: async (input) => safeInvokeParse(IpcChannels.chatClone, ProjectStateViewResultSchema, input),
		branch: async (input) => safeInvokeParse(IpcChannels.chatBranch, ProjectStateViewResultSchema, input),
```

In `src/renderer/app-api/http-client.ts`, add methods to `chat`:

```ts
			rename: (input) => callRpc("chat.rename", input),
			selectStandalone: (input) => callRpc("chat.selectStandalone", input),
			fork: (input) => callRpc("chat.fork", input),
			clone: (input) => callRpc("chat.clone", input),
			branch: (input) => callRpc("chat.branch", input),
```

In `src/renderer/app-api/unavailable-api.ts`, add the same methods using the existing unavailable function:

```ts
			rename: unavailable,
			selectStandalone: unavailable,
			fork: unavailable,
			clone: unavailable,
			branch: unavailable,
```

- [ ] **Step 6: Register Electron IPC handlers**

In `src/main/index.ts`, add handlers matching existing `chat.create` and `chat.select` style:

```ts
ipcMain.handle(IpcChannels.chatRename, (_event, input) => backend.handle({ operation: "chat.rename", input }));
ipcMain.handle(IpcChannels.chatSelectStandalone, (_event, input) =>
	backend.handle({ operation: "chat.selectStandalone", input }),
);
ipcMain.handle(IpcChannels.chatFork, (_event, input) => backend.handle({ operation: "chat.fork", input }));
ipcMain.handle(IpcChannels.chatClone, (_event, input) => backend.handle({ operation: "chat.clone", input }));
ipcMain.handle(IpcChannels.chatBranch, (_event, input) => backend.handle({ operation: "chat.branch", input }));
```

- [ ] **Step 7: Run routing and client tests to verify pass**

Run:

```bash
pnpm vitest run tests/main/app-backend.test.ts tests/main/local-dev-server.test.ts tests/renderer/http-client.test.ts tests/renderer/unavailable-api.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit backend and API wiring**

```bash
git add src/main/app-backend.ts src/main/index.ts src/main/dev-server/local-dev-server.ts src/preload/index.ts src/renderer/app-api/http-client.ts src/renderer/app-api/unavailable-api.ts tests/main/app-backend.test.ts tests/main/local-dev-server.test.ts tests/renderer/http-client.test.ts tests/renderer/unavailable-api.test.ts
git commit -m "feat: wire session management backend api"
```

---

### Task 8: Make sidebar filters and show-more behavior data-backed

**Files:**
- Modify: `src/renderer/projects/project-view-model.ts`
- Modify: `tests/renderer/project-view-model.test.ts`

- [ ] **Step 1: Write failing view-model tests for filters and show-more expansion**

Append to `tests/renderer/project-view-model.test.ts`:

```ts
it("filters project chat rows by failed and attention status", () => {
	const failed = createChat({ id: "chat:failed", status: "failed", title: "Failed" });
	const running = createChat({ id: "chat:running", status: "running", title: "Running", attention: true });
	const idle = createChat({ id: "chat:idle", status: "idle", title: "Idle" });
	const project = createProject({ chats: [failed, running, idle] });
	const view: ProjectStateView = {
		projects: [project],
		standaloneChats: [],
		selectedProjectId: project.id,
		selectedChatId: null,
		selectedProject: project,
		selectedChat: null,
	};

	expect(createProjectSidebarRows(view, fixedNow, { chatFilter: "attention" })[0]?.children).toEqual([
		expect.objectContaining({ chatId: "chat:failed" }),
		expect.objectContaining({ chatId: "chat:running" }),
	]);
});

it("expands project chat rows when showMore is true", () => {
	const chats = Array.from({ length: 6 }, (_, index) => createChat({ id: `chat:${index + 1}`, title: `Chat ${index + 1}` }));
	const project = createProject({ chats });
	const view: ProjectStateView = {
		projects: [project],
		standaloneChats: [],
		selectedProjectId: project.id,
		selectedChatId: null,
		selectedProject: project,
		selectedChat: null,
	};

	expect(createProjectSidebarRows(view, fixedNow, { expandedProjectIds: new Set([project.id]) })[0]?.children).toHaveLength(6);
});
```

- [ ] **Step 2: Run view-model tests to verify failure**

Run:

```bash
pnpm vitest run tests/renderer/project-view-model.test.ts
```

Expected: FAIL because `createProjectSidebarRows` does not accept filter or expansion options.

- [ ] **Step 3: Add data-backed filter and expansion options**

In `src/renderer/projects/project-view-model.ts`, add types:

```ts
export type ChatFilter = "all" | "attention" | "failed" | "running";

export interface ProjectSidebarRowOptions {
	chatFilter?: ChatFilter;
	expandedProjectIds?: ReadonlySet<string>;
	expandStandaloneChats?: boolean;
}
```

Add helper:

```ts
const filterChats = <T extends { status: ChatMetadata["status"]; attention: boolean }>(
	chats: readonly T[],
	filter: ChatFilter,
): T[] => {
	if (filter === "attention") return chats.filter((chat) => chat.attention || chat.status === "failed" || chat.status === "running");
	if (filter === "failed") return chats.filter((chat) => chat.status === "failed");
	if (filter === "running") return chats.filter((chat) => chat.status === "running");
	return [...chats];
};
```

Replace the `children:` expression in `createProjectSidebarRows` with:

```ts
		children: createChatRows({
			chats: filterChats(project.chats, options.chatFilter ?? "all"),
			selectedChatId: view.selectedChatId,
			now,
			expanded: options.expandedProjectIds?.has(project.id) ?? false,
		}),
```

Add helper used above:

```ts
const createChatRows = ({
	chats,
	selectedChatId,
	now,
	expanded,
}: {
	chats: readonly (ChatMetadata | StandaloneChatMetadata)[];
	selectedChatId: string | null;
	now: Date;
	expanded: boolean;
}): SidebarChatRow[] => {
	if (chats.length === 0) return [{ kind: "empty", label: "No chats" }];
	const visibleChats = expanded ? chats : chats.slice(0, visibleChatLimit);
	const rows = visibleChats.map((chat) => createChatSidebarRow(chat, selectedChatId, now));
	if (!expanded && chats.length > visibleChatLimit) {
		rows.push({ kind: "show-more", label: "Show more", hiddenCount: chats.length - visibleChatLimit });
	}
	return rows;
};
```

Update function signatures:

```ts
export const createProjectSidebarRows = (
	view: ProjectStateView,
	now = new Date(),
	options: ProjectSidebarRowOptions = {},
): SidebarProjectRow[] =>
```

```ts
export const createStandaloneChatSidebarRows = (
	view: ProjectStateView,
	now = new Date(),
	options: ProjectSidebarRowOptions = {},
): SidebarChatRow[] => {
	const selectedChatId = view.selectedProjectId === null ? view.selectedChatId : null;
	return createChatRows({
		chats: filterChats(view.standaloneChats, options.chatFilter ?? "all"),
		selectedChatId,
		now,
		expanded: options.expandStandaloneChats ?? false,
	});
};
```

- [ ] **Step 4: Run view-model tests to verify pass**

Run:

```bash
pnpm vitest run tests/renderer/project-view-model.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit view model filter changes**

```bash
git add src/renderer/projects/project-view-model.ts tests/renderer/project-view-model.test.ts
git commit -m "feat: back sidebar filters with chat metadata"
```

---

### Task 9: Enable sidebar project and chat management UI

**Files:**
- Modify: `src/renderer/components/project-sidebar.tsx`
- Modify: `src/renderer/styles.css`
- Modify: `tests/renderer/chat-shell.test.ts`
- Modify: `tests/smoke/app.spec.ts`

- [ ] **Step 1: Write failing renderer tests for enabled actions**

Add to `tests/renderer/chat-shell.test.ts` or the existing sidebar renderer test file if one exists after current code inspection:

```tsx
it("enables rename, locate, fork, clone, filter, and show-more controls from metadata", async () => {
	const user = userEvent.setup();
	const project = createProject({
		availability: { status: "missing", checkedAt: "2026-05-12T12:00:00.000Z" },
		chats: Array.from({ length: 6 }, (_, index) => createChat({ id: `chat:${index + 1}`, title: `Chat ${index + 1}` })),
	});
	const state = createProjectState({ projects: [project], selectedProjectId: project.id });
	const onProjectState = vi.fn();
	render(<ProjectSidebar state={state} collapsed={false} onToggleCollapsed={vi.fn()} onProjectState={onProjectState} />);

	await user.click(screen.getByLabelText(`${project.displayName} menu`));
	expect(screen.getByRole("menuitem", { name: /Rename project/i })).toBeEnabled();
	expect(screen.getByRole("menuitem", { name: /Locate folder/i })).toBeEnabled();
	expect(screen.getByRole("menuitem", { name: /Clone current branch/i })).toBeEnabled();
	expect(screen.getByRole("menuitem", { name: /Fork chat/i })).toBeEnabled();

	await user.click(screen.getByRole("button", { name: /Show more/i }));
	expect(screen.getByText("Chat 6")).toBeVisible();
});
```

If the repository lacks React Testing Library helpers, put this coverage in `tests/smoke/app.spec.ts` with Playwright selectors instead:

```ts
await window.getByLabel("Filter projects").click();
await expect(window.getByText("All chats")).toBeVisible();
await window.getByRole("button", { name: /Show more/i }).click();
await expect(window.getByText("Chat 6")).toBeVisible();
```

- [ ] **Step 2: Run renderer/sidebar tests to verify failure**

Run:

```bash
pnpm vitest run tests/renderer/chat-shell.test.ts
```

Expected: FAIL because project rename, locate, fork, clone, filter state changes, and show-more expansion are disabled or not wired.

- [ ] **Step 3: Add sidebar state for filters and expanded chat groups**

In `src/renderer/components/project-sidebar.tsx`, import the filter type:

```ts
import type { ChatFilter } from "../projects/project-view-model";
```

Add state in `ProjectSidebar`:

```ts
	const [chatFilter, setChatFilter] = useState<ChatFilter>("all");
	const [expandedProjectChatIds, setExpandedProjectChatIds] = useState<Set<string>>(() => new Set());
	const [standaloneExpanded, setStandaloneExpanded] = useState(false);
```

Update row creation:

```ts
	const rows = createProjectSidebarRows(state, new Date(), { chatFilter, expandedProjectIds: expandedProjectChatIds });
	const standaloneChatRows = createStandaloneChatSidebarRows(state, new Date(), {
		chatFilter,
		expandStandaloneChats: standaloneExpanded,
	});
```

Add handlers:

```ts
	const expandProjectChats = (projectId: string) => {
		setExpandedProjectChatIds((current) => new Set(current).add(projectId));
	};
```

Pass `chatFilter`, `setChatFilter`, `expandProjectChats`, and `setStandaloneExpanded` to menu/project render helpers.

- [ ] **Step 4: Enable project rename and locate folder actions**

In `ProjectMenu`, replace the disabled rename item with:

```tsx
<MenuItem
	onClick={() => {
		const displayName = window.prompt("Rename project", row.project.displayName);
		if (!displayName?.trim()) return;
		void runProjectAction(() =>
			window.piDesktop.project.rename({ projectId: row.projectId, displayName: displayName.trim() }),
		);
	}}
>
	<MenuItemIcon>
		<Pencil />
	</MenuItemIcon>
	Rename project
</MenuItem>
```

Add locate folder item when `projectFolderUnavailable` is true:

```tsx
{projectFolderUnavailable ? (
	<MenuItem onClick={() => runProjectAction(() => window.piDesktop.project.locateFolder({ projectId: row.projectId }))}>
		<MenuItemIcon>
			<FolderOpen />
		</MenuItemIcon>
		Locate folder
	</MenuItem>
) : null}
```

- [ ] **Step 5: Enable chat fork, clone, rename, and show-more actions**

For each chat row button, add a small menu button with these actions:

```tsx
<MenuItem
	disabled={!child.sessionPath}
	onClick={() => runProjectAction(() => window.piDesktop.chat.rename({ projectId: row.projectId, chatId: child.chatId, title: window.prompt("Rename chat", child.label)?.trim() || child.label }))}
>
	<MenuItemIcon><Pencil /></MenuItemIcon>
	Rename chat
</MenuItem>
<MenuItem disabled={!child.sessionPath} onClick={() => runProjectAction(() => window.piDesktop.chat.fork({ projectId: row.projectId, chatId: child.chatId }))}>
	<MenuItemIcon><ExternalLink /></MenuItemIcon>
	Fork chat
</MenuItem>
<MenuItem disabled={!child.sessionPath} onClick={() => runProjectAction(() => window.piDesktop.chat.clone({ projectId: row.projectId, chatId: child.chatId }))}>
	<MenuItemIcon><Archive /></MenuItemIcon>
	Clone current branch
</MenuItem>
```

Replace disabled show-more buttons:

```tsx
<button
	className="project-sidebar__show-more"
	key={`${row.projectId}:show-more`}
	type="button"
	tabIndex={closed ? -1 : undefined}
	onClick={() => expandProjectChats(row.projectId)}
>
	{child.label} {child.hiddenCount > 0 ? `(${child.hiddenCount})` : ""}
</button>
```

For standalone show-more:

```tsx
<button className="project-sidebar__show-more" key="standalone:show-more" type="button" onClick={() => setStandaloneExpanded(true)}>
	{child.label} {child.hiddenCount > 0 ? `(${child.hiddenCount})` : ""}
</button>
```

- [ ] **Step 6: Wire standalone selection through backend**

Replace `selectStandaloneChat` implementation:

```ts
	const selectStandaloneChat = (chatId: string) => {
		void runProjectAction(() => window.piDesktop.chat.selectStandalone({ chatId }));
	};
```

- [ ] **Step 7: Make filter menu update real filter state**

Change `SidebarFilterMenu` props:

```ts
interface SidebarFilterMenuProps {
	moveDirection: "up" | "down";
	chatFilter: ChatFilter;
	onChatFilter: (filter: ChatFilter) => void;
}
```

Replace the Show section items with enabled buttons:

```tsx
<MenuItem onClick={() => onChatFilter("all")}>
	<MenuItemIcon><MessageCircle /></MenuItemIcon>
	All chats
	{chatFilter === "all" ? <MenuSelectionIndicator><Check /></MenuSelectionIndicator> : null}
</MenuItem>
<MenuItem onClick={() => onChatFilter("attention")}>
	<MenuItemIcon><Star /></MenuItemIcon>
	Needs attention
	{chatFilter === "attention" ? <MenuSelectionIndicator><Check /></MenuSelectionIndicator> : null}
</MenuItem>
<MenuItem onClick={() => onChatFilter("failed")}>
	<MenuItemIcon><X /></MenuItemIcon>
	Failed
	{chatFilter === "failed" ? <MenuSelectionIndicator><Check /></MenuSelectionIndicator> : null}
</MenuItem>
<MenuItem onClick={() => onChatFilter("running")}>
	<MenuItemIcon><Clock /></MenuItemIcon>
	Running
	{chatFilter === "running" ? <MenuSelectionIndicator><Check /></MenuSelectionIndicator> : null}
</MenuItem>
```

- [ ] **Step 8: Run renderer tests to verify pass**

Run:

```bash
pnpm vitest run tests/renderer/project-view-model.test.ts tests/renderer/chat-shell.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit sidebar UI actions**

```bash
git add src/renderer/components/project-sidebar.tsx src/renderer/styles.css tests/renderer/chat-shell.test.ts tests/smoke/app.spec.ts
git commit -m "feat: enable sidebar session management actions"
```

---

### Task 10: Resume selected project and projectless chats from App state

**Files:**
- Modify: `src/main/projects/project-service.ts`
- Modify: `src/renderer/App.tsx`
- Modify: `tests/renderer/app-session-scope.test.ts`
- Modify: `tests/main/project-service.test.ts`

- [ ] **Step 1: Write failing start-target service tests**

Append to `tests/main/project-service.test.ts`:

```ts
it("returns an existing project chat session path as the session start target", async () => {
	const projectPath = await mkdtemp(join(tmpdir(), "pi-start-target-"));
	const project = createProject(projectPath);
	const chat = {
		id: "chat:session:start",
		projectId: project.id,
		source: "pi-session" as const,
		sessionId: "start",
		sessionPath: join(projectPath, "start.jsonl"),
		cwd: projectPath,
		title: "Start",
		status: "idle" as const,
		attention: false,
		createdAt: firstNow,
		updatedAt: firstNow,
		lastOpenedAt: null,
	};
	const { service } = await createService({
		initialStore: {
			...createEmptyProjectStore(),
			projects: [project],
			chatsByProject: { [project.id]: [chat] },
		},
	});

	await expect(service.getSessionStartTarget({ projectId: project.id, chatId: chat.id })).resolves.toEqual({
		projectId: project.id,
		chatId: chat.id,
		workspacePath: projectPath,
		sessionPath: chat.sessionPath,
	});
});

it("returns a standalone chat cwd as the session start target", async () => {
	const chat = {
		id: "chat:standalone",
		source: "pi-session" as const,
		sessionId: "standalone",
		sessionPath: "/tmp/standalone.jsonl",
		cwd: "/tmp/outside",
		title: "Standalone",
		status: "idle" as const,
		attention: false,
		createdAt: firstNow,
		updatedAt: firstNow,
		lastOpenedAt: null,
	};
	const { service } = await createService({
		initialStore: {
			...createEmptyProjectStore(),
			standaloneChats: [chat],
		},
	});

	await expect(service.getSessionStartTarget({ projectId: null, chatId: chat.id })).resolves.toEqual({
		projectId: null,
		chatId: chat.id,
		workspacePath: "/tmp/outside",
		sessionPath: "/tmp/standalone.jsonl",
	});
});
```

- [ ] **Step 2: Run start-target tests to verify failure**

Run:

```bash
pnpm vitest run tests/main/project-service.test.ts
```

Expected: FAIL because `getSessionStartTarget` is not implemented.

- [ ] **Step 3: Implement start target and status recording service methods**

In `src/main/projects/project-service.ts`, add types:

```ts
export type SessionStartTargetInput = { projectId: string | null; chatId: string | null };
export type SessionStartTarget = { projectId: string | null; chatId: string | null; workspacePath: string; sessionPath: string | null };
export type SessionStartedInput = { projectId: string | null; chatId: string | null; sessionId: string; sessionPath: string | null; status: ChatMetadata["status"] };
export type SessionStatusInput = { sessionId: string; status: ChatMetadata["status"]; attention: boolean; updatedAt: string };
```

Extend `ProjectService`:

```ts
	getSessionStartTarget: (input: SessionStartTargetInput) => Promise<SessionStartTarget>;
	recordSessionStarted: (input: SessionStartedInput) => Promise<void>;
	recordSessionStatus: (input: SessionStatusInput) => Promise<void>;
```

Add methods:

```ts
		async getSessionStartTarget(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				if (input.projectId === null) {
					const chat = store.standaloneChats.find((candidate) => candidate.id === input.chatId);
					if (!chat) throw new Error("Select a project or existing standalone chat to start a Pi session.");
					return { projectId: null, chatId: chat.id, workspacePath: chat.cwd, sessionPath: chat.sessionPath };
				}

				const projectIndex = findProjectIndex(store, input.projectId);
				await refreshProjectAvailabilityAtIndex(store, projectIndex, deps.now());
				const project = store.projects[projectIndex];
				if (project.availability.status === "missing") {
					await deps.store.save(store);
					throw new Error("Project folder is missing. Locate the folder before starting a Pi session.");
				}
				if (project.availability.status === "unavailable") {
					await deps.store.save(store);
					throw new Error(project.availability.reason);
				}
				const chat = input.chatId
					? (store.chatsByProject[input.projectId] ?? []).find((candidate) => candidate.id === input.chatId)
					: null;
				return {
					projectId: input.projectId,
					chatId: chat?.id ?? input.chatId,
					workspacePath: project.path,
					sessionPath: chat?.sessionPath ?? null,
				};
			});
		},

		async recordSessionStarted(input) {
			if (!input.sessionPath) return;
			return runSerialized(async () => {
				const store = await deps.store.load();
				store.sessionUiByPath[input.sessionPath] = {
					chatId: input.chatId ?? `chat:session:${input.sessionId}`,
					sessionId: input.sessionId,
					sessionPath: input.sessionPath,
					projectId: input.projectId,
					lastOpenedAt: deps.now(),
					status: input.status,
					attention: false,
				};
				await deps.store.save(store);
			});
		},

		async recordSessionStatus(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				for (const [sessionPath, ui] of Object.entries(store.sessionUiByPath)) {
					if (ui.sessionId && (input.sessionId === ui.sessionId || input.sessionId.endsWith(ui.sessionId))) {
						store.sessionUiByPath[sessionPath] = {
							...ui,
							status: input.status,
							attention: input.attention,
							lastOpenedAt: input.updatedAt,
						};
					}
				}
				await deps.store.save(store);
			});
		},
```

- [ ] **Step 4: Update `src/renderer/App.tsx` to pass chat scope to runtime start**

Change selected chat id derivation so standalone selected chats work:

```ts
	const selectedProjectId = projectState.selectedProjectId;
	const selectedChatId = projectState.selectedChatId;
```

Allow submit when a standalone selected chat has a session path:

```ts
			const selectedProject = projectState.selectedProject;
			const selectedChat = projectState.selectedChat;
			const canStartProjectSession = selectedProject?.availability.status === "available";
			const canStartStandaloneResume = !selectedProject && selectedChat?.sessionPath;
			if (!canStartProjectSession && !canStartStandaloneResume) {
				setSessionState((current) => ({
					...current,
					status: "failed",
					statusLabel: "Failed",
					errorMessage: "Select an available project or existing standalone chat to start a Pi session.",
					retryMessage: "",
				}));
				return false;
			}
```

Set request ids:

```ts
			const requestProjectId = selectedProject?.id ?? null;
			const requestChatId = selectedChat?.id ?? null;
```

Call start with chat id:

```ts
			const result = reusableSessionId
				? await window.piDesktop.piSession.submit({ sessionId: reusableSessionId, prompt })
				: await window.piDesktop.piSession.start({ projectId: requestProjectId, chatId: requestChatId, prompt });
```

After successful start and after terminal statuses, refresh project state:

```ts
			if (result.ok) {
				applyProjectStateViewResult(await window.piDesktop.project.getState());
			}
```

- [ ] **Step 5: Run service and renderer scope tests to verify pass**

Run:

```bash
pnpm vitest run tests/main/project-service.test.ts tests/renderer/app-session-scope.test.ts tests/renderer/session-state.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit resume wiring**

```bash
git add src/main/projects/project-service.ts src/renderer/App.tsx tests/main/project-service.test.ts tests/renderer/app-session-scope.test.ts
git commit -m "feat: resume selected session chats"
```

---

### Task 11: Update main chat surface for real session metadata states

**Files:**
- Modify: `src/renderer/chat/chat-view-model.ts`
- Modify: `src/renderer/components/chat-shell.tsx`
- Modify: `src/renderer/components/project-main.tsx`
- Modify: `tests/renderer/chat-view-model.test.ts`
- Modify: `tests/renderer/chat-shell.test.ts`

- [ ] **Step 1: Write failing chat route tests**

Append to `tests/renderer/chat-view-model.test.ts`:

```ts
it("creates a resumable standalone chat route", () => {
	const chat = {
		id: "chat:standalone",
		source: "pi-session" as const,
		sessionId: "standalone",
		sessionPath: "/tmp/standalone.jsonl",
		cwd: "/tmp/outside",
		title: "Standalone",
		status: "idle" as const,
		attention: false,
		createdAt: "2026-05-12T09:00:00.000Z",
		updatedAt: "2026-05-12T10:00:00.000Z",
		lastOpenedAt: null,
	};
	const route = createChatShellRoute({
		projects: [],
		standaloneChats: [chat],
		selectedProjectId: null,
		selectedChatId: chat.id,
		selectedProject: null,
		selectedChat: chat,
	});

	expect(route).toEqual(
		expect.objectContaining({
			kind: "chat",
			title: "Standalone",
			projectSelectorLabel: "/tmp/outside",
			resumeLabel: "Resume session",
		}),
	);
});
```

- [ ] **Step 2: Run chat route tests to verify failure**

Run:

```bash
pnpm vitest run tests/renderer/chat-view-model.test.ts tests/renderer/chat-shell.test.ts
```

Expected: FAIL because standalone selected chats do not produce a resumable chat route.

- [ ] **Step 3: Extend `createChatShellRoute` for standalone chats and metadata labels**

In `src/renderer/chat/chat-view-model.ts`, add fields to the chat route type:

```ts
	resumeLabel: "Start session" | "Resume session";
	metadataLabel: string;
```

When `view.selectedChat` exists, return:

```ts
	return {
		kind: "chat",
		title: view.selectedChat.title,
		projectId: view.selectedProjectId,
		chatId: view.selectedChat.id,
		projectSelectorLabel: view.selectedProject?.displayName ?? view.selectedChat.cwd,
		composerDisabledReason: "",
		resumeLabel: view.selectedChat.sessionPath ? "Resume session" : "Start session",
		metadataLabel: `${view.selectedChat.status} · updated ${new Date(view.selectedChat.updatedAt).toLocaleString()}`,
	};
```

- [ ] **Step 4: Render resume and metadata labels in `ChatShell`**

In `src/renderer/components/chat-shell.tsx`, near the chat title, render:

```tsx
{route.kind === "chat" ? (
	<div className="chat-shell__metadata">
		<span>{route.resumeLabel}</span>
		<span>{route.metadataLabel}</span>
	</div>
) : null}
```

Add CSS in `src/renderer/styles.css`:

```css
.chat-shell__metadata {
	display: flex;
	gap: 0.5rem;
	color: color-mix(in srgb, var(--foreground) 64%, transparent);
	font-size: 0.8125rem;
}
```

- [ ] **Step 5: Run chat route and shell tests to verify pass**

Run:

```bash
pnpm vitest run tests/renderer/chat-view-model.test.ts tests/renderer/chat-shell.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit chat surface metadata changes**

```bash
git add src/renderer/chat/chat-view-model.ts src/renderer/components/chat-shell.tsx src/renderer/components/project-main.tsx src/renderer/styles.css tests/renderer/chat-view-model.test.ts tests/renderer/chat-shell.test.ts
git commit -m "feat: show resumable session metadata"
```

---

### Task 12: End-to-end verification and documentation alignment

**Files:**
- Modify: `docs/superpowers/specs/2026-05-12-pi-desktop-high-level-roadmap.md`
- Modify: `docs/adr/0001-keep-custom-pi-session-chat-state.md`
- Modify: `docs/diagrams/pi-desktop-state-and-session-model.html`
- Modify: `README.md` if M04 changes dev commands or manual verification instructions
- Test: `tests/smoke/app.spec.ts`
- Test: `tests/smoke/dev-web.spec.ts`

- [ ] **Step 1: Add smoke coverage for persisted sessions and recovery paths**

Update `tests/smoke/app.spec.ts` with a smoke path that verifies visible M04 controls:

```ts
test("shows M04 project and session management controls", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByLabel("Project navigation")).toBeVisible();
	await expect(page.getByLabel("Add project")).toBeVisible();
	await expect(page.getByLabel("Filter projects")).toBeVisible();
	await expect(page.getByLabel("Filter chats")).toBeVisible();
	await expect(page.getByText("Projects")).toBeVisible();
	await expect(page.getByText("Chats")).toBeVisible();
});
```

- [ ] **Step 2: Run targeted M04 verification**

Run:

```bash
pnpm vitest run tests/shared/project-state.test.ts tests/shared/ipc.test.ts tests/shared/app-transport.test.ts tests/main/pi-session-index.test.ts tests/main/project-service.test.ts tests/main/app-backend.test.ts tests/main/pi-session-runtime.test.ts tests/renderer/project-view-model.test.ts tests/renderer/chat-view-model.test.ts tests/renderer/app-session-scope.test.ts tests/renderer/http-client.test.ts tests/renderer/unavailable-api.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run full unit test suite**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 4: Run typecheck and lint**

Run:

```bash
pnpm typecheck && pnpm lint
```

Expected: PASS.

- [ ] **Step 5: Run smoke tests**

Run:

```bash
pnpm test:smoke
```

Expected: PASS. If the smoke suite cannot run because the host lacks Electron display permissions, record the exact error output in the PR notes and keep `pnpm test`, `pnpm typecheck`, and `pnpm lint` passing.

- [ ] **Step 6: Update roadmap status and ADR context**

In `docs/superpowers/specs/2026-05-12-pi-desktop-high-level-roadmap.md`, change the M04 heading from:

```markdown
⏳ ### M04: Project and Session Management
```

to:

```markdown
✅ ### M04: Project and Session Management
```

Append this sentence under the M04 acceptance list:

```markdown
Status: implemented with Pi `SessionManager` metadata as the source of persisted sessions, desktop JSON metadata for UI state, and custom `LiveSessionState` retained for live streaming.
```

In `docs/adr/0001-keep-custom-pi-session-chat-state.md`, append under Consequences:

```markdown
- M04 uses Pi `SessionManager` for session listing, resume, names, fork, clone, and JSONL-backed metadata while keeping renderer live streaming state in `LiveSessionState`.
```

- [ ] **Step 7: Update the state/session diagram**

Open `docs/diagrams/pi-desktop-state-and-session-model.html` and add these labels to the existing local-store and runtime boundary sections:

```html
<li>Project JSON store: projects, selected chat ids, session UI status, attention, last-opened timestamps</li>
<li>Pi SessionManager: JSONL session list, session names, resume files, fork and clone source data</li>
<li>Runtime adapter: opens new or existing SessionManager instances and emits LiveSessionState events</li>
```

Keep the existing diagram style and only add these bullets in the relevant boxes.

- [ ] **Step 8: Commit verification docs and smoke updates**

```bash
git add docs/superpowers/specs/2026-05-12-pi-desktop-high-level-roadmap.md docs/adr/0001-keep-custom-pi-session-chat-state.md docs/diagrams/pi-desktop-state-and-session-model.html README.md tests/smoke/app.spec.ts tests/smoke/dev-web.spec.ts
git commit -m "docs: record milestone 4 session management"
```

---

## Manual acceptance checklist

Run the app with:

```bash
pnpm dev:desktop
```

Verify:

- Create project opens a new folder-backed project and selects it.
- Add existing folder tracks the selected folder and selects it.
- Rename project changes only the sidebar display name.
- Remove project removes it from the sidebar and leaves files on disk.
- Pin project moves it above unpinned projects after refresh.
- Open in Finder opens an available project folder.
- Moving a tracked folder marks it missing on reload.
- Locate folder restores a missing project and preserves session chat rows.
- A Pi-backed project chat appears after a successful session is persisted by Pi.
- Selecting that chat and submitting a prompt resumes the same Pi session file.
- Rename chat writes a Pi session name and refreshes the sidebar title.
- Failed or active sessions show status and attention indicators.
- Filter menu changes visible rows for All, Needs attention, Failed, and Running.
- Show more expands hidden chat rows.
- Standalone chats appear from Pi sessions outside tracked projects.
- Selecting a standalone chat uses its Pi session cwd and can resume when the session file exists.
- Fork chat creates a new Pi session file in the project session directory.
- Clone current branch creates a new Pi session file for the current leaf.
- Sidebar management failures display through the existing project status message.

## Self-review

Spec coverage:
- Complete project actions: Tasks 3, 7, and 9 cover create, add existing folder, select, rename, remove, pin, locate missing folder, and open in Finder.
- Project availability checks with recovery paths: Tasks 3, 9, and manual checklist cover missing folder refresh, locate, and remove.
- Project chat list backed by real session metadata: Tasks 2 and 3 derive project chats from `SessionManager.list()`.
- Projectless chat list backed by real session metadata: Tasks 2, 3, and 10 derive standalone chats from `SessionManager.listAll()` and allow existing standalone resume.
- Session list for active project: Tasks 2, 3, and 8 expose project session rows in recency order.
- Resume existing session: Tasks 6, 7, and 10 open existing session files through `SessionManager.open()`.
- Session names and metadata persistence: Tasks 1, 5, 7, and 10 persist UI state and write Pi `session_info` names.
- Last-updated labels, status indicators, attention indicators, filters, and show-more behavior: Tasks 1, 8, 9, and 11 cover labels and real UI controls.
- Branch/fork/clone support where Pi SDK exposes stable APIs: Tasks 5 and 7 implement fork, clone, and typed branch operations with stable `SessionManager` methods.

Placeholder scan:
- The plan contains no unresolved placeholder markers and no unspecified error-handling instructions.

Type consistency:
- `ChatMetadata`, `StandaloneChatMetadata`, `ProjectStateView`, `ProjectService`, `PiSessionStartInput`, and `PiSessionStartPayload` names are consistent across tasks.
- Chat action names are consistent across shared schemas, RPC operations, preload API, HTTP client, backend routing, and renderer calls.
