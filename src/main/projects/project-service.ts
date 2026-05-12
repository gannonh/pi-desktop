import { access, mkdir } from "node:fs/promises";
import { basename } from "node:path";
import {
	createProjectId,
	createProjectStateView,
	type ChatMetadata,
	type ProjectRecord,
	type ProjectStateView,
	type ProjectStore,
} from "../../shared/project-state";
import type {
	ChatCreateInput,
	ChatSelectionInput,
	ProjectIdInput,
	ProjectPinnedInput,
	ProjectRenameInput,
} from "../../shared/ipc";
import { getNextScratchProjectPath } from "./project-paths";
import type { ProjectStoreFile } from "./project-store";

export type ProjectServiceDeps = {
	store: ProjectStoreFile;
	documentsDir: string;
	now: () => string;
	openFolderDialog: () => Promise<string | null>;
	openInFinder: (path: string) => Promise<unknown>;
	initializeGitRepository: (projectPath: string) => Promise<void>;
};

export type ProjectService = {
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
	selectChat: (input: ChatSelectionInput) => Promise<ProjectStateView>;
};

const findProjectIndex = (store: ProjectStore, projectId: string): number => {
	const index = store.projects.findIndex((project) => project.id === projectId);
	if (index === -1) {
		throw new Error("Project not found.");
	}

	return index;
};

const createAvailableProject = (projectPath: string, now: string): ProjectRecord => ({
	id: createProjectId(projectPath),
	displayName: basename(projectPath),
	path: projectPath,
	createdAt: now,
	updatedAt: now,
	lastOpenedAt: now,
	pinned: false,
	availability: { status: "available" },
});

const selectProjectInStore = (store: ProjectStore, projectId: string, now: string) => {
	const projectIndex = findProjectIndex(store, projectId);
	store.projects[projectIndex] = {
		...store.projects[projectIndex],
		lastOpenedAt: now,
	};
	store.selectedProjectId = projectId;
	store.selectedChatId = null;
};

const saveAndView = async (storeFile: ProjectStoreFile, store: ProjectStore): Promise<ProjectStateView> => {
	await storeFile.save(store);
	return createProjectStateView(store);
};

const checkPathAvailable = async (projectPath: string) => {
	try {
		await access(projectPath);
		return { status: "available" as const };
	} catch (error) {
		return {
			status: "missing" as const,
			reason: error instanceof Error ? error.message : String(error),
		};
	}
};

