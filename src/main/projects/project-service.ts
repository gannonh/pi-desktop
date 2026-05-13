import { access, mkdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
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
	availability: { status: "available", checkedAt: now },
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

const refreshProjectAvailability = async (project: ProjectRecord, now: string) => {
	const availability = await checkPathAvailable(project.path);
	const nextAvailability =
		availability.status === "available"
			? { status: "available" as const, checkedAt: now }
			: { status: "missing" as const, checkedAt: now };
	const changed = project.availability.status !== nextAvailability.status;

	return {
		project: changed ? { ...project, availability: nextAvailability } : project,
		changed,
	};
};

const refreshAllProjectAvailability = async (store: ProjectStore, now: string): Promise<boolean> => {
	const refreshedProjects = await Promise.all(
		store.projects.map((project) => refreshProjectAvailability(project, now)),
	);
	const changed = refreshedProjects.some((result) => result.changed);

	if (changed) {
		store.projects = refreshedProjects.map((result) => result.project);
	}

	return changed;
};

const refreshProjectAvailabilityAtIndex = async (
	store: ProjectStore,
	projectIndex: number,
	now: string,
): Promise<boolean> => {
	const result = await refreshProjectAvailability(store.projects[projectIndex], now);
	if (result.changed) {
		store.projects[projectIndex] = result.project;
	}

	return result.changed;
};

const getTrackedProjectNamesUnderDocumentsDir = (store: ProjectStore, documentsDir: string): string[] => {
	const resolvedDocumentsDir = resolve(documentsDir);

	return store.projects
		.filter((project) => dirname(resolve(project.path)) === resolvedDocumentsDir)
		.map((project) => basename(project.path));
};

const createChatId = (now: string, existingChats: readonly ChatMetadata[]): string => {
	const existingIds = new Set(existingChats.map((chat) => chat.id));
	let suffix = existingChats.length + 1;
	let chatId = `chat:${now}:${suffix}`;

	while (existingIds.has(chatId)) {
		suffix += 1;
		chatId = `chat:${now}:${suffix}`;
	}

	return chatId;
};

export const createProjectService = (deps: ProjectServiceDeps): ProjectService => {
	let transactionQueue: Promise<void> = Promise.resolve();

	const runSerialized = async <T>(work: () => Promise<T>): Promise<T> => {
		const run = transactionQueue.then(work, work);
		transactionQueue = run.then(
			() => undefined,
			() => undefined,
		);
		return run;
	};

	return {
		async getState() {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const changed = await refreshAllProjectAvailability(store, deps.now());
				if (changed) {
					await deps.store.save(store);
				}

				return createProjectStateView(store);
			});
		},

		async createFromScratch() {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const projectPath = await getNextScratchProjectPath(
					deps.documentsDir,
					getTrackedProjectNamesUnderDocumentsDir(store, deps.documentsDir),
				);
				const now = deps.now();
				const project = createAvailableProject(projectPath, now);

				await mkdir(projectPath, { recursive: false });
				await deps.initializeGitRepository(projectPath);

				store.projects = [
					...store.projects.filter((existingProject) => existingProject.id !== project.id),
					project,
				];
				store.chatsByProject[project.id] = [];
				store.selectedProjectId = project.id;
				store.selectedChatId = null;

				return saveAndView(deps.store, store);
			});
		},

		async addExistingFolder() {
			return runSerialized(async () => {
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
						availability: { status: "available", checkedAt: now },
					};
					store.chatsByProject[projectId] ??= [];
				}

				store.selectedProjectId = projectId;
				store.selectedChatId = null;

				return saveAndView(deps.store, store);
			});
		},

		async selectProject(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const now = deps.now();
				const projectIndex = findProjectIndex(store, input.projectId);
				selectProjectInStore(store, input.projectId, now);
				await refreshProjectAvailabilityAtIndex(store, projectIndex, now);

				return saveAndView(deps.store, store);
			});
		},

		async renameProject(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const projectIndex = findProjectIndex(store, input.projectId);
				store.projects[projectIndex] = {
					...store.projects[projectIndex],
					displayName: input.displayName,
					updatedAt: deps.now(),
				};

				return saveAndView(deps.store, store);
			});
		},

		async removeProject(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				findProjectIndex(store, input.projectId);
				store.projects = store.projects.filter((project) => project.id !== input.projectId);
				delete store.chatsByProject[input.projectId];
				if (store.selectedProjectId === input.projectId) {
					store.selectedProjectId = null;
					store.selectedChatId = null;
				}

				return saveAndView(deps.store, store);
			});
		},

		async openProjectInFinder(input) {
			const store = await deps.store.load();
			const project = store.projects[findProjectIndex(store, input.projectId)];
			const result = await deps.openInFinder(project.path);
			if (typeof result === "string" && result.length > 0) {
				throw new Error(result);
			}

			return createProjectStateView(store);
		},

		async locateFolder(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const projectIndex = findProjectIndex(store, input.projectId);
				const selectedPath = await deps.openFolderDialog();
				if (selectedPath === null) {
					return createProjectStateView(store);
				}

				const existingProject = store.projects[projectIndex];
				const recoveredId = createProjectId(selectedPath);
				if (recoveredId !== input.projectId && store.projects.some((project) => project.id === recoveredId)) {
					throw new Error("Selected folder is already tracked by another project.");
				}

				const chats = (store.chatsByProject[input.projectId] ?? []).map<ChatMetadata>((chat) => ({
					...chat,
					projectId: recoveredId,
				}));
				const recoveredNow = deps.now();
				const recoveredProject: ProjectRecord = {
					...existingProject,
					id: recoveredId,
					path: selectedPath,
					updatedAt: recoveredNow,
					lastOpenedAt: recoveredNow,
					availability: { status: "available", checkedAt: recoveredNow },
				};

				store.projects = store.projects
					.filter((project) => project.id !== input.projectId && project.id !== recoveredId)
					.concat(recoveredProject);
				delete store.chatsByProject[input.projectId];
				store.chatsByProject[recoveredId] = chats;
				store.selectedProjectId = recoveredId;
				store.selectedChatId = null;

				return saveAndView(deps.store, store);
			});
		},

		async setPinned(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const projectIndex = findProjectIndex(store, input.projectId);
				store.projects[projectIndex] = {
					...store.projects[projectIndex],
					pinned: input.pinned,
					updatedAt: deps.now(),
				};

				return saveAndView(deps.store, store);
			});
		},

		async checkAvailability(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const projectIndex = findProjectIndex(store, input.projectId);
				await refreshProjectAvailabilityAtIndex(store, projectIndex, deps.now());

				return saveAndView(deps.store, store);
			});
		},

		async createChat(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				findProjectIndex(store, input.projectId);
				const now = deps.now();
				const existingChats = store.chatsByProject[input.projectId] ?? [];
				const chat: ChatMetadata = {
					id: createChatId(now, existingChats),
					projectId: input.projectId,
					title: "New chat",
					status: "idle",
					updatedAt: now,
				};

				store.chatsByProject[input.projectId] = [...existingChats, chat];
				store.selectedProjectId = input.projectId;
				store.selectedChatId = chat.id;

				return saveAndView(deps.store, store);
			});
		},

		async selectChat(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				findProjectIndex(store, input.projectId);
				const chat = (store.chatsByProject[input.projectId] ?? []).find(
					(candidate) => candidate.id === input.chatId,
				);
				if (!chat || chat.projectId !== input.projectId) {
					throw new Error("Chat does not belong to the selected project.");
				}

				store.selectedProjectId = input.projectId;
				store.selectedChatId = input.chatId;

				return saveAndView(deps.store, store);
			});
		},
	};
};
