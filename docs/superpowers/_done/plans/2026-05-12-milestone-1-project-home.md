# Milestone 1 Project Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Codex-like project and chat sidebar where users can create, add, select, persist, and recover local projects.

**Architecture:** Shared Zod schemas define project, chat, and IPC DTO contracts. Electron main owns JSON persistence, filesystem checks, native dialogs, git initialization, and Finder integration. The renderer consumes typed preload APIs and renders sidebar project navigation plus global/project empty states.

**Tech Stack:** Electron, React 19, TypeScript, Zod, Vitest, Playwright Electron, pnpm.

---

## File Structure

- Create `src/shared/project-state.ts`: project/chat schemas, store schema, renderer DTO schema, sorting and selection helpers.
- Modify `src/shared/ipc.ts`: replace workspace-specific IPC with project/chat IPC contracts while keeping app version IPC.
- Modify `src/shared/preload-api.ts`: expose typed project and chat API methods.
- Create `src/main/projects/project-store.ts`: read/write `project-store.json` in Electron user data with strict validation.
- Create `src/main/projects/project-paths.ts`: derive the next `New project N` folder under the documents directory.
- Create `src/main/projects/git.ts`: initialize a repository and ensure branch `main`.
- Create `src/main/projects/project-service.ts`: orchestrate store, filesystem, dialogs, git, shell open, and project state DTOs.
- Modify `src/main/index.ts`: create the project service and register project/chat IPC handlers.
- Modify `src/preload/index.ts`: call the new IPC channels and validate results.
- Modify `src/renderer/App.tsx`: load project state and route actions through preload APIs.
- Create `src/renderer/projects/project-view-model.ts`: pure renderer labels, selected project/chat derivation, and empty-state text.
- Create `src/renderer/components/project-sidebar.tsx`: sidebar project list, add-project menu, overflow menu, nested chats.
- Create `src/renderer/components/project-main.tsx`: global empty state, project empty state, missing-folder recovery, static chat route.
- Create `src/renderer/components/composer.tsx`: non-submitting composer shell with project selector label.
- Modify `src/renderer/components/app-shell.tsx`: compose sidebar and main project UI.
- Modify `src/renderer/styles.css`: add focused layout styles needed by menus, sidebar rows, composer, and missing-folder warnings.
- Modify `vitest.config.ts`: include main project service tests and coverage for `src/main/projects`.
- Create `tests/shared/project-state.test.ts`: schemas, sorting, recovery metadata, name helpers.
- Modify `tests/shared/ipc.test.ts`: project/chat IPC contract coverage.
- Create `tests/main/project-store.test.ts`: JSON store read/write validation.
- Create `tests/main/project-paths.test.ts`: next new-project folder selection.
- Create `tests/main/git.test.ts`: git initialization uses `main`.
- Create `tests/main/project-service.test.ts`: service behavior with temp dirs and faked dialogs.
- Modify `tests/smoke/app.spec.ts`: Milestone 1 empty-state smoke coverage.

---

### Task 1: Shared Project State Contracts

**Files:**
- Create: `src/shared/project-state.ts`
- Create: `tests/shared/project-state.test.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Write failing shared state tests**

Add `tests/shared/project-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	createEmptyProjectStore,
	createProjectId,
	createProjectStateView,
	getNextNewProjectName,
	ProjectStoreSchema,
	sortProjects,
} from "../../src/shared/project-state";