export const createProjectService = (deps: ProjectServiceDeps): ProjectService => ({
	async getState() {
		return createProjectStateView(await deps.store.load());
	},

	async createFromScratch() {
		const store = await deps.store.load();
		const projectPath = await getNextScratchProjectPath(deps.documentsDir);
		const now = deps.now();
		const project = createAvailableProject(projectPath, now);

		await mkdir(projectPath, { recursive: false });
		await deps.initializeGitRepository(projectPath);

		store.projects = [...store.projects.filter((existingProject) => existingProject.id !== project.id), project];
		store.chatsByProject[project.id] = [];
		store.selectedProjectId = project.id;
		store.selectedChatId = null;

		return saveAndView(deps.store, store);
	},

	async addExistingFolder() {
		const store = await deps.store.load();
		const selectedPath = await deps.openFolderDialog();
		if (selectedPath === null) {
			return createProjectStateView(store);
		}

		const now = deps.now();
		const projectId = createProjectId(selectedPath);
		const projectIndex = store.projects.findIndex((project) => project.id === projectId);

		if (projectIndex === -1) {
			store.projects.push(createAvailableProject(selectedPath, now));
			store.chatsByProject[projectId] = [];
		} else {
			store.projects[projectIndex] = {
				...store.projects[projectIndex],
				displayName: basename(selectedPath),
				path: selectedPath,
				updatedAt: now,
				lastOpenedAt: now,
				availability: { status: "available" },
			};
			store.chatsByProject[projectId] ??= [];
		}

		store.selectedProjectId = projectId;
		store.selectedChatId = null;

		return saveAndView(deps.store, store);
	},

	async selectProject(input) {
		const store = await deps.store.load();
		selectProjectInStore(store, input.projectId, deps.now());

		return saveAndView(deps.store, store);
	},

	async renameProject(input) {
		const store = await deps.store.load();
		const projectIndex = findProjectIndex(store, input.projectId);
		store.projects[projectIndex] = {
			...store.projects[projectIndex],
			displayName: input.displayName,
			updatedAt: deps.now(),
		};

		return saveAndView(deps.store, store);
	},

	async removeProject(input) {
		const store = await deps.store.load();
		findProjectIndex(store, input.projectId);
		store.projects = store.projects.filter((project) => project.id !== input.projectId);
		delete store.chatsByProject[input.projectId];
		if (store.selectedProjectId === input.projectId) {
			store.selectedProjectId = null;
			store.selectedChatId = null;
		}

		return saveAndView(deps.store, store);
	},

	async openProjectInFinder(input) {
		const store = await deps.store.load();
		const project = store.projects[findProjectIndex(store, input.projectId)];
		await deps.openInFinder(project.path);

		return createProjectStateView(store);
	},

	async locateFolder(input) {
		const store = await deps.store.load();
		const projectIndex = findProjectIndex(store, input.projectId);
		const selectedPath = await deps.openFolderDialog();
		if (selectedPath === null) {
			return createProjectStateView(store);
		}

		const existingProject = store.projects[projectIndex];
		const recoveredId = createProjectId(selectedPath);
		const chats = (store.chatsByProject[input.projectId] ?? []).map<ChatMetadata>((chat) => ({
			...chat,
			projectId: recoveredId,
		}));
		const recoveredProject: ProjectRecord = {
			...existingProject,
			id: recoveredId,
			path: selectedPath,
			updatedAt: deps.now(),
			lastOpenedAt: deps.now(),
			availability: { status: "available" },
		};

		store.projects = store.projects
			.filter((project) => project.id !== input.projectId && project.id !== recoveredId)
			.concat(recoveredProject);
		delete store.chatsByProject[input.projectId];
		store.chatsByProject[recoveredId] = chats;
		store.selectedProjectId = recoveredId;
		store.selectedChatId = null;

		return saveAndView(deps.store, store);
	},

	async setPinned(input) {
		const store = await deps.store.load();
		const projectIndex = findProjectIndex(store, input.projectId);
		store.projects[projectIndex] = {
			...store.projects[projectIndex],
			pinned: input.pinned,
			updatedAt: deps.now(),
		};

		return saveAndView(deps.store, store);
	},

	async checkAvailability(input) {
		const store = await deps.store.load();
		const projectIndex = findProjectIndex(store, input.projectId);
		const availability = await checkPathAvailable(store.projects[projectIndex].path);
		store.projects[projectIndex] = {
			...store.projects[projectIndex],
			availability:
				availability.status === "available"
					? { status: "available", checkedAt: deps.now() }
					: { status: "missing", checkedAt: deps.now() },
		};

		return saveAndView(deps.store, store);
	},

	async createChat(input) {
		const store = await deps.store.load();
		findProjectIndex(store, input.projectId);
		const now = deps.now();
		const chat: ChatMetadata = {
			id: `chat:${now}`,
			projectId: input.projectId,
			title: "New chat",
			status: "idle",
			updatedAt: now,
		};

		store.chatsByProject[input.projectId] = [...(store.chatsByProject[input.projectId] ?? []), chat];
		store.selectedProjectId = input.projectId;
		store.selectedChatId = chat.id;

		return saveAndView(deps.store, store);
	},

	async selectChat(input) {
		const store = await deps.store.load();
		findProjectIndex(store, input.projectId);
		const chat = (store.chatsByProject[input.projectId] ?? []).find((candidate) => candidate.id === input.chatId);
		if (!chat || chat.projectId !== input.projectId) {
			throw new Error("Chat does not belong to the selected project.");
		}

		store.selectedProjectId = input.projectId;
		store.selectedChatId = input.chatId;

		return saveAndView(deps.store, store);
	},
});
