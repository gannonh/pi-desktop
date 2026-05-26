import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import type { SessionInfo } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import { createProjectService, type ProjectServiceDeps } from "../../src/main/projects/project-service";
import type { ProjectStoreFile } from "../../src/main/projects/project-store";
import {
	createEmptyProjectStore,
	createProjectId,
	type ChatMetadata,
	type ProjectStateView,
	type ProjectStore,
} from "../../src/shared/project-state";

const firstNow = "2026-05-12T09:00:00.000Z";
const secondNow = "2026-05-12T10:00:00.000Z";

const createMemoryStore = (initialStore: ProjectStore = createEmptyProjectStore()) => {
	let store = structuredClone(initialStore);

	const file: ProjectStoreFile = {
		load: vi.fn(async () => structuredClone(store)),
		save: vi.fn(async (nextStore) => {
			store = structuredClone(nextStore);
		}),
	};

	return {
		file,
		read: () => structuredClone(store),
	};
};

const createService = async (
	options: {
		initialStore?: ProjectStore;
		documentsDir?: string;
		desktopChatsPath?: string;
		now?: () => string;
		openFolderDialog?: () => Promise<string | null>;
		openInFinder?: (path: string) => Promise<unknown>;
		initializeGitRepository?: (path: string) => Promise<void>;
		listProjectSessions?: ProjectServiceDeps["listProjectSessions"];
		readSessionInfoForPath?: ProjectServiceDeps["readSessionInfoForPath"];
		writeSessionName?: ProjectServiceDeps["writeSessionName"];
		forkSession?: ProjectServiceDeps["forkSession"];
		cloneSession?: ProjectServiceDeps["cloneSession"];
		branchSession?: ProjectServiceDeps["branchSession"];
	} = {},
) => {
	const documentsDir = options.documentsDir ?? join(await mkdtemp(join(tmpdir(), "pi-documents-")), "Documents");
	await mkdir(documentsDir, { recursive: true });
	const desktopChatsPath =
		options.desktopChatsPath ?? join(await mkdtemp(join(tmpdir(), "pi-desktop-chats-")), "desktop-chats");
	const memoryStore = createMemoryStore(options.initialStore);
	const initializeGitRepository = vi.fn(options.initializeGitRepository ?? (async () => undefined));
	const openInFinder = vi.fn(options.openInFinder ?? (async () => undefined));
	const openFolderDialog = vi.fn(options.openFolderDialog ?? (async () => null));
	const listProjectSessions = vi.fn(options.listProjectSessions ?? (async () => []));
	const readSessionInfoForPath = vi.fn(
		options.readSessionInfoForPath ??
			(async (sessionPath: string) => {
				for (const cwd of [documentsDir, desktopChatsPath]) {
					const sessions = await listProjectSessions(cwd);
					const match = sessions.find((session) => session.path === sessionPath);
					if (match) {
						return match;
					}
				}
				return null;
			}),
	);
	const writeSessionName = vi.fn(options.writeSessionName ?? (async () => undefined));
	const forkSession = vi.fn(options.forkSession ?? (async () => "/tmp/forked-session.jsonl"));
	const cloneSession = vi.fn(options.cloneSession ?? (async () => "/tmp/cloned-session.jsonl"));
	const branchSession = vi.fn(options.branchSession ?? (async () => "/tmp/branched-session.jsonl"));

	return {
		documentsDir,
		desktopChatsPath,
		memoryStore,
		initializeGitRepository,
		openInFinder,
		openFolderDialog,
		listProjectSessions,
		readSessionInfoForPath,
		writeSessionName,
		forkSession,
		cloneSession,
		branchSession,
		service: createProjectService({
			store: memoryStore.file,
			documentsDir,
			desktopChatsPath,
			now: options.now ?? (() => firstNow),
			openFolderDialog,
			openInFinder,
			initializeGitRepository,
			listProjectSessions,
			readSessionInfoForPath,
			writeSessionName,
			forkSession,
			cloneSession,
			branchSession,
		}),
	};
};

const createProject = (path: string, overrides: Partial<ProjectStore["projects"][number]> = {}) => ({
	id: createProjectId(path),
	displayName: basename(path),
	path,
	createdAt: firstNow,
	updatedAt: firstNow,
	lastOpenedAt: firstNow,
	pinned: false,
	availability: { status: "available" as const },
	...overrides,
});

const createChat = (
	project: ProjectStore["projects"][number],
	overrides: Partial<ChatMetadata> = {},
): ChatMetadata => ({
	id: "chat:one",
	projectId: project.id,
	source: "draft",
	sessionId: null,
	sessionPath: null,
	cwd: project.path,
	title: "Plan",
	status: "idle",
	attention: false,
	createdAt: firstNow,
	updatedAt: firstNow,
	lastOpenedAt: null,
	...overrides,
});

const createSessionInfo = (overrides: Partial<SessionInfo> = {}): SessionInfo => ({
	path: "/tmp/session.jsonl",
	id: "session",
	cwd: "/tmp/pi-desktop",
	name: "Session",
	parentSessionPath: undefined,
	created: new Date(firstNow),
	modified: new Date(secondNow),
	messageCount: 1,
	firstMessage: "First message",
	allMessagesText: "First message",
	...overrides,
});

const createPiBackedChatService = async ({
	derivedSessionPath,
	derivedSessionId,
	derivedSessionName,
	operation,
}: {
	derivedSessionPath: string;
	derivedSessionId: string;
	derivedSessionName: string;
	operation: "clone" | "branch";
}) => {
	const project = createProject("/tmp/pi-desktop");
	const sourcePath = "/tmp/pi-desktop/source.jsonl";
	const sourceChat = createChat(project, {
		id: "chat:session:source",
		source: "pi-session",
		sessionId: "source",
		sessionPath: sourcePath,
		title: "Source session",
	});
	const serviceOptions = {
		initialStore: {
			...createEmptyProjectStore(),
			projects: [project],
			selectedProjectId: project.id,
			chatsByProject: {
				[project.id]: [sourceChat],
			},
		},
		now: () => secondNow,
		listProjectSessions: async () => [
			createSessionInfo({
				path: sourcePath,
				id: "source",
				cwd: project.path,
				name: "Source session",
			}),
			createSessionInfo({
				path: derivedSessionPath,
				id: derivedSessionId,
				cwd: project.path,
				name: derivedSessionName,
				parentSessionPath: sourcePath,
			}),
		],
	};

	return {
		project,
		sourcePath,
		sourceChat,
		...(await createService(
			operation === "clone"
				? { ...serviceOptions, cloneSession: async () => derivedSessionPath }
				: { ...serviceOptions, branchSession: async () => derivedSessionPath },
		)),
	};
};

