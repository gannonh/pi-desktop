import { access, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createProjectService } from "../../src/main/projects/project-service";
import type { ProjectStoreFile } from "../../src/main/projects/project-store";
import { createEmptyProjectStore, createProjectId, type ProjectStore } from "../../src/shared/project-state";

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
		now?: () => string;
		openFolderDialog?: () => Promise<string | null>;
		openInFinder?: (path: string) => Promise<unknown>;
		initializeGitRepository?: (path: string) => Promise<void>;
	} = {},
) => {
	const documentsDir = options.documentsDir ?? (await mkdtemp(join(tmpdir(), "pi-documents-")));
	const memoryStore = createMemoryStore(options.initialStore);
	const initializeGitRepository = vi.fn(options.initializeGitRepository ?? (async () => undefined));
	const openInFinder = vi.fn(options.openInFinder ?? (async () => undefined));
	const openFolderDialog = vi.fn(options.openFolderDialog ?? (async () => null));

	return {
		documentsDir,
		memoryStore,
		initializeGitRepository,
		openInFinder,
		openFolderDialog,
		service: createProjectService({
			store: memoryStore.file,
			documentsDir,
			now: options.now ?? (() => firstNow),
			openFolderDialog,
			openInFinder,
			initializeGitRepository,
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
				availability: { status: "available" },
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
					[project.id]: [
						{
							id: "chat:one",
							projectId: project.id,
							title: "Plan",
							status: "idle",
							updatedAt: firstNow,
						},
					],
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
					[selectedProject.id]: [
						{
							id: "chat:selected",
							projectId: selectedProject.id,
							title: "Selected",
							status: "idle",
							updatedAt: firstNow,
						},
					],
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
					[oldProject.id]: [
						{
							id: "chat:one",
							projectId: oldProject.id,
							title: "Plan",
							status: "idle",
							updatedAt: firstNow,
						},
					],
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
				id: "chat:one",
				projectId: recoveredId,
				title: "Plan",
				status: "idle",
				updatedAt: firstNow,
			},
		]);
		expect(memoryStore.read().chatsByProject[oldProject.id]).toBeUndefined();
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
				[oldProject.id]: [
					{
						id: "chat:old",
						projectId: oldProject.id,
						title: "Old project chat",
						status: "idle" as const,
						updatedAt: firstNow,
					},
				],
				[trackedProject.id]: [
					{
						id: "chat:tracked",
						projectId: trackedProject.id,
						title: "Tracked project chat",
						status: "idle" as const,
						updatedAt: firstNow,
					},
				],
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
		expect(view.selectedChat).toEqual({
			id: `chat:${secondNow}:1`,
			projectId: project.id,
			title: "New chat",
			status: "idle",
			updatedAt: secondNow,
		});
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

	it("selects a chat that belongs to the provided project", async () => {
		const project = createProject("/tmp/pi-desktop");
		const chat = {
			id: "chat:one",
			projectId: project.id,
			title: "Plan",
			status: "idle" as const,
			updatedAt: firstNow,
		};
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

	it("rejects selecting a chat that belongs to a different project", async () => {
		const firstProject = createProject("/tmp/one");
		const secondProject = createProject("/tmp/two");
		const { service } = await createService({
			initialStore: {
				...createEmptyProjectStore(),
				projects: [firstProject, secondProject],
				chatsByProject: {
					[firstProject.id]: [
						{
							id: "chat:one",
							projectId: firstProject.id,
							title: "Plan",
							status: "idle",
							updatedAt: firstNow,
						},
					],
				},
			},
		});

		await expect(service.selectChat({ projectId: secondProject.id, chatId: "chat:one" })).rejects.toThrow(
			/Chat does not belong to the selected project/,
		);
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
});