describe("project state contracts", () => {
	it("creates a valid empty store so first launch has no selected project", () => {
		const store = createEmptyProjectStore();

		expect(ProjectStoreSchema.parse(store)).toEqual(store);
		expect(store.projects).toEqual([]);
		expect(store.selectedProjectId).toBeNull();
		expect(store.chatsByProject).toEqual({});
	});

	it("sorts pinned projects first, then recent unpinned projects", () => {
		const projects = [
			{
				id: "project:beta",
				displayName: "beta",
				path: "/tmp/beta",
				createdAt: "2026-05-12T10:00:00.000Z",
				updatedAt: "2026-05-12T10:00:00.000Z",
				lastOpenedAt: "2026-05-12T10:00:00.000Z",
				pinned: false,
				availability: { status: "available" as const },
			},
			{
				id: "project:alpha",
				displayName: "alpha",
				path: "/tmp/alpha",
				createdAt: "2026-05-12T09:00:00.000Z",
				updatedAt: "2026-05-12T09:00:00.000Z",
				lastOpenedAt: "2026-05-12T09:00:00.000Z",
				pinned: true,
				availability: { status: "available" as const },
			},
		];

		expect(sortProjects(projects).map((project) => project.displayName)).toEqual(["alpha", "beta"]);
	});

	it("preserves chat metadata when a project is marked missing", () => {
		const store = {
			projects: [
				{
					id: "project:pi-desktop",
					displayName: "pi-desktop",
					path: "/missing/pi-desktop",
					createdAt: "2026-05-12T09:00:00.000Z",
					updatedAt: "2026-05-12T09:00:00.000Z",
					lastOpenedAt: "2026-05-12T09:00:00.000Z",
					pinned: false,
					availability: { status: "missing" as const, checkedAt: "2026-05-12T10:00:00.000Z" },
				},
			],
			selectedProjectId: "project:pi-desktop",
			selectedChatId: null,
			chatsByProject: {
				"project:pi-desktop": [
					{
						id: "chat:plan",
						projectId: "project:pi-desktop",
						title: "Plan project home milestone",
						status: "idle" as const,
						updatedAt: "2026-05-12T10:00:00.000Z",
					},
				],
			},
		};

		const view = createProjectStateView(ProjectStoreSchema.parse(store));

		expect(view.selectedProject?.availability.status).toBe("missing");
		expect(view.projects[0]?.chats.map((chat) => chat.title)).toEqual(["Plan project home milestone"]);
	});

	it("chooses the next available New project name", () => {
		expect(getNextNewProjectName(["New project", "New project 2", "Other"])).toBe("New project 3");
		expect(getNextNewProjectName([])).toBe("New project");
	});

	it("derives stable project ids from paths", () => {
		expect(createProjectId("/Users/gannonhall/Documents/New project 2")).toBe(
			"project:/Users/gannonhall/Documents/New project 2",
		);
	});
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm vitest run tests/shared/project-state.test.ts
```

Expected: FAIL because `src/shared/project-state.ts` does not exist.

- [ ] **Step 3: Implement shared schemas and helpers**

Create `src/shared/project-state.ts`:

```ts
import { z } from "zod";

export const ProjectAvailabilitySchema = z.discriminatedUnion("status", [
	z.strictObject({ status: z.literal("available"), checkedAt: z.string().datetime().optional() }),
	z.strictObject({ status: z.literal("missing"), checkedAt: z.string().datetime() }),
	z.strictObject({ status: z.literal("unavailable"), checkedAt: z.string().datetime(), reason: z.string().min(1) }),
]);

export const ProjectRecordSchema = z.strictObject({
	id: z.string().min(1),
	displayName: z.string().min(1),
	path: z.string().min(1),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	lastOpenedAt: z.string().datetime(),
	pinned: z.boolean(),
	availability: ProjectAvailabilitySchema,
});

export const ChatMetadataSchema = z.strictObject({
	id: z.string().min(1),
	projectId: z.string().min(1),
	title: z.string().min(1),
	status: z.enum(["idle", "running", "failed"]),
	updatedAt: z.string().datetime(),
});

export const ProjectStoreSchema = z.strictObject({
	projects: z.array(ProjectRecordSchema),
	selectedProjectId: z.string().min(1).nullable(),
	selectedChatId: z.string().min(1).nullable(),
	chatsByProject: z.record(z.string().min(1), z.array(ChatMetadataSchema)),
});

export const ProjectWithChatsSchema = ProjectRecordSchema.extend({
	chats: z.array(ChatMetadataSchema),
});

export const ProjectStateViewSchema = z.strictObject({
	projects: z.array(ProjectWithChatsSchema),
	selectedProjectId: z.string().min(1).nullable(),
	selectedChatId: z.string().min(1).nullable(),
	selectedProject: ProjectWithChatsSchema.nullable(),
	selectedChat: ChatMetadataSchema.nullable(),
});

export type ProjectAvailability = z.infer<typeof ProjectAvailabilitySchema>;
export type ProjectRecord = z.infer<typeof ProjectRecordSchema>;
export type ChatMetadata = z.infer<typeof ChatMetadataSchema>;
export type ProjectStore = z.infer<typeof ProjectStoreSchema>;
export type ProjectWithChats = z.infer<typeof ProjectWithChatsSchema>;
export type ProjectStateView = z.infer<typeof ProjectStateViewSchema>;

export const createEmptyProjectStore = (): ProjectStore => ({
	projects: [],
	selectedProjectId: null,
	selectedChatId: null,
	chatsByProject: {},
});

export const createProjectId = (projectPath: string) => `project:${projectPath}`;

export const sortProjects = <TProject extends Pick<ProjectRecord, "pinned" | "lastOpenedAt" | "displayName">>(
	projects: TProject[],
): TProject[] =>
	[...projects].sort((left, right) => {
		if (left.pinned !== right.pinned) {
			return left.pinned ? -1 : 1;
		}

		const recent = right.lastOpenedAt.localeCompare(left.lastOpenedAt);
		return recent === 0 ? left.displayName.localeCompare(right.displayName) : recent;
	});

export const sortChats = (chats: ChatMetadata[]): ChatMetadata[] =>
	[...chats].sort((left, right) => {
		const recent = right.updatedAt.localeCompare(left.updatedAt);
		return recent === 0 ? left.title.localeCompare(right.title) : recent;
	});

export const createProjectStateView = (store: ProjectStore): ProjectStateView => {
	const projects = sortProjects(store.projects).map((project) => ({
		...project,
		chats: sortChats(store.chatsByProject[project.id] ?? []),
	}));
	const selectedProject = projects.find((project) => project.id === store.selectedProjectId) ?? null;
	const selectedChat =
		selectedProject?.chats.find((chat) => chat.id === store.selectedChatId) ??
		projects.flatMap((project) => project.chats).find((chat) => chat.id === store.selectedChatId) ??
		null;

	return ProjectStateViewSchema.parse({
		projects,
		selectedProjectId: store.selectedProjectId,
		selectedChatId: store.selectedChatId,
		selectedProject,
		selectedChat,
	});
};

export const getNextNewProjectName = (existingNames: string[]) => {
	const names = new Set(existingNames);
	if (!names.has("New project")) {
		return "New project";
	}

	for (let index = 2; index < Number.MAX_SAFE_INTEGER; index += 1) {
		const candidate = `New project ${index}`;
		if (!names.has(candidate)) {
			return candidate;
		}
	}

	throw new Error("Unable to find an available New project name.");
};
```

Modify `vitest.config.ts` so main tests can be added later:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		include: ["tests/shared/**/*.test.ts", "tests/main/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			include: ["src/shared/**/*.ts", "src/renderer/shell/**/*.ts", "src/renderer/projects/**/*.ts", "src/main/projects/**/*.ts"],
			exclude: ["**/*.test.ts", "**/*.config.ts", "tests/**", "src/**/*.d.ts"],
			thresholds: {
				statements: 80,
				branches: 80,
				functions: 80,
				lines: 80,
			},
		},
	},
});
```

- [ ] **Step 4: Run the test and verify it passes**

Run:

```bash
pnpm vitest run tests/shared/project-state.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/project-state.ts tests/shared/project-state.test.ts vitest.config.ts
git commit -m "feat: add project state contracts"
```

---

### Task 2: JSON Store, Project Paths, and Git Initialization

**Files:**
- Create: `src/main/projects/project-store.ts`
- Create: `src/main/projects/project-paths.ts`
- Create: `src/main/projects/git.ts`
- Create: `tests/main/project-store.test.ts`
- Create: `tests/main/project-paths.test.ts`
- Create: `tests/main/git.test.ts`

- [ ] **Step 1: Write failing store and filesystem tests**

Add `tests/main/project-store.test.ts`:

```ts
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyProjectStore } from "../../src/shared/project-state";
import { createProjectStore } from "../../src/main/projects/project-store";

let tempDir: string;

beforeEach(async () => {
	tempDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-store-"));
});

afterEach(async () => {
	await rm(tempDir, { recursive: true, force: true });
});

describe("project store", () => {
	it("creates an empty store when no JSON file exists", async () => {
		const store = createProjectStore(path.join(tempDir, "project-store.json"));

		await expect(store.load()).resolves.toEqual(createEmptyProjectStore());
	});

	it("saves and loads valid project store JSON", async () => {
		const store = createProjectStore(path.join(tempDir, "project-store.json"));
		const data = {
			...createEmptyProjectStore(),
			selectedProjectId: "project:/tmp/pi-desktop",
		};

		await store.save(data);

		await expect(store.load()).resolves.toEqual(data);
		await expect(readFile(path.join(tempDir, "project-store.json"), "utf8")).resolves.toContain(
			"project:/tmp/pi-desktop",
		);
	});

	it("fails visibly on malformed JSON", async () => {
		const store = createProjectStore(path.join(tempDir, "project-store.json"));
		await writeFile(path.join(tempDir, "project-store.json"), "{bad", "utf8");

		await expect(store.load()).rejects.toThrow("Unable to parse project store JSON");
	});

	it("fails visibly on invalid store shape", async () => {
		const store = createProjectStore(path.join(tempDir, "project-store.json"));
		await writeFile(path.join(tempDir, "project-store.json"), JSON.stringify({ projects: null }), "utf8");

		await expect(store.load()).rejects.toThrow("Project store validation failed");
	});
});
```

Add `tests/main/project-paths.test.ts`:

```ts
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getNextScratchProjectPath } from "../../src/main/projects/project-paths";

let documentsDir: string;

beforeEach(async () => {
	documentsDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-documents-"));
});

afterEach(async () => {
	await rm(documentsDir, { recursive: true, force: true });
});

describe("scratch project paths", () => {
	it("uses New project when the name is available", async () => {
		await expect(getNextScratchProjectPath(documentsDir)).resolves.toBe(path.join(documentsDir, "New project"));
	});

	it("uses the next numbered project name", async () => {
		await mkdir(path.join(documentsDir, "New project"));
		await mkdir(path.join(documentsDir, "New project 2"));

		await expect(getNextScratchProjectPath(documentsDir)).resolves.toBe(path.join(documentsDir, "New project 3"));
	});
});
```

Add `tests/main/git.test.ts`:

```ts
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initializeGitRepository } from "../../src/main/projects/git";

const execFileAsync = promisify(execFile);
let projectDir: string;

beforeEach(async () => {
	projectDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-git-"));
	await mkdir(path.join(projectDir, "New project"));
	projectDir = path.join(projectDir, "New project");
});

afterEach(async () => {
	await rm(path.dirname(projectDir), { recursive: true, force: true });
});

describe("initializeGitRepository", () => {
	it("initializes git with main as the current branch", async () => {
		await initializeGitRepository(projectDir);

		const { stdout } = await execFileAsync("git", ["branch", "--show-current"], { cwd: projectDir });
		expect(stdout.trim()).toBe("main");
	});
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm vitest run tests/main/project-store.test.ts tests/main/project-paths.test.ts tests/main/git.test.ts
```

Expected: FAIL because the main project modules do not exist.

- [ ] **Step 3: Implement JSON store and filesystem helpers**

Create `src/main/projects/project-store.ts`:

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ZodError } from "zod";
import { createEmptyProjectStore, ProjectStoreSchema, type ProjectStore } from "../../shared/project-state";

export interface ProjectStoreFile {
	load: () => Promise<ProjectStore>;
	save: (store: ProjectStore) => Promise<void>;
}

const isMissingFileError = (error: unknown) =>
	typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";

export const createProjectStore = (storePath: string): ProjectStoreFile => ({
	load: async () => {
		let raw: string;

		try {
			raw = await readFile(storePath, "utf8");
		} catch (error) {
			if (isMissingFileError(error)) {
				return createEmptyProjectStore();
			}
			throw new Error(`Unable to read project store: ${error instanceof Error ? error.message : String(error)}`);
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (error) {
			throw new Error(`Unable to parse project store JSON: ${error instanceof Error ? error.message : String(error)}`);
		}

		try {
			return ProjectStoreSchema.parse(parsed);
		} catch (error) {
			if (error instanceof ZodError) {
				throw new Error(`Project store validation failed: ${error.issues.map((issue) => issue.message).join(", ")}`);
			}
			throw error;
		}
	},
	save: async (store) => {
		const validated = ProjectStoreSchema.parse(store);
		await mkdir(path.dirname(storePath), { recursive: true });
		await writeFile(storePath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
	},
});
```

Create `src/main/projects/project-paths.ts`:

```ts
import { readdir } from "node:fs/promises";
import path from "node:path";
import { getNextNewProjectName } from "../../shared/project-state";

export const getNextScratchProjectPath = async (documentsDir: string) => {
	const entries = await readdir(documentsDir, { withFileTypes: true });
	const directoryNames = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

	return path.join(documentsDir, getNextNewProjectName(directoryNames));
};
```

Create `src/main/projects/git.ts`:

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const initializeGitRepository = async (projectPath: string) => {
	await execFileAsync("git", ["init", "-b", "main"], { cwd: projectPath });
};
```

- [ ] **Step 4: Run tests and verify they pass**

Run:

```bash
pnpm vitest run tests/main/project-store.test.ts tests/main/project-paths.test.ts tests/main/git.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/projects/project-store.ts src/main/projects/project-paths.ts src/main/projects/git.ts tests/main/project-store.test.ts tests/main/project-paths.test.ts tests/main/git.test.ts
git commit -m "feat: add project persistence primitives"
```

---

### Task 3: Project Service and IPC Contracts

**Files:**
- Create: `src/main/projects/project-service.ts`
- Modify: `src/shared/ipc.ts`
- Modify: `src/shared/preload-api.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`
- Modify: `tests/shared/ipc.test.ts`
- Create: `tests/main/project-service.test.ts`

- [ ] **Step 1: Write failing IPC and service tests**

In `tests/shared/ipc.test.ts`, replace the workspace channel assertions with project/chat assertions:

```ts
expect(IpcChannels).toEqual({
	appGetVersion: "app:getVersion",
	projectGetState: "project:getState",
	projectCreateFromScratch: "project:createFromScratch",
	projectAddExistingFolder: "project:addExistingFolder",
	projectSelect: "project:select",
	projectRename: "project:rename",
	projectRemove: "project:remove",
	projectOpenInFinder: "project:openInFinder",
	projectLocateFolder: "project:locateFolder",
	projectSetPinned: "project:setPinned",
	projectCheckAvailability: "project:checkAvailability",
	chatCreate: "chat:create",
	chatSelect: "chat:select",
});
```

Add assertions for `ProjectStateViewResultSchema`, `ProjectIdInputSchema`, `ProjectRenameInputSchema`, and `ChatSelectionInputSchema`:

```ts
expect(
	ProjectStateViewResultSchema.parse({
		ok: true,
		data: {
			projects: [],
			selectedProjectId: null,
			selectedChatId: null,
			selectedProject: null,
			selectedChat: null,
		},
	}),
).toEqual({
	ok: true,
	data: {
		projects: [],
		selectedProjectId: null,
		selectedChatId: null,
		selectedProject: null,
		selectedChat: null,
	},
});

expect(ProjectRenameInputSchema.parse({ projectId: "project:/tmp/pi", displayName: "pi" })).toEqual({
	projectId: "project:/tmp/pi",
	displayName: "pi",
});

expect(() => ProjectRenameInputSchema.parse({ projectId: "", displayName: "" })).toThrow();
expect(ChatSelectionInputSchema.parse({ projectId: "project:/tmp/pi", chatId: "chat:one" })).toEqual({
	projectId: "project:/tmp/pi",
	chatId: "chat:one",
});
```

Add `tests/main/project-service.test.ts`:

```ts
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProjectStore } from "../../src/main/projects/project-store";
import { createProjectService } from "../../src/main/projects/project-service";

let rootDir: string;
let documentsDir: string;
let userDataDir: string;

beforeEach(async () => {
	rootDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-service-"));
	documentsDir = path.join(rootDir, "Documents");
	userDataDir = path.join(rootDir, "UserData");
	await mkdir(documentsDir, { recursive: true });
	await mkdir(userDataDir, { recursive: true });
});

afterEach(async () => {
	await rm(rootDir, { recursive: true, force: true });
});

const createService = () =>
	createProjectService({
		store: createProjectStore(path.join(userDataDir, "project-store.json")),
		documentsDir,
		now: () => "2026-05-12T10:00:00.000Z",
		openFolderDialog: vi.fn(),
		openInFinder: vi.fn(),
		initializeGitRepository: vi.fn(async () => undefined),
	});

describe("project service", () => {
	it("creates and selects a scratch project", async () => {
		const service = createService();

		const result = await service.createFromScratch();

		expect(result.projects[0]?.displayName).toBe("New project");
		expect(result.projects[0]?.path).toBe(path.join(documentsDir, "New project"));
		expect(result.selectedProject?.displayName).toBe("New project");
	});

	it("adds an existing folder using the folder name", async () => {
		const existing = path.join(rootDir, "pi-desktop");
		await mkdir(existing);
		const service = createProjectService({
			store: createProjectStore(path.join(userDataDir, "project-store.json")),
			documentsDir,
			now: () => "2026-05-12T10:00:00.000Z",
			openFolderDialog: vi.fn(async () => existing),
			openInFinder: vi.fn(),
			initializeGitRepository: vi.fn(async () => undefined),
		});

		const result = await service.addExistingFolder();

		expect(result.selectedProject?.displayName).toBe("pi-desktop");
		expect(result.selectedProject?.path).toBe(existing);
	});

	it("keeps state unchanged when folder picker is cancelled", async () => {
		const service = createProjectService({
			store: createProjectStore(path.join(userDataDir, "project-store.json")),
			documentsDir,
			now: () => "2026-05-12T10:00:00.000Z",
			openFolderDialog: vi.fn(async () => null),
			openInFinder: vi.fn(),
			initializeGitRepository: vi.fn(async () => undefined),
		});

		await expect(service.addExistingFolder()).resolves.toEqual(await service.getState());
	});

	it("renames display name without changing path", async () => {
		const service = createService();
		const created = await service.createFromScratch();
		const projectId = created.selectedProject?.id;
		if (!projectId) throw new Error("Expected selected project");

		const renamed = await service.renameProject({ projectId, displayName: "Renamed" });

		expect(renamed.selectedProject?.displayName).toBe("Renamed");
		expect(renamed.selectedProject?.path).toBe(path.join(documentsDir, "New project"));
	});

	it("removes project metadata and chat metadata", async () => {
		const service = createService();
		const created = await service.createFromScratch();
		const projectId = created.selectedProject?.id;
		if (!projectId) throw new Error("Expected selected project");

		await service.createChat({ projectId });
		const removed = await service.removeProject({ projectId });

		expect(removed.projects).toEqual([]);
		expect(removed.selectedProjectId).toBeNull();
	});
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm vitest run tests/shared/ipc.test.ts tests/main/project-service.test.ts
```

Expected: FAIL because project IPC schemas and project service do not exist yet.

- [ ] **Step 3: Implement IPC schemas**

Modify `src/shared/ipc.ts`:

```ts
import { z } from "zod";
import { ProjectStateViewSchema, type ProjectStateView } from "./project-state";
import { createResultSchema, type IpcResult } from "./result";

export const IpcChannels = {
	appGetVersion: "app:getVersion",
	projectGetState: "project:getState",
	projectCreateFromScratch: "project:createFromScratch",
	projectAddExistingFolder: "project:addExistingFolder",
	projectSelect: "project:select",
	projectRename: "project:rename",
	projectRemove: "project:remove",
	projectOpenInFinder: "project:openInFinder",
	projectLocateFolder: "project:locateFolder",
	projectSetPinned: "project:setPinned",
	projectCheckAvailability: "project:checkAvailability",
	chatCreate: "chat:create",
	chatSelect: "chat:select",
} as const;

export const AppVersionSchema = z.strictObject({
	name: z.string().min(1),
	version: z.string().min(1),
});

export const ProjectIdInputSchema = z.strictObject({
	projectId: z.string().min(1),
});

export const ProjectRenameInputSchema = z.strictObject({
	projectId: z.string().min(1),
	displayName: z.string().min(1),
});

export const ProjectPinnedInputSchema = z.strictObject({
	projectId: z.string().min(1),
	pinned: z.boolean(),
});

export const ChatSelectionInputSchema = z.strictObject({
	projectId: z.string().min(1),
	chatId: z.string().min(1),
});

export const ChatCreateInputSchema = z.strictObject({
	projectId: z.string().min(1),
});

export const AppVersionResultSchema = createResultSchema(AppVersionSchema);
export const ProjectStateViewResultSchema = createResultSchema(ProjectStateViewSchema);

export type AppVersion = z.infer<typeof AppVersionSchema>;
export type ProjectIdInput = z.infer<typeof ProjectIdInputSchema>;
export type ProjectRenameInput = z.infer<typeof ProjectRenameInputSchema>;
export type ProjectPinnedInput = z.infer<typeof ProjectPinnedInputSchema>;
export type ChatSelectionInput = z.infer<typeof ChatSelectionInputSchema>;
export type ChatCreateInput = z.infer<typeof ChatCreateInputSchema>;
export type AppVersionResult = IpcResult<AppVersion>;
export type ProjectStateViewResult = IpcResult<ProjectStateView>;
```

- [ ] **Step 4: Implement project service**

Create `src/main/projects/project-service.ts`:

```ts
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import {
	createProjectId,
	createProjectStateView,
	type ChatMetadata,
	type ProjectRecord,
	type ProjectStateView,
	type ProjectStore,
} from "../../shared/project-state";
import type { ChatCreateInput, ProjectIdInput, ProjectPinnedInput, ProjectRenameInput } from "../../shared/ipc";
import type { ProjectStoreFile } from "./project-store";
import { getNextScratchProjectPath } from "./project-paths";

export interface ProjectServiceDependencies {
	store: ProjectStoreFile;
	documentsDir: string;
	now: () => string;
	openFolderDialog: () => Promise<string | null>;
	openInFinder: (projectPath: string) => Promise<void>;
	initializeGitRepository: (projectPath: string) => Promise<void>;
}

export interface ProjectService {
	getState: () => Promise<ProjectStateView>;
	createFromScratch: () => Promise<ProjectStateView>;
	addExistingFolder: () => Promise<ProjectStateView>;
	selectProject: (input: ProjectIdInput) => Promise<ProjectStateView>;
	renameProject: (input: ProjectRenameInput) => Promise<ProjectStateView>;
	removeProject: (input: ProjectIdInput) => Promise<ProjectStateView>;
	openProjectInFinder: (input: ProjectIdInput) => Promise<ProjectStateView>;
	locateFolder: (input: ProjectIdInput) => Promise<ProjectStateView>;
	setPinned: (input: ProjectPinnedInput) => Promise<ProjectStateView>;
	checkAvailability: (input: ProjectIdInput) => Promise<ProjectStateView>;
	createChat: (input: ChatCreateInput) => Promise<ProjectStateView>;
	selectChat: (input: { projectId: string; chatId: string }) => Promise<ProjectStateView>;
}

const checkProjectPath = async (projectPath: string, checkedAt: string): Promise<ProjectRecord["availability"]> => {
	try {
		await access(projectPath);
		return { status: "available", checkedAt };
	} catch {
		return { status: "missing", checkedAt };
	}
};

const folderName = (projectPath: string) => path.basename(projectPath) || projectPath;

const createProjectRecord = async (projectPath: string, now: string): Promise<ProjectRecord> => ({
	id: createProjectId(projectPath),
	displayName: folderName(projectPath),
	path: projectPath,
	createdAt: now,
	updatedAt: now,
	lastOpenedAt: now,
	pinned: false,
	availability: await checkProjectPath(projectPath, now),
});

const saveAndView = async (storeFile: ProjectStoreFile, store: ProjectStore) => {
	await storeFile.save(store);
	return createProjectStateView(store);
};

export const createProjectService = (deps: ProjectServiceDependencies): ProjectService => {
	const updateProject = async (
		projectId: string,
		mutate: (project: ProjectRecord) => ProjectRecord,
	): Promise<ProjectStore> => {
		const store = await deps.store.load();
		return {
			...store,
			projects: store.projects.map((project) => (project.id === projectId ? mutate(project) : project)),
		};
	};

	return {
		getState: async () => createProjectStateView(await deps.store.load()),
		createFromScratch: async () => {
			const store = await deps.store.load();
			const projectPath = await getNextScratchProjectPath(deps.documentsDir);
			await mkdir(projectPath, { recursive: false });
			await deps.initializeGitRepository(projectPath);
			const now = deps.now();
			const project = await createProjectRecord(projectPath, now);
			const nextStore = {
				...store,
				projects: [...store.projects.filter((existing) => existing.id !== project.id), project],
				selectedProjectId: project.id,
				selectedChatId: null,
				chatsByProject: { ...store.chatsByProject, [project.id]: store.chatsByProject[project.id] ?? [] },
			};
			return saveAndView(deps.store, nextStore);
		},
		addExistingFolder: async () => {
			const selectedPath = await deps.openFolderDialog();
			if (!selectedPath) {
				return createProjectStateView(await deps.store.load());
			}
			const store = await deps.store.load();
			const now = deps.now();
			const project = await createProjectRecord(selectedPath, now);
			const nextStore = {
				...store,
				projects: [...store.projects.filter((existing) => existing.id !== project.id), project],
				selectedProjectId: project.id,
				selectedChatId: null,
				chatsByProject: { ...store.chatsByProject, [project.id]: store.chatsByProject[project.id] ?? [] },
			};
			return saveAndView(deps.store, nextStore);
		},
		selectProject: async ({ projectId }) => {
			const now = deps.now();
			const nextStore = await updateProject(projectId, (project) => ({ ...project, lastOpenedAt: now }));
			nextStore.selectedProjectId = projectId;
			nextStore.selectedChatId = null;
			return saveAndView(deps.store, nextStore);
		},
		renameProject: async ({ projectId, displayName }) => {
			const now = deps.now();
			const nextStore = await updateProject(projectId, (project) => ({ ...project, displayName, updatedAt: now }));
			return saveAndView(deps.store, nextStore);
		},
		removeProject: async ({ projectId }) => {
			const store = await deps.store.load();
			const { [projectId]: _removed, ...chatsByProject } = store.chatsByProject;
			const nextStore = {
				...store,
				projects: store.projects.filter((project) => project.id !== projectId),
				selectedProjectId: store.selectedProjectId === projectId ? null : store.selectedProjectId,
				selectedChatId:
					store.selectedProjectId === projectId || store.chatsByProject[projectId]?.some((chat) => chat.id === store.selectedChatId)
						? null
						: store.selectedChatId,
				chatsByProject,
			};
			return saveAndView(deps.store, nextStore);
		},
		openProjectInFinder: async ({ projectId }) => {
			const store = await deps.store.load();
			const project = store.projects.find((candidate) => candidate.id === projectId);
			if (!project) throw new Error(`Project not found: ${projectId}`);
			await deps.openInFinder(project.path);
			return createProjectStateView(store);
		},
		locateFolder: async ({ projectId }) => {
			const selectedPath = await deps.openFolderDialog();
			if (!selectedPath) return createProjectStateView(await deps.store.load());
			const now = deps.now();
			const nextStore = await updateProject(projectId, (project) => ({
				...project,
				path: selectedPath,
				id: createProjectId(selectedPath),
				updatedAt: now,
				lastOpenedAt: now,
				availability: { status: "available", checkedAt: now },
			}));
			const updatedProject = nextStore.projects.find((project) => project.path === selectedPath);
			if (updatedProject && updatedProject.id !== projectId) {
				nextStore.chatsByProject[updatedProject.id] = nextStore.chatsByProject[projectId] ?? [];
				delete nextStore.chatsByProject[projectId];
				nextStore.selectedProjectId = updatedProject.id;
			}
			return saveAndView(deps.store, nextStore);
		},
		setPinned: async ({ projectId, pinned }) => {
			const now = deps.now();
			const nextStore = await updateProject(projectId, (project) => ({ ...project, pinned, updatedAt: now }));
			return saveAndView(deps.store, nextStore);
		},
		checkAvailability: async ({ projectId }) => {
			const now = deps.now();
			const nextStore = await updateProject(projectId, (project) => ({
				...project,
				availability: await checkProjectPath(project.path, now),
			}));
			return saveAndView(deps.store, nextStore);
		},
		createChat: async ({ projectId }) => {
			const store = await deps.store.load();
			const now = deps.now();
			const chat: ChatMetadata = {
				id: `chat:${projectId}:${now}`,
				projectId,
				title: "New chat",
				status: "idle",
				updatedAt: now,
			};
			const nextStore = {
				...store,
				selectedProjectId: projectId,
				selectedChatId: chat.id,
				chatsByProject: {
					...store.chatsByProject,
					[projectId]: [...(store.chatsByProject[projectId] ?? []), chat],
				},
			};
			return saveAndView(deps.store, nextStore);
		},
		selectChat: async ({ projectId, chatId }) => {
			const store = await deps.store.load();
			return saveAndView(deps.store, { ...store, selectedProjectId: projectId, selectedChatId: chatId });
		},
	};
};
```

- [ ] **Step 5: Wire main and preload**

Modify `src/shared/preload-api.ts`:

```ts
import type {
	AppVersionResult,
	ChatCreateInput,
	ChatSelectionInput,
	ProjectIdInput,
	ProjectPinnedInput,
	ProjectRenameInput,
	ProjectStateViewResult,
} from "./ipc";

export interface PiDesktopApi {
	app: {
		getVersion: () => Promise<AppVersionResult>;
	};
	project: {
		getState: () => Promise<ProjectStateViewResult>;
		createFromScratch: () => Promise<ProjectStateViewResult>;
		addExistingFolder: () => Promise<ProjectStateViewResult>;
		select: (input: ProjectIdInput) => Promise<ProjectStateViewResult>;
		rename: (input: ProjectRenameInput) => Promise<ProjectStateViewResult>;
		remove: (input: ProjectIdInput) => Promise<ProjectStateViewResult>;
		openInFinder: (input: ProjectIdInput) => Promise<ProjectStateViewResult>;
		locateFolder: (input: ProjectIdInput) => Promise<ProjectStateViewResult>;
		setPinned: (input: ProjectPinnedInput) => Promise<ProjectStateViewResult>;
		checkAvailability: (input: ProjectIdInput) => Promise<ProjectStateViewResult>;
	};
	chat: {
		create: (input: ChatCreateInput) => Promise<ProjectStateViewResult>;
		select: (input: ChatSelectionInput) => Promise<ProjectStateViewResult>;
	};
}
```

Modify `src/preload/index.ts` to use `safeInvokeParse` with optional input:

```ts
const safeInvokeParse = async <TResult extends IpcResult<unknown>>(
	channel: IpcChannel,
	schema: z.ZodType<TResult>,
	input?: unknown,
): Promise<TResult> => {
	try {
		return schema.parse(await ipcRenderer.invoke(channel, input));
	} catch (error) {
		return {
			ok: false,
			error: createIpcError("ipc.invoke_failed", `IPC call failed for ${channel}: ${toErrorMessage(error)}`),
		} as TResult;
	}
};
```

Expose project and chat methods in the `api` object:

```ts
project: {
	getState: async () => safeInvokeParse(IpcChannels.projectGetState, ProjectStateViewResultSchema),
	createFromScratch: async () => safeInvokeParse(IpcChannels.projectCreateFromScratch, ProjectStateViewResultSchema),
	addExistingFolder: async () => safeInvokeParse(IpcChannels.projectAddExistingFolder, ProjectStateViewResultSchema),
	select: async (input) => safeInvokeParse(IpcChannels.projectSelect, ProjectStateViewResultSchema, input),
	rename: async (input) => safeInvokeParse(IpcChannels.projectRename, ProjectStateViewResultSchema, input),
	remove: async (input) => safeInvokeParse(IpcChannels.projectRemove, ProjectStateViewResultSchema, input),
	openInFinder: async (input) => safeInvokeParse(IpcChannels.projectOpenInFinder, ProjectStateViewResultSchema, input),
	locateFolder: async (input) => safeInvokeParse(IpcChannels.projectLocateFolder, ProjectStateViewResultSchema, input),
	setPinned: async (input) => safeInvokeParse(IpcChannels.projectSetPinned, ProjectStateViewResultSchema, input),
	checkAvailability: async (input) => safeInvokeParse(IpcChannels.projectCheckAvailability, ProjectStateViewResultSchema, input),
},
chat: {
	create: async (input) => safeInvokeParse(IpcChannels.chatCreate, ProjectStateViewResultSchema, input),
	select: async (input) => safeInvokeParse(IpcChannels.chatSelect, ProjectStateViewResultSchema, input),
},
```

Modify `src/main/index.ts` to create dependencies:

```ts
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { createProjectService } from "./projects/project-service";
import { createProjectStore } from "./projects/project-store";
import { initializeGitRepository } from "./projects/git";
import {
	ChatCreateInputSchema,
	ChatSelectionInputSchema,
	IpcChannels,
	ProjectIdInputSchema,
	ProjectPinnedInputSchema,
	ProjectRenameInputSchema,
} from "../shared/ipc";
import { err, ok } from "../shared/result";
```

Inside `registerIpcHandlers`, create a service and parse each input:

```ts
const projectService = createProjectService({
	store: createProjectStore(path.join(app.getPath("userData"), "project-store.json")),
	documentsDir: app.getPath("documents"),
	now: () => new Date().toISOString(),
	openFolderDialog: async () => {
		const result = await dialog.showOpenDialog({ properties: ["openDirectory"], title: "Use an Existing Folder" });
		return result.canceled ? null : (result.filePaths[0] ?? null);
	},
	openInFinder: async (projectPath) => {
		const result = await shell.openPath(projectPath);
		if (result) throw new Error(result);
	},
	initializeGitRepository,
});

const toResult = async (operation: () => Promise<unknown>) => {
	try {
		return ok(await operation());
	} catch (error) {
		return err("project.operation_failed", error instanceof Error ? error.message : String(error));
	}
};

ipcMain.handle(IpcChannels.projectGetState, () => toResult(projectService.getState));
ipcMain.handle(IpcChannels.projectCreateFromScratch, () => toResult(projectService.createFromScratch));
ipcMain.handle(IpcChannels.projectAddExistingFolder, () => toResult(projectService.addExistingFolder));
ipcMain.handle(IpcChannels.projectSelect, (_event, input) =>
	toResult(() => projectService.selectProject(ProjectIdInputSchema.parse(input))),
);
```

Add the same pattern for rename, remove, open in Finder, locate, pin, availability, chat create, and chat select.

- [ ] **Step 6: Run tests and typecheck**

Run:

```bash
pnpm vitest run tests/shared/ipc.test.ts tests/main/project-service.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/main/index.ts src/main/projects/project-service.ts src/preload/index.ts src/shared/ipc.ts src/shared/preload-api.ts tests/shared/ipc.test.ts tests/main/project-service.test.ts
git commit -m "feat: add project ipc service"
```

---

### Task 4: Renderer Project View Model and App State

**Files:**
- Create: `src/renderer/projects/project-view-model.ts`
- Create: `tests/shared/project-view-model.test.ts`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/global.d.ts`

- [ ] **Step 1: Write failing view-model tests**

Add `tests/shared/project-view-model.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createProjectMainCopy, createProjectSidebarRows } from "../../src/renderer/projects/project-view-model";
import type { ProjectStateView } from "../../src/shared/project-state";

const emptyView: ProjectStateView = {
	projects: [],
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
};

describe("project view model", () => {
	it("uses the global empty state when no project is selected", () => {
		expect(createProjectMainCopy(emptyView)).toEqual({
			kind: "global-empty",
			title: "What should we work on?",
			projectSelectorLabel: "Work in a project",
		});
	});

	it("uses the project empty state when a project has no chats", () => {
		const view: ProjectStateView = {
			projects: [
				{
					id: "project:/tmp/pi",
					displayName: "pi",
					path: "/tmp/pi",
					createdAt: "2026-05-12T10:00:00.000Z",
					updatedAt: "2026-05-12T10:00:00.000Z",
					lastOpenedAt: "2026-05-12T10:00:00.000Z",
					pinned: false,
					availability: { status: "available" },
					chats: [],
				},
			],
			selectedProjectId: "project:/tmp/pi",
			selectedChatId: null,
			selectedProject: null,
			selectedChat: null,
		};
		view.selectedProject = view.projects[0] ?? null;

		expect(createProjectMainCopy(view)).toMatchObject({
			kind: "project-empty",
			title: "What should we build in pi?",
			projectSelectorLabel: "pi",
		});
	});

	it("adds a No chats row under projects with no chat metadata", () => {
		const rows = createProjectSidebarRows({
			...emptyView,
			projects: [
				{
					id: "project:/tmp/pi",
					displayName: "pi",
					path: "/tmp/pi",
					createdAt: "2026-05-12T10:00:00.000Z",
					updatedAt: "2026-05-12T10:00:00.000Z",
					lastOpenedAt: "2026-05-12T10:00:00.000Z",
					pinned: false,
					availability: { status: "available" },
					chats: [],
				},
			],
		});

		expect(rows[0]?.children).toEqual([{ kind: "empty", label: "No chats" }]);
	});
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
pnpm vitest run tests/shared/project-view-model.test.ts
```

Expected: FAIL because `project-view-model.ts` does not exist.

- [ ] **Step 3: Implement renderer view model**

Create `src/renderer/projects/project-view-model.ts`:

```ts
import type { ChatMetadata, ProjectStateView, ProjectWithChats } from "../../shared/project-state";

export type ProjectMainCopy =
	| { kind: "global-empty"; title: string; projectSelectorLabel: string }
	| { kind: "missing-project"; title: string; body: string; projectId: string; projectSelectorLabel: string }
	| { kind: "project-empty"; title: string; projectId: string; projectSelectorLabel: string }
	| { kind: "chat"; title: string; projectId: string; chatId: string; projectSelectorLabel: string };

export type SidebarChatRow = { kind: "chat"; chat: ChatMetadata } | { kind: "empty"; label: "No chats" };

export interface SidebarProjectRow {
	project: ProjectWithChats;
	selected: boolean;
	children: SidebarChatRow[];
}

export const createProjectMainCopy = (view: ProjectStateView): ProjectMainCopy => {
	if (!view.selectedProject) {
		return { kind: "global-empty", title: "What should we work on?", projectSelectorLabel: "Work in a project" };
	}

	if (view.selectedProject.availability.status !== "available") {
		return {
			kind: "missing-project",
			title: `${view.selectedProject.displayName} is unavailable`,
			body: "Locate the folder to restore chats for this project, or remove it from pi-desktop.",
			projectId: view.selectedProject.id,
			projectSelectorLabel: view.selectedProject.displayName,
		};
	}

	if (view.selectedChat) {
		return {
			kind: "chat",
			title: view.selectedChat.title,
			projectId: view.selectedProject.id,
			chatId: view.selectedChat.id,
			projectSelectorLabel: view.selectedProject.displayName,
		};
	}

	return {
		kind: "project-empty",
		title: `What should we build in ${view.selectedProject.displayName}?`,
		projectId: view.selectedProject.id,
		projectSelectorLabel: view.selectedProject.displayName,
	};
};

export const createProjectSidebarRows = (view: ProjectStateView): SidebarProjectRow[] =>
	view.projects.map((project) => ({
		project,
		selected: project.id === view.selectedProjectId,
		children: project.chats.length > 0 ? project.chats.map((chat) => ({ kind: "chat", chat })) : [{ kind: "empty", label: "No chats" }],
	}));
```

- [ ] **Step 4: Wire app state to preload**

Modify `src/renderer/global.d.ts`:

```ts
import type { PiDesktopApi } from "../shared/preload-api";

declare global {
	interface Window {
		piDesktop: PiDesktopApi;
	}
}
```

Modify `src/renderer/App.tsx` so it loads project state:

```tsx
import { useEffect, useState } from "react";
import type { ProjectStateView } from "../shared/project-state";
import { AppShell } from "./components/app-shell";

const emptyProjectState: ProjectStateView = {
	projects: [],
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
};

export function App() {
	const [state, setState] = useState<ProjectStateView>(emptyProjectState);
	const [versionLabel, setVersionLabel] = useState("0.0.0");
	const [statusMessage, setStatusMessage] = useState<string>();

	const applyResult = (result: Awaited<ReturnType<typeof window.piDesktop.project.getState>>) => {
		if (result.ok) {
			setState(result.data);
			setStatusMessage(undefined);
			return;
		}
		setStatusMessage(result.error.message);
	};

	useEffect(() => {
		let mounted = true;
		const loadInitialState = async () => {
			const [versionResult, projectResult] = await Promise.allSettled([
				window.piDesktop.app.getVersion(),
				window.piDesktop.project.getState(),
			]);
			if (!mounted) return;
			if (versionResult.status === "fulfilled" && versionResult.value.ok) {
				setVersionLabel(versionResult.value.data.version);
			}
			if (projectResult.status === "fulfilled") {
				applyResult(projectResult.value);
			} else {
				setStatusMessage(projectResult.reason instanceof Error ? projectResult.reason.message : "Unable to load projects.");
			}
		};
		void loadInitialState();
		return () => {
			mounted = false;
		};
	}, []);

	return <AppShell state={state} versionLabel={versionLabel} statusMessage={statusMessage} onProjectState={applyResult} />;
}
```

- [ ] **Step 5: Run tests and typecheck**

Run:

```bash
pnpm vitest run tests/shared/project-view-model.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/App.tsx src/renderer/global.d.ts src/renderer/projects/project-view-model.ts tests/shared/project-view-model.test.ts
git commit -m "feat: add project renderer state"
```

---

### Task 5: Sidebar Project Navigation and Menus

**Files:**
- Create: `src/renderer/components/project-sidebar.tsx`
- Modify: `src/renderer/components/app-shell.tsx`
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Replace app shell with project-oriented props**

Modify `src/renderer/components/app-shell.tsx`:

```tsx
import type { ProjectStateView } from "@/shared/project-state";
import { ProjectMain } from "./project-main";
import { ProjectSidebar } from "./project-sidebar";

interface AppShellProps {
	state: ProjectStateView;
	versionLabel: string;
	statusMessage?: string;
	onProjectState: (result: Awaited<ReturnType<typeof window.piDesktop.project.getState>>) => void;
}

export function AppShell({ state, versionLabel, statusMessage, onProjectState }: AppShellProps) {
	return (
		<div data-testid="app-shell" className="grid h-screen min-h-[640px] grid-cols-[270px_minmax(520px,1fr)] bg-background text-foreground">
			<ProjectSidebar state={state} versionLabel={versionLabel} onProjectState={onProjectState} />
			<ProjectMain state={state} statusMessage={statusMessage} onProjectState={onProjectState} />
		</div>
	);
}
```

- [ ] **Step 2: Create sidebar component**

Create `src/renderer/components/project-sidebar.tsx`:

```tsx
import { Button } from "@/renderer/components/ui/button";
import type { ProjectStateView } from "@/shared/project-state";
import { Archive, Edit3, Folder, FolderOpen, GitBranchPlus, MoreHorizontal, Pin, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { createProjectSidebarRows } from "../projects/project-view-model";

interface ProjectSidebarProps {
	state: ProjectStateView;
	versionLabel: string;
	onProjectState: (result: Awaited<ReturnType<typeof window.piDesktop.project.getState>>) => void;
}

export function ProjectSidebar({ state, versionLabel, onProjectState }: ProjectSidebarProps) {
	const [addOpen, setAddOpen] = useState(false);
	const [menuProjectId, setMenuProjectId] = useState<string | null>(null);
	const rows = createProjectSidebarRows(state);

	const createFromScratch = async () => onProjectState(await window.piDesktop.project.createFromScratch());
	const addExistingFolder = async () => onProjectState(await window.piDesktop.project.addExistingFolder());

	return (
		<aside className="flex min-w-0 flex-col border-r border-border bg-muted/25">
			<div className="flex h-14 items-center gap-2 px-4">
				<div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">pi</div>
				<div className="min-w-0">
					<div className="truncate text-sm font-medium">pi-desktop</div>
					<div className="truncate text-xs text-muted-foreground">{versionLabel}</div>
				</div>
			</div>
			<nav className="space-y-1 px-3 text-sm">
				<button className="sidebar-action" type="button" disabled>New chat</button>
				<button className="sidebar-action" type="button" disabled>Search</button>
				<button className="sidebar-action" type="button" disabled>Plugins</button>
				<button className="sidebar-action" type="button" disabled>Automations</button>
			</nav>
			<div className="mt-5 flex items-center justify-between px-4 text-xs text-muted-foreground">
				<span>Projects</span>
				<div className="relative">
					<Button aria-label="Add project" size="icon" variant="ghost" onClick={() => setAddOpen((open) => !open)}>
						<Plus className="size-4" />
					</Button>
					{addOpen ? (
						<div className="menu-popover right-0 top-9">
							<button type="button" onClick={createFromScratch}>
								<Folder className="size-4" /> Start from scratch
							</button>
							<button type="button" onClick={addExistingFolder}>
								<FolderOpen className="size-4" /> Use an existing folder
							</button>
						</div>
					) : null}
				</div>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
				{rows.map((row) => (
					<div key={row.project.id} className="project-group">
						<div className={`project-row ${row.selected ? "project-row-selected" : ""} ${row.project.availability.status !== "available" ? "project-row-warning" : ""}`}>
							<button type="button" onClick={async () => onProjectState(await window.piDesktop.project.select({ projectId: row.project.id }))}>
								<Folder className="size-4" />
								<span className="truncate">{row.project.displayName}</span>
							</button>
							<div className="relative">
								<Button aria-label={`${row.project.displayName} actions`} size="icon" variant="ghost" onClick={() => setMenuProjectId(menuProjectId === row.project.id ? null : row.project.id)}>
									<MoreHorizontal className="size-4" />
								</Button>
								{menuProjectId === row.project.id ? (
									<ProjectOverflowMenu projectId={row.project.id} pinned={row.project.pinned} onProjectState={onProjectState} />
								) : null}
							</div>
						</div>
						<div className="space-y-1 pl-7">
							{row.children.map((child) =>
								child.kind === "empty" ? (
									<div className="px-2 py-1 text-xs text-muted-foreground" key="empty">No chats</div>
								) : (
									<button className="chat-row" key={child.chat.id} type="button" onClick={async () => onProjectState(await window.piDesktop.chat.select({ projectId: row.project.id, chatId: child.chat.id }))}>
										<span className="truncate">{child.chat.title}</span>
									</button>
								),
							)}
						</div>
					</div>
				))}
			</div>
			<div className="px-4 py-3 text-xs text-muted-foreground">Chats</div>
		</aside>
	);
}

function ProjectOverflowMenu({
	projectId,
	pinned,
	onProjectState,
}: {
	projectId: string;
	pinned: boolean;
	onProjectState: (result: Awaited<ReturnType<typeof window.piDesktop.project.getState>>) => void;
}) {
	const renameProject = async () => {
		const displayName = window.prompt("Rename project");
		if (displayName?.trim()) {
			onProjectState(await window.piDesktop.project.rename({ projectId, displayName: displayName.trim() }));
		}
	};

	const removeProject = async () => {
		if (window.confirm("Remove this project from pi-desktop? Files on disk will not be deleted.")) {
			onProjectState(await window.piDesktop.project.remove({ projectId }));
		}
	};

	return (
		<div className="menu-popover right-0 top-9">
			<button type="button" onClick={async () => onProjectState(await window.piDesktop.project.setPinned({ projectId, pinned: !pinned }))}>
				<Pin className="size-4" /> {pinned ? "Unpin project" : "Pin project"}
			</button>
			<button type="button" onClick={async () => onProjectState(await window.piDesktop.project.openInFinder({ projectId }))}>
				<FolderOpen className="size-4" /> Open in Finder
			</button>
			<button type="button" disabled title="Coming soon">
				<GitBranchPlus className="size-4" /> Create permanent worktree
			</button>
			<button type="button" onClick={renameProject}>
				<Edit3 className="size-4" /> Rename project
			</button>
			<button type="button" disabled title="Coming soon">
				<Archive className="size-4" /> Archive chats
			</button>
			<button type="button" onClick={removeProject}>
				<Trash2 className="size-4" /> Remove
			</button>
		</div>
	);
}
```

Remove unused imports from this snippet during implementation if Biome reports them.

- [ ] **Step 3: Add sidebar and menu styles**

Add to `src/renderer/styles.css`:

```css
.sidebar-action {
	display: flex;
	width: 100%;
	align-items: center;
	border: 0;
	border-radius: 6px;
	background: transparent;
	color: var(--color-muted-foreground);
	padding: 6px 8px;
	text-align: left;
}

.sidebar-action:disabled {
	opacity: 0.65;
}

.project-group {
	margin-bottom: 8px;
}

.project-row {
	position: relative;
	display: grid;
	grid-template-columns: minmax(0, 1fr) 32px;
	align-items: center;
	border-radius: 6px;
	color: var(--color-foreground);
}

.project-row > button:first-child,
.chat-row {
	display: flex;
	min-width: 0;
	width: 100%;
	align-items: center;
	gap: 8px;
	border: 0;
	border-radius: 6px;
	background: transparent;
	color: inherit;
	padding: 6px 8px;
	text-align: left;
}

.project-row-selected,
.project-row:hover,
.chat-row:hover {
	background: var(--color-muted);
}

.project-row-warning {
	color: var(--color-destructive);
}

.menu-popover {
	position: absolute;
	z-index: 20;
	min-width: 220px;
	border: 1px solid var(--color-border);
	border-radius: 8px;
	background: var(--color-popover);
	box-shadow: 0 16px 48px rgb(0 0 0 / 35%);
	padding: 6px;
}

.menu-popover button {
	display: flex;
	width: 100%;
	align-items: center;
	gap: 8px;
	border: 0;
	border-radius: 6px;
	background: transparent;
	color: var(--color-popover-foreground);
	padding: 7px 8px;
	text-align: left;
}

.menu-popover button:hover:not(:disabled) {
	background: var(--color-muted);
}

.menu-popover button:disabled {
	color: var(--color-muted-foreground);
	cursor: default;
}
```

- [ ] **Step 4: Run checks for this slice**

Run:

```bash
pnpm typecheck
pnpm lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/app-shell.tsx src/renderer/components/project-sidebar.tsx src/renderer/styles.css
git commit -m "feat: add project sidebar navigation"
```

---

### Task 6: Main Empty States, Composer, and Recovery UI

**Files:**
- Create: `src/renderer/components/composer.tsx`
- Create: `src/renderer/components/project-main.tsx`
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Create composer component**

Create `src/renderer/components/composer.tsx`:

```tsx
import { Button } from "@/renderer/components/ui/button";
import { ArrowUp, Mic, Plus } from "lucide-react";

interface ComposerProps {
	projectSelectorLabel: string;
	disabledReason: string;
}

export function Composer({ projectSelectorLabel, disabledReason }: ComposerProps) {
	return (
		<div className="composer" aria-label={disabledReason}>
			<div className="composer-input">Ask Pi anything. @ to use skills or mention files</div>
			<div className="composer-actions">
				<Button size="icon" variant="ghost" disabled title={disabledReason}>
					<Plus className="size-4" />
				</Button>
				<span className="composer-access">Full access</span>
				<div className="composer-spacer" />
				<span className="composer-model">Pi runtime in Milestone 2</span>
				<Button size="icon" variant="ghost" disabled title={disabledReason}>
					<Mic className="size-4" />
				</Button>
				<Button size="icon" variant="secondary" disabled title={disabledReason}>
					<ArrowUp className="size-4" />
				</Button>
			</div>
			<div className="composer-project">{projectSelectorLabel}</div>
		</div>
	);
}
```

- [ ] **Step 2: Create main content component**

Create `src/renderer/components/project-main.tsx`:

```tsx
import { Button } from "@/renderer/components/ui/button";
import type { ProjectStateView } from "@/shared/project-state";
import { createProjectMainCopy } from "../projects/project-view-model";
import { Composer } from "./composer";

interface ProjectMainProps {
	state: ProjectStateView;
	statusMessage?: string;
	onProjectState: (result: Awaited<ReturnType<typeof window.piDesktop.project.getState>>) => void;
}

export function ProjectMain({ state, statusMessage, onProjectState }: ProjectMainProps) {
	const copy = createProjectMainCopy(state);

	if (copy.kind === "missing-project") {
		return (
			<main className="project-main">
				<div className="missing-panel">
					<h1>{copy.title}</h1>
					<p>{copy.body}</p>
					<div className="missing-actions">
						<Button onClick={async () => onProjectState(await window.piDesktop.project.locateFolder({ projectId: copy.projectId }))}>
							Locate folder
						</Button>
						<Button variant="destructive" onClick={async () => onProjectState(await window.piDesktop.project.remove({ projectId: copy.projectId }))}>
							Remove
						</Button>
					</div>
					{statusMessage ? <p className="status-error">{statusMessage}</p> : null}
				</div>
			</main>
		);
	}

	if (copy.kind === "chat") {
		return (
			<main className="project-main">
				<div className="chat-static">
					<h1>{copy.title}</h1>
					<p>Chat metadata is ready. Pi message history begins in Milestone 2.</p>
				</div>
				{statusMessage ? <p className="status-error">{statusMessage}</p> : null}
			</main>
		);
	}

	return (
		<main className="project-main">
			<section className="empty-composer-state">
				<h1>{copy.title}</h1>
				<Composer projectSelectorLabel={copy.projectSelectorLabel} disabledReason="Pi runtime arrives in Milestone 2." />
				{statusMessage ? <p className="status-error">{statusMessage}</p> : null}
			</section>
		</main>
	);
}
```

- [ ] **Step 3: Add main area styles**

Add to `src/renderer/styles.css`:

```css
.project-main {
	position: relative;
	min-width: 0;
	background: var(--color-background);
}

.empty-composer-state {
	display: flex;
	min-height: 100%;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 48px;
}

.empty-composer-state h1 {
	margin: 0 0 28px;
	font-size: 28px;
	font-weight: 500;
	letter-spacing: 0;
}

.composer {
	width: min(720px, 100%);
	border-radius: 18px;
	background: var(--color-card);
	color: var(--color-card-foreground);
	overflow: hidden;
}

.composer-input {
	min-height: 58px;
	padding: 16px 18px;
	color: var(--color-muted-foreground);
}

.composer-actions,
.composer-project {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
}

.composer-actions {
	border-bottom: 1px solid var(--color-border);
}

.composer-spacer {
	flex: 1;
}

.composer-access {
	color: var(--color-destructive);
	font-size: 13px;
}

.composer-model,
.composer-project {
	color: var(--color-muted-foreground);
	font-size: 13px;
}

.missing-panel,
.chat-static {
	margin: 25vh auto 0;
	width: min(560px, calc(100% - 48px));
}

.missing-panel h1,
.chat-static h1 {
	margin: 0 0 12px;
	font-size: 24px;
	font-weight: 500;
}

.missing-panel p,
.chat-static p,
.status-error {
	color: var(--color-muted-foreground);
}

.missing-actions {
	display: flex;
	gap: 10px;
	margin-top: 20px;
}

.status-error {
	margin-top: 14px;
	color: var(--color-destructive);
}
```

- [ ] **Step 4: Run typecheck and smoke target locally**

Run:

```bash
pnpm typecheck
pnpm lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/composer.tsx src/renderer/components/project-main.tsx src/renderer/styles.css
git commit -m "feat: add project empty states"
```

---

### Task 7: Smoke Tests and End-to-End Verification

**Files:**
- Modify: `tests/smoke/app.spec.ts`
- Modify: `README.md` only if a new command or manual verification note is needed.

- [ ] **Step 1: Update smoke test for Milestone 1 shell**

Modify `tests/smoke/app.spec.ts`:

```ts
import { expect, test, _electron as electron } from "@playwright/test";

test("renders the Milestone 1 project shell", async () => {
	const app = await electron.launch({
		args: ["."],
	});

	try {
		const window = await app.firstWindow();

		await expect(window.getByTestId("app-shell")).toBeVisible();
		await expect(window.getByText("pi-desktop").first()).toBeVisible();
		await expect(window.getByText("Projects")).toBeVisible();
		await expect(window.getByLabel("Add project")).toBeVisible();
		await expect(window.getByRole("heading", { name: "What should we work on?" })).toBeVisible();
		await expect(window.getByText("Work in a project")).toBeVisible();
	} finally {
		await app.close();
	}
});
```

- [ ] **Step 2: Run smoke test and verify it passes**

Run:

```bash
pnpm test:smoke
```

Expected: PASS.

- [ ] **Step 3: Run full project check**

Run:

```bash
pnpm check
```

Expected: PASS.

- [ ] **Step 4: Manual verification**

Run:

```bash
pnpm dev
```

Verify in the app:

- Empty state shows `What should we work on?`.
- Add project menu shows `Start from scratch` and `Use an existing folder`.
- `Start from scratch` creates a folder under `/Users/gannonhall/Documents`.
- In the created folder, `git branch --show-current` prints `main`.
- Existing folders are added using the folder name.
- Restarting the app preserves projects.
- Renaming changes the sidebar display name and leaves the folder path unchanged.
- Removing a project removes it from the sidebar and does not delete files from disk.
- Moving a project folder outside the app shows missing-folder recovery.
- Locating the moved folder restores the project and keeps its chat metadata.

- [ ] **Step 5: Commit**

```bash
git add tests/smoke/app.spec.ts README.md
git commit -m "test: verify milestone 1 project shell"
```

---

## Self-Review

Spec coverage:

- Project list in the sidebar: Task 5.
- Chat metadata grouped under projects: Tasks 1, 3, 5.
- Add project menu: Tasks 3 and 5.
- JSON-backed project metadata store: Task 2.
- Missing folder detection and recovery: Tasks 1, 3, 6.
- Empty states for no project, no chats, and missing folders: Tasks 4, 5, 6.
- Inactive chat entry points for Milestone 2: Tasks 5 and 6.
- Start from scratch creates `/Users/gannonhall/Documents/New project N` and git `main`: Tasks 2, 3, 7.
- Use an existing folder: Tasks 3, 5, 7.
- Project overflow menu items: Task 5.
- Persistence across restart: Tasks 2, 3, 7.

Type consistency:

- Shared state uses `ProjectStateView` across IPC, preload, renderer state, and components.
- Project service methods match the channel names in `IpcChannels`.
- Renderer callbacks accept `ProjectStateViewResult`, matching preload API methods.

Verification:

- Unit tests cover shared state, path naming, git init, store validation, IPC schemas, and service behavior.
- Smoke test covers boot and global empty state.
- Manual verification covers filesystem, restart persistence, and recovery behavior.