const expectDerivedSessionChat = ({
	memoryStore,
	view,
	projectId,
	sessionPath,
	title,
}: {
	memoryStore: ReturnType<typeof createMemoryStore>;
	view: ProjectStateView;
	projectId: string;
	sessionPath: string;
	title: string;
}): void => {
	expect(memoryStore.read().sessionUiByPath[sessionPath]).toEqual({
		chatId: `chat:${secondNow}:2`,
		sessionId: null,
		sessionPath,
		projectId,
		lastOpenedAt: secondNow,
		status: "idle",
		attention: false,
	});
	expect(view.selectedProject?.chats).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				id: `chat:${secondNow}:2`,
				projectId,
				sessionPath,
				title,
				status: "idle",
				attention: false,
				lastOpenedAt: secondNow,
			}),
		]),
	);
};

const expectRejectsWithMessage = async (promise: Promise<unknown>, message: string) => {
	let rejection: unknown;
	try {
		await promise;
	} catch (error) {
		rejection = error;
	}

	expect(rejection).toBeInstanceOf(Error);
	expect((rejection as Error).message).toBe(message);
};

describe("project service", () => {
	it("returns the current project state", async () => {
		const project = createProject("/tmp/pi-desktop");
		const { service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
			},
		});

		const view = await service.getState();

		expect(view.selectedProjectId).toBe(project.id);
		expect(view.selectedProject?.path).toBe(project.path);
	});

	it("marks a deleted project folder missing when loading state", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-deleted-"));
		const project = createProject(projectPath);
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
			},
			now: () => secondNow,
		});
		await rm(projectPath, { recursive: true });

		const view = await service.getState();

		expect(view.selectedProject?.availability).toEqual({ status: "missing", checkedAt: secondNow });
		expect(memoryStore.read().projects[0]?.availability).toEqual({ status: "missing", checkedAt: secondNow });
	});

	it("does not save state when availability status is unchanged during load", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-stable-"));
		const project = createProject(projectPath, {
			availability: { status: "available", checkedAt: firstNow },
		});
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
			},
			now: () => secondNow,
		});

		const view = await service.getState();

		expect(view.selectedProject?.availability).toEqual({ status: "available", checkedAt: firstNow });
		expect(memoryStore.file.save).not.toHaveBeenCalled();
	});

	it("creates and selects a scratch project with initialized git and empty chats", async () => {
		const { documentsDir, initializeGitRepository, memoryStore, service } = await createService();

		const view = await service.createFromScratch();
		const projectPath = join(documentsDir, "New project");
		const projectId = createProjectId(projectPath);

		await expect(access(projectPath)).resolves.toBeUndefined();
		expect(initializeGitRepository).toHaveBeenCalledWith(projectPath);
		expect(view.selectedProjectId).toBe(projectId);
		expect(view.selectedProject?.displayName).toBe("New project");
		expect(view.selectedProject?.chats).toEqual([]);
		expect(memoryStore.read().chatsByProject[projectId]).toEqual([]);
	});

	it("skips a tracked missing scratch project path and preserves its chats", async () => {
		const documentsDir = await mkdtemp(join(tmpdir(), "pi-documents-"));
		const missingProjectPath = join(documentsDir, "New project");
		const missingProject = createProject(missingProjectPath, {
			availability: { status: "missing", checkedAt: firstNow },
		});
		const missingChat = createChat(missingProject, {
			id: "chat:missing",
			title: "Existing work",
		});
		const { memoryStore, service } = await createService({
			documentsDir,
			initialStore: {
				...createEmptyProjectStore(),
				projects: [missingProject],
				chatsByProject: {
					[missingProject.id]: [missingChat],
				},
			},
			now: () => secondNow,
		});

		const view = await service.createFromScratch();
		const newProjectPath = join(documentsDir, "New project 2");
		const newProjectId = createProjectId(newProjectPath);

		await expect(access(newProjectPath)).resolves.toBeUndefined();
		expect(view.selectedProjectId).toBe(newProjectId);
		expect(memoryStore.read().chatsByProject[missingProject.id]).toEqual([missingChat]);
		expect(memoryStore.read().chatsByProject[newProjectId]).toEqual([]);
		expect(
			memoryStore
				.read()
				.projects.map((project) => project.path)
				.sort(),
		).toEqual([missingProjectPath, newProjectPath].sort());
	});

	it("adds an existing folder using the folder name and selects it", async () => {
		const selectedPath = await mkdtemp(join(tmpdir(), "pi-existing-"));
		const folderName = basename(selectedPath);
		const { service } = await createService({
			openFolderDialog: async () => selectedPath,
		});

		const view = await service.addExistingFolder();

		expect(view.selectedProjectId).toBe(createProjectId(selectedPath));
		expect(view.selectedProject?.displayName).toBe(folderName);
		expect(view.selectedProject?.path).toBe(selectedPath);
	});

	it("returns indexed Pi sessions when adding an existing folder", async () => {
		const selectedPath = await mkdtemp(join(tmpdir(), "pi-existing-with-sessions-"));
		const sessionPath = join(selectedPath, "session.jsonl");
		const { service } = await createService({
			openFolderDialog: async () => selectedPath,
			listProjectSessions: async (cwd) =>
				cwd === selectedPath
					? [
							createSessionInfo({
								path: sessionPath,
								id: "session-one",
								cwd: selectedPath,
								name: "Existing session",
							}),
						]
					: [],
		});

		const view = await service.addExistingFolder();

		expect(view.selectedProject?.chats).toEqual([
			expect.objectContaining({
				id: "chat:session:session-one",
				sessionPath,
				title: "Existing session",
			}),
		]);
	});

	it("removes standalone chats when adding their cwd as an existing folder", async () => {
		const selectedPath = await mkdtemp(join(tmpdir(), "pi-existing-standalone-"));
		const staleStandaloneChat = {
			id: "chat:session:stale",
			source: "pi-session" as const,
			sessionId: "stale",
			sessionPath: join(selectedPath, "stale.jsonl"),
			cwd: selectedPath,
			title: "Stale standalone",
			status: "idle" as const,
			attention: false,
			createdAt: firstNow,
			updatedAt: firstNow,
			lastOpenedAt: null,
		};
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				standaloneChats: [staleStandaloneChat],
			},
			openFolderDialog: async () => selectedPath,
		});

		const view = await service.addExistingFolder();

		expect(view.selectedProjectId).toBe(createProjectId(selectedPath));
		expect(view.standaloneChats).toEqual([]);
		expect(memoryStore.read().standaloneChats).toEqual([]);
	});

	it("updates an existing folder record when adding the same path again", async () => {
		const selectedPath = await mkdtemp(join(tmpdir(), "pi-existing-again-"));
		const project = createProject(selectedPath, {
			displayName: "Old name",
			availability: { status: "missing", checkedAt: firstNow },
		});
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
			},
			now: () => secondNow,
			openFolderDialog: async () => selectedPath,
		});

		await service.addExistingFolder();

		expect(memoryStore.read().projects).toEqual([
			{
				...project,
				displayName: basename(selectedPath),
				updatedAt: secondNow,
				lastOpenedAt: secondNow,
				availability: { status: "available", checkedAt: secondNow },
			},
		]);
	});

	it("leaves state unchanged when folder selection is cancelled", async () => {
		const projectPath = "/tmp/pi-desktop";
		const initialStore = {
			...createEmptyProjectStore(),
			projects: [createProject(projectPath)],
			selectedProjectId: createProjectId(projectPath),
		};
		const { memoryStore, service } = await createService({
			initialStore,
			openFolderDialog: async () => null,
		});

		const view = await service.addExistingFolder();

		expect(view.selectedProjectId).toBe(initialStore.selectedProjectId);
		expect(memoryStore.file.save).not.toHaveBeenCalled();
		expect(memoryStore.read()).toEqual(initialStore);
	});

	it("renames displayName and updatedAt only", async () => {
		const projectPath = "/tmp/pi-desktop";
		const project = createProject(projectPath);
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
			},
			now: () => secondNow,
		});

		await service.renameProject({ projectId: project.id, displayName: "Pi Desktop" });

		expect(memoryStore.read().projects[0]).toEqual({
			...project,
			displayName: "Pi Desktop",
			updatedAt: secondNow,
		});
	});

	it("selects a project and clears the selected chat", async () => {
		const project = createProject("/tmp/pi-desktop", { lastOpenedAt: firstNow });
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedChatId: "chat:one",
			},
			now: () => secondNow,
		});

		await service.selectProject({ projectId: project.id });

		expect(memoryStore.read().selectedProjectId).toBe(project.id);
		expect(memoryStore.read().selectedChatId).toBeNull();
		expect(memoryStore.read().projects[0]?.lastOpenedAt).toBe(secondNow);
	});

	it("marks a deleted project folder missing when selecting it", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-select-deleted-"));
		const project = createProject(projectPath);
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedChatId: "chat:one",
			},
			now: () => secondNow,
		});
		await rm(projectPath, { recursive: true });

		const view = await service.selectProject({ projectId: project.id });

		expect(view.selectedProject?.availability).toEqual({ status: "missing", checkedAt: secondNow });
		expect(memoryStore.read().projects[0]?.availability).toEqual({ status: "missing", checkedAt: secondNow });
	});

	it("rejects selecting an unknown project", async () => {
		const { service } = await createService();

		await expect(service.selectProject({ projectId: "project:/missing" })).rejects.toThrow(/Project not found/);
	});

	it("removes project metadata and its chat metadata without deleting files", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-remove-"));
		const project = createProject(projectPath);
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
				selectedChatId: "chat:one",
				chatsByProject: {
					[project.id]: [createChat(project)],
				},
			},
		});

		await service.removeProject({ projectId: project.id });

		await expect(access(projectPath)).resolves.toBeUndefined();
		expect(memoryStore.read()).toEqual(createEmptyProjectStore());
	});

	it("keeps selection when removing an unselected project", async () => {
		const selectedProject = createProject("/tmp/selected");
		const removedProject = createProject("/tmp/removed");
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [selectedProject, removedProject],
				selectedProjectId: selectedProject.id,
				selectedChatId: "chat:selected",
				chatsByProject: {
					[selectedProject.id]: [createChat(selectedProject, { id: "chat:selected", title: "Selected" })],
					[removedProject.id]: [],
				},
			},
		});

		await service.removeProject({ projectId: removedProject.id });

		expect(memoryStore.read().selectedProjectId).toBe(selectedProject.id);
		expect(memoryStore.read().selectedChatId).toBe("chat:selected");
		expect(memoryStore.read().projects).toEqual([selectedProject]);
	});

	it("locates a moved folder and preserves chat metadata under the recovered id", async () => {
		const oldPath = "/missing/pi-desktop";
		const newPath = await mkdtemp(join(tmpdir(), "pi-recovered-"));
		const oldProject = createProject(oldPath, {
			displayName: "Pi Desktop",
			availability: { status: "missing", checkedAt: firstNow },
		});
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [oldProject],
				selectedProjectId: oldProject.id,
				chatsByProject: {
					[oldProject.id]: [createChat(oldProject)],
				},
			},
			now: () => secondNow,
			openFolderDialog: async () => newPath,
		});

		const view = await service.locateFolder({ projectId: oldProject.id });
		const recoveredId = createProjectId(newPath);

		expect(view.selectedProjectId).toBe(recoveredId);
		expect(view.selectedProject?.displayName).toBe("Pi Desktop");
		expect(view.selectedProject?.availability.status).toBe("available");
		expect(view.selectedProject?.chats).toEqual([
			{
				...createChat(oldProject),
				projectId: recoveredId,
			},
		]);
		expect(memoryStore.read().chatsByProject[oldProject.id]).toBeUndefined();
	});

	it("uses one timestamp for recovered project metadata", async () => {
		const oldProject = createProject("/missing/pi-desktop", {
			availability: { status: "missing", checkedAt: firstNow },
		});
		const newPath = await mkdtemp(join(tmpdir(), "pi-recovered-time-"));
		const recoveredNow = "2026-05-12T10:00:00.001Z";
		const nowValues = [recoveredNow, "2026-05-12T10:00:00.002Z", "2026-05-12T10:00:00.003Z"];
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [oldProject],
				selectedProjectId: oldProject.id,
			},
			now: () => nowValues.shift() ?? "2026-05-12T10:00:00.004Z",
			openFolderDialog: async () => newPath,
		});

		await service.locateFolder({ projectId: oldProject.id });

		const recoveredProject = memoryStore.read().projects[0];
		expect(recoveredProject?.updatedAt).toBe(recoveredNow);
		expect(recoveredProject?.lastOpenedAt).toBe(recoveredNow);
		expect(recoveredProject?.availability).toEqual({ status: "available", checkedAt: recoveredNow });
	});

	it("rejects locating a folder already tracked by another project", async () => {
		const oldProject = createProject("/missing/pi-desktop", {
			displayName: "Pi Desktop",
			availability: { status: "missing", checkedAt: firstNow },
		});
		const trackedPath = await mkdtemp(join(tmpdir(), "pi-tracked-"));
		const trackedProject = createProject(trackedPath, {
			displayName: "Already tracked",
		});
		const initialStore = {
			...createEmptyProjectStore(),
			projects: [oldProject, trackedProject],
			selectedProjectId: oldProject.id,
			chatsByProject: {
				[oldProject.id]: [createChat(oldProject, { id: "chat:old", title: "Old project chat" })],
				[trackedProject.id]: [createChat(trackedProject, { id: "chat:tracked", title: "Tracked project chat" })],
			},
		};
		const { memoryStore, service } = await createService({
			initialStore,
			openFolderDialog: async () => trackedPath,
		});

		await expect(service.locateFolder({ projectId: oldProject.id })).rejects.toThrow(/already tracked/);
		expect(memoryStore.file.save).not.toHaveBeenCalled();
		expect(memoryStore.read()).toEqual(initialStore);
	});

	it("leaves state unchanged when locating a folder is cancelled", async () => {
		const project = createProject("/missing/pi-desktop", {
			availability: { status: "missing", checkedAt: firstNow },
		});
		const initialStore = {
			...createEmptyProjectStore(),
			projects: [project],
			selectedProjectId: project.id,
		};
		const { memoryStore, service } = await createService({
			initialStore,
			openFolderDialog: async () => null,
		});

		const view = await service.locateFolder({ projectId: project.id });

		expect(view.selectedProjectId).toBe(project.id);
		expect(memoryStore.file.save).not.toHaveBeenCalled();
		expect(memoryStore.read()).toEqual(initialStore);
	});

	it("updates availability to available when the folder can be accessed", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-available-"));
		const project = createProject(projectPath, {
			availability: { status: "missing", checkedAt: firstNow },
		});
		const { service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
			},
			now: () => secondNow,
		});

		const view = await service.checkAvailability({ projectId: project.id });

		expect(view.projects[0]?.availability).toEqual({ status: "available", checkedAt: secondNow });
	});

	it("updates availability to missing when the folder cannot be accessed", async () => {
		const project = createProject("/tmp/path-that-does-not-exist-for-pi-desktop");
		const { service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
			},
			now: () => secondNow,
		});

		const view = await service.checkAvailability({ projectId: project.id });

		expect(view.projects[0]?.availability).toEqual({ status: "missing", checkedAt: secondNow });
	});

	it("updates unavailable availability to available when the folder can be accessed", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-unavailable-recovered-"));
		const project = createProject(projectPath, {
			availability: { status: "unavailable", checkedAt: firstNow, reason: "Permission denied" },
		});
		const { service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
			},
			now: () => secondNow,
		});

		const view = await service.checkAvailability({ projectId: project.id });

		expect(view.projects[0]?.availability).toEqual({ status: "available", checkedAt: secondNow });
	});

	it("updates available availability to unavailable after a non-missing access failure", async () => {
		const project = createProject("/tmp/pi-invalid\0");
		const { service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
			},
			now: () => secondNow,
		});

		const view = await service.checkAvailability({ projectId: project.id });

		expect(view.projects[0]?.availability).toEqual({
			status: "unavailable",
			checkedAt: secondNow,
			reason: expect.stringContaining("null bytes"),
		});
	});

	it("resolves an available project workspace before starting a session", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-session-workspace-"));
		const project = createProject(projectPath, { displayName: "Renamed project" });
		const { service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
			},
			now: () => secondNow,
		});

		await expect(service.getSessionWorkspace({ projectId: project.id })).resolves.toEqual({
			projectId: project.id,
			displayName: basename(projectPath),
			path: projectPath,
		});
	});

	it("persists a recovered available project workspace before starting a session", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-session-recovered-"));
		const project = createProject(projectPath, {
			availability: { status: "missing", checkedAt: firstNow },
		});
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
			},
			now: () => secondNow,
		});

		await expect(service.getSessionWorkspace({ projectId: project.id })).resolves.toEqual({
			projectId: project.id,
			displayName: basename(projectPath),
			path: projectPath,
		});
		expect(memoryStore.read().projects[0]?.availability).toEqual({ status: "available", checkedAt: secondNow });
	});

	it("rejects a regular file project workspace before starting a session", async () => {
		const projectDir = await mkdtemp(join(tmpdir(), "pi-session-file-"));
		const projectPath = join(projectDir, "workspace-file");
		await writeFile(projectPath, "not a directory");
		const project = createProject(projectPath);
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
			},
			now: () => secondNow,
		});

		await expectRejectsWithMessage(
			service.getSessionWorkspace({ projectId: project.id }),
			"Project path is not a directory.",
		);
		expect(memoryStore.read().projects[0]?.availability).toEqual({
			status: "unavailable",
			checkedAt: secondNow,
			reason: "Project path is not a directory.",
		});
		expect(memoryStore.file.save).toHaveBeenCalledTimes(1);
	});

	it("rejects a missing project workspace before starting a session", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-session-missing-"));
		const project = createProject(projectPath);
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
			},
			now: () => secondNow,
		});
		await rm(projectPath, { recursive: true });

		await expectRejectsWithMessage(
			service.getSessionWorkspace({ projectId: project.id }),
			"Project folder is missing. Locate the folder before starting a Pi session.",
		);
		expect(memoryStore.read().projects[0]?.availability).toEqual({ status: "missing", checkedAt: secondNow });
	});

	it("rejects a stored unavailable project workspace after a non-missing access failure", async () => {
		const project = createProject("/tmp/pi-denied\0", {
			availability: { status: "unavailable", checkedAt: firstNow, reason: "Permission denied" },
		});
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
			},
			now: () => secondNow,
		});

		await expectRejectsWithMessage(service.getSessionWorkspace({ projectId: project.id }), "Permission denied");
		expect(memoryStore.read().projects[0]?.availability).toEqual({
			status: "unavailable",
			checkedAt: firstNow,
			reason: "Permission denied",
		});
		expect(memoryStore.file.save).toHaveBeenCalledTimes(1);
	});

	it("marks a deleted unavailable project workspace missing before starting a session", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-session-unavailable-missing-"));
		const project = createProject(projectPath, {
			availability: { status: "unavailable", checkedAt: firstNow, reason: "Permission denied" },
		});
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
			},
			now: () => secondNow,
		});
		await rm(projectPath, { recursive: true });

		await expectRejectsWithMessage(
			service.getSessionWorkspace({ projectId: project.id }),
			"Project folder is missing. Locate the folder before starting a Pi session.",
		);
		expect(memoryStore.read().projects[0]?.availability).toEqual({ status: "missing", checkedAt: secondNow });
	});

	it("creates chat metadata and selects the new chat", async () => {
		const project = createProject("/tmp/pi-desktop");
		const { service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
			},
			now: () => secondNow,
		});

		const view = await service.createChat({ projectId: project.id });

		expect(view.selectedProjectId).toBe(project.id);
		expect(view.selectedChatId).toBe(`chat:${secondNow}:1`);
		expect(view.selectedChat).toEqual(
			createChat(project, {
				id: `chat:${secondNow}:1`,
				title: "New chat",
				createdAt: secondNow,
				updatedAt: secondNow,
				lastOpenedAt: secondNow,
			}),
		);
	});

	it("creates distinct chat ids when multiple chats share the same timestamp", async () => {
		const project = createProject("/tmp/pi-desktop");
		const { service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
			},
			now: () => secondNow,
		});

		const firstView = await service.createChat({ projectId: project.id });
		const secondView = await service.createChat({ projectId: project.id });

		expect(firstView.selectedChatId).toBe(`chat:${secondNow}:1`);
		expect(secondView.selectedChatId).toBe(`chat:${secondNow}:2`);
		expect(secondView.selectedProject?.chats.map((chat) => chat.id).sort()).toEqual([
			`chat:${secondNow}:1`,
			`chat:${secondNow}:2`,
		]);
	});

	it("preserves concurrent chat creations for the same project", async () => {
		const project = createProject("/tmp/pi-desktop");
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
			},
			now: () => secondNow,
		});

		await Promise.all([service.createChat({ projectId: project.id }), service.createChat({ projectId: project.id })]);

		expect(
			memoryStore
				.read()
				.chatsByProject[project.id]?.map((chat) => chat.id)
				.sort(),
		).toEqual([`chat:${secondNow}:1`, `chat:${secondNow}:2`]);
	});

	it("creates a Desktop quick-start draft chat in the desktop chats workspace", async () => {
		const desktopChatsPath = await mkdtemp(join(tmpdir(), "pi-desktop-chats-"));
		const { memoryStore, service } = await createService({ desktopChatsPath });

		const view = await service.createStandaloneChat({});

		expect(view.selectedProjectId).toBeNull();
		expect(view.selectedChat?.cwd).toBe(desktopChatsPath);
		expect(view.selectedChat?.source).toBe("draft");
		expect(memoryStore.read().standaloneChats[0]).toEqual(
			expect.objectContaining({
				cwd: desktopChatsPath,
				source: "draft",
				title: "New chat",
			}),
		);
	});

	it("selects a chat that belongs to the provided project", async () => {
		const project = createProject("/tmp/pi-desktop");
		const chat = createChat(project);
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				chatsByProject: {
					[project.id]: [chat],
				},
			},
		});

		await service.selectChat({ projectId: project.id, chatId: chat.id });

		expect(memoryStore.read().selectedProjectId).toBe(project.id);
		expect(memoryStore.read().selectedChatId).toBe(chat.id);
	});

	it("updates project lastOpenedAt when selecting a chat", async () => {
		const olderProject = createProject("/tmp/older", { lastOpenedAt: firstNow });
		const activeProject = createProject("/tmp/active", { lastOpenedAt: "2026-05-12T08:00:00.000Z" });
		const chat = createChat(activeProject);
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [olderProject, activeProject],
				chatsByProject: {
					[activeProject.id]: [chat],
				},
			},
			now: () => secondNow,
		});

		await service.selectChat({ projectId: activeProject.id, chatId: chat.id });

		expect(memoryStore.read().projects.find((project) => project.id === activeProject.id)?.lastOpenedAt).toBe(
			secondNow,
		);
	});

	it("rejects selecting a chat that belongs to a different project", async () => {
		const firstProject = createProject("/tmp/one");
		const secondProject = createProject("/tmp/two");
		const { service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [firstProject, secondProject],
				chatsByProject: {
					[firstProject.id]: [createChat(firstProject)],
				},
			},
		});

		await expect(service.selectChat({ projectId: secondProject.id, chatId: "chat:one" })).rejects.toThrow(
			/Chat does not belong to the selected project/,
		);
	});

	it("returns an existing project chat session start target", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-start-target-project-"));
		const project = createProject(projectPath);
		const sessionPath = join(projectPath, "session.jsonl");
		const chat = createChat(project, {
			id: "chat:session:project",
			source: "pi-session",
			sessionId: "session-project",
			sessionPath,
		});
		const { service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				chatsByProject: {
					[project.id]: [chat],
				},
			},
		});

		await expect(service.getSessionStartTarget({ projectId: project.id, chatId: chat.id })).resolves.toEqual({
			projectId: project.id,
			chatId: chat.id,
			workspacePath: projectPath,
			sessionPath,
		});
	});

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

	it("returns a standalone chat session start target", async () => {
		const workspacePath = await mkdtemp(join(tmpdir(), "pi-start-target-standalone-"));
		const sessionPath = join(workspacePath, "standalone.jsonl");
		const standaloneChat = {
			id: "chat:session:standalone",
			source: "pi-session" as const,
			sessionId: "standalone",
			sessionPath,
			cwd: workspacePath,
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
				standaloneChats: [standaloneChat],
			},
		});

		await expect(service.getSessionStartTarget({ projectId: null, chatId: standaloneChat.id })).resolves.toEqual({
			projectId: null,
			chatId: standaloneChat.id,
			workspacePath,
			sessionPath,
		});
	});

	it("rejects a project session start target for an unknown chat id", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-start-target-"));
		const project = createProject(projectPath);
		const { service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				chatsByProject: {
					[project.id]: [],
				},
			},
		});

		await expect(service.getSessionStartTarget({ projectId: project.id, chatId: "chat:missing" })).rejects.toThrow(
			/Chat not found\./,
		);
	});

	it("preserves failed chat attention when a later dispose records idle", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-failed-dispose-"));
		const project = createProject(projectPath);
		const sessionPath = join(projectPath, "failed.jsonl");
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				sessionUiByPath: {
					[sessionPath]: {
						chatId: "chat:failed",
						sessionId: "sdk-session-failed",
						sessionPath,
						projectId: project.id,
						lastOpenedAt: secondNow,
						status: "failed",
						attention: true,
					},
				},
			},
		});

		await service.recordSessionStatus({
			sessionId: `${project.id}:sdk-session-failed`,
			status: "idle",
			attention: false,
			updatedAt: secondNow,
		});

		expect(memoryStore.read().sessionUiByPath[sessionPath]).toEqual(
			expect.objectContaining({ status: "failed", attention: true }),
		);
	});

	it("does not apply status updates to session ids with only a loose suffix match", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-status-suffix-"));
		const project = createProject(projectPath);
		const sessionPath = join(projectPath, "suffix.jsonl");
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				sessionUiByPath: {
					[sessionPath]: {
						chatId: "chat:suffix",
						sessionId: "c",
						sessionPath,
						projectId: project.id,
						lastOpenedAt: firstNow,
						status: "running",
						attention: false,
					},
				},
			},
		});

		await service.recordSessionStatus({
			sessionId: `${project.id}:uuid-abc`,
			status: "failed",
			attention: true,
			updatedAt: secondNow,
		});

		expect(memoryStore.read().sessionUiByPath[sessionPath]).toEqual(
			expect.objectContaining({ status: "running", attention: false, lastOpenedAt: firstNow }),
		);
	});

	it("hydrates persisted running project sessions as idle after service restart", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-stale-running-"));
		const project = createProject(projectPath);
		const sessionPath = join(projectPath, "running.jsonl");
		const { service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				sessionUiByPath: {
					[sessionPath]: {
						chatId: "chat:running",
						sessionId: "sdk-session-running",
						sessionPath,
						projectId: project.id,
						lastOpenedAt: secondNow,
						status: "running",
						attention: false,
					},
				},
			},
			listProjectSessions: async () => [
				createSessionInfo({
					path: sessionPath,
					id: "sdk-session-running",
					cwd: projectPath,
					name: "Stale running",
				}),
			],
		});

		const view = await service.getState();

		expect(view.projects[0]?.chats[0]).toEqual(expect.objectContaining({ id: "chat:running", status: "idle" }));
	});

	it("records generated chat metadata for a project-level started session", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-project-start-"));
		const project = createProject(projectPath);
		const sessionPath = join(projectPath, "started.jsonl");
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
				selectedChatId: null,
				chatsByProject: {
					[project.id]: [],
				},
			},
			now: () => secondNow,
			listProjectSessions: async () => [
				createSessionInfo({
					path: sessionPath,
					id: "sdk-session-one",
					cwd: projectPath,
					name: "Started from project",
				}),
			],
		});

		const recorded = await service.recordSessionStarted({
			projectId: project.id,
			chatId: null,
			sessionId: `${project.id}:sdk-session-one`,
			sessionPath,
			status: "running",
		});
		const view = await service.getState();

		expect(recorded).toEqual({ chatId: `chat:session:${project.id}:sdk-session-one` });
		expect(memoryStore.read().selectedChatId).toBeNull();
		expect(view.selectedProject?.chats).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: `chat:session:${project.id}:sdk-session-one`,
					projectId: project.id,
					sessionPath,
					title: "Started from project",
					status: "running",
					lastOpenedAt: secondNow,
				}),
			]),
		);
	});

	it("keeps a failed project start visible before the session index catches up", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-project-pending-failed-"));
		const project = createProject(projectPath);
		const draftChat = createChat(project, {
			id: "chat:draft",
			title: "Draft plan",
		});
		const sessionPath = join(projectPath, "started.jsonl");
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
				selectedChatId: draftChat.id,
				chatsByProject: {
					[project.id]: [draftChat],
				},
			},
			now: () => secondNow,
			listProjectSessions: async () => [],
		});

		await service.recordSessionStarted({
			projectId: project.id,
			chatId: draftChat.id,
			sessionId: "sdk-session-one",
			sessionPath,
			status: "running",
		});
		await service.recordSessionStatus({
			sessionId: "sdk-session-one",
			status: "failed",
			attention: true,
			updatedAt: secondNow,
		});
		const view = await service.getState();

		expect(memoryStore.read().chatsByProject[project.id]?.[0]).toEqual(
			expect.objectContaining({ id: draftChat.id, sessionPath, status: "failed", attention: true }),
		);
		expect(view.selectedChat).toEqual(
			expect.objectContaining({ id: draftChat.id, sessionPath, status: "failed", attention: true }),
		);
	});

	it("keeps a started project draft selected before the session index catches up", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-project-pending-start-"));
		const project = createProject(projectPath);
		const draftChat = createChat(project, {
			id: "chat:draft",
			title: "Draft plan",
		});
		const sessionPath = join(projectPath, "started.jsonl");
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
				selectedChatId: draftChat.id,
				chatsByProject: {
					[project.id]: [draftChat],
				},
			},
			now: () => secondNow,
			listProjectSessions: async () => [],
		});

		await service.recordSessionStarted({
			projectId: project.id,
			chatId: draftChat.id,
			sessionId: "sdk-session-one",
			sessionPath,
			status: "running",
		});
		const view = await service.getState();

		expect(memoryStore.read().chatsByProject[project.id]?.[0]).toEqual(
			expect.objectContaining({
				id: draftChat.id,
				source: "pi-session",
				sessionPath,
				status: "running",
			}),
		);
		expect(view.selectedChat).toEqual(expect.objectContaining({ id: draftChat.id, sessionPath }));
	});

	it("syncs a generated session title into project chat metadata", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-project-title-sync-"));
		const project = createProject(projectPath);
		const draftChat = createChat(project, {
			id: "chat:draft",
			title: "New chat",
		});
		const sessionPath = join(projectPath, "started.jsonl");
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
				selectedChatId: draftChat.id,
				chatsByProject: {
					[project.id]: [draftChat],
				},
			},
			now: () => secondNow,
			listProjectSessions: async () => [
				createSessionInfo({
					path: sessionPath,
					id: "sdk-session-one",
					cwd: projectPath,
					name: "Generated title",
				}),
			],
		});

		await service.recordSessionStarted({
			projectId: project.id,
			chatId: draftChat.id,
			sessionId: "sdk-session-one",
			sessionPath,
			status: "running",
		});
		const view = await service.syncSessionChatTitle({
			sessionId: "sdk-session-one",
			status: "idle",
			attention: false,
			updatedAt: secondNow,
		});

		expect(memoryStore.read().chatsByProject[project.id]?.[0]?.title).toBe("Generated title");
		expect(view.selectedProject?.chats[0]?.title).toBe("Generated title");
	});

	it("converts a started draft chat to one Pi-backed chat after state refresh", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-started-draft-"));
		const project = createProject(projectPath);
		const draftChat = createChat(project, {
			id: "chat:draft",
			title: "Draft plan",
		});
		const sessionPath = join(projectPath, "started.jsonl");
		const { memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
				selectedChatId: draftChat.id,
				chatsByProject: {
					[project.id]: [draftChat],
				},
			},
			now: () => secondNow,
			listProjectSessions: async () => [
				createSessionInfo({
					path: sessionPath,
					id: "sdk-session-one",
					cwd: projectPath,
					name: "Started draft",
				}),
			],
		});

		await service.recordSessionStarted({
			projectId: project.id,
			chatId: draftChat.id,
			sessionId: "sdk-session-one",
			sessionPath,
			status: "running",
		});
		const storedAfterStart = memoryStore.read();
		const view = await service.getState();

		expect(storedAfterStart.chatsByProject[project.id]).toEqual([
			expect.objectContaining({
				id: draftChat.id,
				projectId: project.id,
				source: "pi-session",
				sessionId: "sdk-session-one",
				sessionPath,
				title: "Draft plan",
				status: "running",
			}),
		]);
		expect(view.selectedProject?.chats).toHaveLength(1);
		expect(view.selectedProject?.chats[0]).toEqual(
			expect.objectContaining({
				id: draftChat.id,
				projectId: project.id,
				source: "pi-session",
				sessionId: `${project.id}:sdk-session-one`,
				sessionPath,
				title: "Draft plan",
				status: "running",
				attention: false,
				lastOpenedAt: secondNow,
			}),
		);
		expect(view.selectedChat?.id).toBe(draftChat.id);
	});

	it("keeps a started quick-start draft selected before the session index catches up", async () => {
		const desktopChatsPath = await mkdtemp(join(tmpdir(), "pi-desktop-chats-"));
		const sessionPath = join(desktopChatsPath, "started.jsonl");
		const { memoryStore, service } = await createService({
			desktopChatsPath,
			now: () => secondNow,
			listProjectSessions: async () => [],
		});
		const created = await service.createStandaloneChat({});
		const chatId = created.selectedChatId;
		if (!chatId) {
			throw new Error("Expected selected quick-start chat.");
		}

		await service.recordSessionStarted({
			projectId: null,
			chatId,
			sessionId: "sdk-session-quick",
			sessionPath,
			status: "running",
		});
		const view = await service.getState();

		expect(memoryStore.read().standaloneChats[0]).toEqual(
			expect.objectContaining({
				id: chatId,
				source: "pi-session",
				sessionId: "sdk-session-quick",
				sessionPath,
				cwd: desktopChatsPath,
				status: "running",
			}),
		);
		expect(view.selectedProjectId).toBeNull();
		expect(view.selectedChatId).toBe(chatId);
		expect(view.selectedChat).toEqual(expect.objectContaining({ id: chatId, sessionPath }));
	});

	it("renames a Pi-backed chat through session name writer", async () => {
		const project = createProject("/tmp/pi-desktop");
		const sessionPath = "/tmp/pi-desktop/session.jsonl";
		const chat = createChat(project, {
			id: "chat:session:source",
			source: "pi-session",
			sessionId: "source",
			sessionPath,
			title: "Old title",
		});
		const { memoryStore, service, writeSessionName } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
				chatsByProject: {
					[project.id]: [chat],
				},
			},
			now: () => secondNow,
		});

		const view = await service.renameChat({ projectId: project.id, chatId: chat.id, title: "New title" });

		expect(writeSessionName).toHaveBeenCalledWith(sessionPath, "New title");
		expect(view.selectedProject?.chats[0]).toEqual({ ...chat, title: "New title", updatedAt: secondNow });
		expect(memoryStore.read().chatsByProject[project.id]?.[0]).toEqual({
			...chat,
			title: "New title",
			updatedAt: secondNow,
		});
	});

	it("renames a draft chat in the desktop store", async () => {
		const project = createProject("/tmp/pi-desktop");
		const chat = createChat(project, { title: "Draft title" });
		const { memoryStore, service, writeSessionName } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
				chatsByProject: {
					[project.id]: [chat],
				},
			},
			now: () => secondNow,
		});

		const view = await service.renameChat({ projectId: project.id, chatId: chat.id, title: "Renamed draft" });

		expect(writeSessionName).not.toHaveBeenCalled();
		expect(view.selectedProject?.chats[0]).toEqual({ ...chat, title: "Renamed draft", updatedAt: secondNow });
		expect(memoryStore.read().chatsByProject[project.id]?.[0]).toEqual({
			...chat,
			title: "Renamed draft",
			updatedAt: secondNow,
		});
	});

	it("forks a Pi-backed chat into the same project", async () => {
		const project = createProject("/tmp/pi-desktop");
		const sourcePath = "/tmp/pi-desktop/source.jsonl";
		const forkedPath = "/tmp/pi-desktop/forked.jsonl";
		const sourceChat = createChat(project, {
			id: "chat:session:source",
			source: "pi-session",
			sessionId: "source",
			sessionPath: sourcePath,
			title: "Source session",
		});
		const { forkSession, memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				selectedProjectId: project.id,
				chatsByProject: {
					[project.id]: [sourceChat],
				},
			},
			now: () => secondNow,
			forkSession: async () => forkedPath,
			listProjectSessions: async () => [
				createSessionInfo({
					path: sourcePath,
					id: "source",
					cwd: project.path,
					name: "Source session",
				}),
				createSessionInfo({
					path: forkedPath,
					id: "forked",
					cwd: project.path,
					name: "Forked session",
					parentSessionPath: sourcePath,
				}),
			],
		});

		const view = await service.forkChat({ projectId: project.id, chatId: sourceChat.id });

		expect(forkSession).toHaveBeenCalledWith(sourcePath, project.path);
		expect(memoryStore.read().sessionUiByPath[forkedPath]).toEqual({
			chatId: `chat:${secondNow}:2`,
			sessionId: null,
			sessionPath: forkedPath,
			projectId: project.id,
			lastOpenedAt: secondNow,
			status: "idle",
			attention: false,
		});
		expect(view.selectedProject?.chats).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: `chat:${secondNow}:2`,
					projectId: project.id,
					sessionPath: forkedPath,
					title: "Forked session",
					status: "idle",
					attention: false,
					lastOpenedAt: secondNow,
				}),
			]),
		);
	});

	it("clones a Pi-backed chat into the same project", async () => {
		const clonedPath = "/tmp/pi-desktop/cloned.jsonl";
		const { cloneSession, memoryStore, project, service, sourceChat, sourcePath } = await createPiBackedChatService({
			derivedSessionPath: clonedPath,
			derivedSessionId: "cloned",
			derivedSessionName: "Cloned session",
			operation: "clone",
		});

		const view = await service.cloneChat({ projectId: project.id, chatId: sourceChat.id });

		expect(cloneSession).toHaveBeenCalledWith(sourcePath, project.path);
		expectDerivedSessionChat({
			memoryStore,
			view,
			projectId: project.id,
			sessionPath: clonedPath,
			title: "Cloned session",
		});
	});

	it("branches a Pi-backed chat from the selected entry into the same project", async () => {
		const branchedPath = "/tmp/pi-desktop/branched.jsonl";
		const { branchSession, memoryStore, project, service, sourceChat, sourcePath } = await createPiBackedChatService({
			derivedSessionPath: branchedPath,
			derivedSessionId: "branched",
			derivedSessionName: "Branched session",
			operation: "branch",
		});

		const view = await service.branchChat({ projectId: project.id, chatId: sourceChat.id, entryId: "entry-one" });

		expect(branchSession).toHaveBeenCalledWith(sourcePath, project.path, "entry-one");
		expectDerivedSessionChat({
			memoryStore,
			view,
			projectId: project.id,
			sessionPath: branchedPath,
			title: "Branched session",
		});
	});

	it("rejects clone for a draft chat without Pi session path", async () => {
		const project = createProject("/tmp/pi-desktop");
		const chat = createChat(project);
		const { cloneSession, memoryStore, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
				chatsByProject: {
					[project.id]: [chat],
				},
			},
		});

		await expect(service.cloneChat({ projectId: project.id, chatId: chat.id })).rejects.toThrow(
			/Chat does not have a Pi session file yet/,
		);
		expect(cloneSession).not.toHaveBeenCalled();
		expect(memoryStore.file.save).not.toHaveBeenCalled();
	});

	it("sets pinned state and pinned projects sort before unpinned projects", async () => {
		const olderProject = createProject("/tmp/older", { lastOpenedAt: "2026-05-12T08:00:00.000Z" });
		const newerProject = createProject("/tmp/newer", { lastOpenedAt: secondNow });
		const { service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [olderProject, newerProject],
			},
			now: () => secondNow,
		});

		const view = await service.setPinned({ projectId: olderProject.id, pinned: true });

		expect(view.projects.map((project) => project.id)).toEqual([olderProject.id, newerProject.id]);
		expect(view.projects[0]?.pinned).toBe(true);
		expect(view.projects[0]?.updatedAt).toBe(secondNow);
	});

	it("opens the project path in Finder through the dependency", async () => {
		const projectPath = "/tmp/pi-desktop";
		const project = createProject(projectPath);
		const { openInFinder, service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
			},
		});

		await service.openProjectInFinder({ projectId: project.id });

		expect(openInFinder).toHaveBeenCalledWith(projectPath);
	});
	it("rejects when opening the project path in Finder returns an error string", async () => {
		const projectPath = "/tmp/pi-desktop";
		const project = createProject(projectPath);
		const { service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [project],
			},
			openInFinder: async () => "The file does not exist.",
		});

		await expect(service.openProjectInFinder({ projectId: project.id })).rejects.toThrow(/The file does not exist/);
	});

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
				sessionId: `${project.id}:session-project`,
				sessionPath: session.path,
				title: "Project session",
				updatedAt: "2026-05-12T11:00:00.000Z",
			}),
		]);
	});
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

	it("removes preserved standalone chats when their cwd is now a tracked project", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-reclassified-"));
		const project = createProject(projectPath);
		const staleStandaloneChat = {
			id: "chat:session:stale",
			source: "pi-session" as const,
			sessionId: "stale",
			sessionPath: join(projectPath, "stale.jsonl"),
			cwd: projectPath,
			title: "Stale standalone",
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
				standaloneChats: [staleStandaloneChat],
			},
		});

		const view = await service.getState();

		expect(view.standaloneChats).toEqual([]);
		expect(memoryStore.read().standaloneChats).toEqual([]);
	});

	it("clears stale selected standalone chats when loading state", async () => {
		const projectPath = await mkdtemp(join(tmpdir(), "pi-selected-reclassified-"));
		const project = createProject(projectPath);
		const staleStandaloneChat = {
			id: "chat:session:stale-selected",
			source: "pi-session" as const,
			sessionId: "stale-selected",
			sessionPath: join(projectPath, "stale-selected.jsonl"),
			cwd: projectPath,
			title: "Stale selected standalone",
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
				standaloneChats: [staleStandaloneChat],
				selectedProjectId: null,
				selectedChatId: staleStandaloneChat.id,
			},
		});

		const view = await service.getState();
		const saved = memoryStore.read();

		expect(view.standaloneChats).toEqual([]);
		expect(view.selectedProjectId).toBeNull();
		expect(view.selectedChatId).toBeNull();
		expect(saved.standaloneChats).toEqual([]);
		expect(saved.selectedProjectId).toBeNull();
		expect(saved.selectedChatId).toBeNull();
	});

	it("selects standalone chats through the service", async () => {
		const desktopChatsPath = await mkdtemp(join(tmpdir(), "pi-desktop-chats-"));
		const session = createSessionInfo({
			path: join(desktopChatsPath, "standalone.jsonl"),
			id: "standalone",
			cwd: desktopChatsPath,
			name: "Standalone",
			modified: new Date(firstNow),
		});
		const standaloneChat = {
			id: "chat:session:standalone",
			source: "pi-session" as const,
			sessionId: "standalone",
			sessionPath: session.path,
			cwd: desktopChatsPath,
			title: "Standalone",
			status: "idle" as const,
			attention: false,
			createdAt: firstNow,
			updatedAt: firstNow,
			lastOpenedAt: null,
		};
		const { memoryStore, service } = await createService({
			desktopChatsPath,
			listProjectSessions: async (cwd) => (cwd === desktopChatsPath ? [session] : []),
			now: () => secondNow,
		});

		const view = await service.selectStandaloneChat({ chatId: standaloneChat.id });

		expect(view.selectedProjectId).toBeNull();
		expect(view.selectedChatId).toBe(standaloneChat.id);
		expect(view.selectedChat).toEqual({
			...standaloneChat,
			sessionId: "standalone:standalone",
			lastOpenedAt: secondNow,
		});
		expect(memoryStore.read().standaloneChats[0]?.lastOpenedAt).toBe(secondNow);
	});
});
