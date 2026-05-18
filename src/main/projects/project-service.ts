import { mkdir, stat } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import type { SessionInfo } from "@earendil-works/pi-coding-agent";
import {
	createProjectId,
	createProjectStateView,
	type ChatMetadata,
	type ChatStatus,
	type ProjectRecord,
	type ProjectStateView,
	type ProjectStore,
	type StandaloneChatMetadata,
} from "../../shared/project-state";
import type {
	ChatBranchInput,
	ChatCloneInput,
	ChatCreateInput,
	ChatForkInput,
	ChatRenameInput,
	ChatSelectionInput,
	ChatStandaloneCreateInput,
	ChatStandaloneSelectionInput,
	ProjectIdInput,
	ProjectPinnedInput,
	ProjectRenameInput,
} from "../../shared/ipc";
import {
	createChatFromSessionInfo,
	createStandaloneChatFromSessionInfo,
	defaultChatTitle,
	getChatTitleFromSessionInfo,
	readSessionInfoForPath,
	resolveChatTitleForSession,
} from "../sessions/pi-session-index";
import { getNextScratchProjectPath } from "./project-paths";
import type { ProjectStoreFile } from "./project-store";

export type ProjectServiceDeps = {
	store: ProjectStoreFile;
	documentsDir: string;
	desktopChatsPath: string;
	now: () => string;
	openFolderDialog: () => Promise<string | null>;
	openInFinder: (path: string) => Promise<unknown>;
	initializeGitRepository: (projectPath: string) => Promise<void>;
	listProjectSessions: (cwd: string) => Promise<SessionInfo[]>;
	readSessionInfoForPath: (sessionPath: string) => Promise<SessionInfo | null>;
	writeSessionName: (sessionPath: string, name: string) => Promise<void>;
	forkSession: (sourcePath: string, targetCwd: string) => Promise<string>;
	cloneSession: (sourcePath: string, targetCwd: string) => Promise<string>;
	branchSession: (sourcePath: string, targetCwd: string, entryId: string) => Promise<string>;
};

export type SessionWorkspace = {
	projectId: string;
	displayName: string;
	path: string;
};

export type SessionStartTargetInput = { projectId: string | null; chatId: string | null };
export type SessionStartTarget = {
	projectId: string | null;
	chatId: string | null;
	workspacePath: string;
	sessionPath: string | null;
};
export type SessionStartedInput = {
	projectId: string | null;
	chatId: string | null;
	sessionId: string;
	sessionPath: string | null;
	status: ChatStatus;
};
export type SessionStartedResult = {
	chatId: string | null;
};
export type SessionStatusInput = {
	sessionId: string;
	status: ChatStatus;
	attention: boolean;
	updatedAt: string;
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
	getSessionWorkspace: (input: ProjectIdInput) => Promise<SessionWorkspace>;
	createChat: (input: ChatCreateInput) => Promise<ProjectStateView>;
	createStandaloneChat: (input: ChatStandaloneCreateInput) => Promise<ProjectStateView>;
	selectChat: (input: ChatSelectionInput) => Promise<ProjectStateView>;
	renameChat: (input: ChatRenameInput) => Promise<ProjectStateView>;
	selectStandaloneChat: (input: ChatStandaloneSelectionInput) => Promise<ProjectStateView>;
	forkChat: (input: ChatForkInput) => Promise<ProjectStateView>;
	cloneChat: (input: ChatCloneInput) => Promise<ProjectStateView>;
	branchChat: (input: ChatBranchInput) => Promise<ProjectStateView>;
	getSessionStartTarget: (input: SessionStartTargetInput) => Promise<SessionStartTarget>;
	recordSessionStarted: (input: SessionStartedInput) => Promise<SessionStartedResult>;
	recordSessionStatus: (input: SessionStatusInput) => Promise<void>;
	syncSessionChatTitle: (input: SessionStatusInput) => Promise<ProjectStateView>;
};

const findProjectIndex = (store: ProjectStore, projectId: string): number => {
	const index = store.projects.findIndex((project) => project.id === projectId);
	if (index === -1) {
		throw new Error("Project not found.");
	}

	return index;
};

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

const touchProjectLastOpened = (store: ProjectStore, projectId: string, now: string) => {
	const projectIndex = findProjectIndex(store, projectId);
	store.projects[projectIndex] = {
		...store.projects[projectIndex],
		lastOpenedAt: now,
	};
};

const selectProjectInStore = (store: ProjectStore, projectId: string, now: string) => {
	touchProjectLastOpened(store, projectId, now);
	store.selectedProjectId = projectId;
	store.selectedChatId = null;
};

const pruneMissingStandaloneSelection = (store: ProjectStore) => {
	if (
		store.selectedProjectId === null &&
		store.selectedChatId !== null &&
		!store.standaloneChats.some((chat) => chat.id === store.selectedChatId)
	) {
		store.selectedChatId = null;
	}
};

const saveAndView = async (storeFile: ProjectStoreFile, store: ProjectStore): Promise<ProjectStateView> => {
	pruneMissingStandaloneSelection(store);
	await storeFile.save(store);
	return createProjectStateView(store);
};

const refreshSessionChats = async (
	deps: ProjectServiceDeps,
	store: ProjectStore,
	activeSessionIds: ReadonlySet<string>,
): Promise<ProjectStore> => {
	const nextStore = structuredClone(store);

	for (const project of nextStore.projects) {
		if (project.availability.status !== "available") {
			continue;
		}

		const sessions = await deps.listProjectSessions(project.path);
		const existingChats = nextStore.chatsByProject[project.id] ?? [];
		const piChats = sessions.map((session) => {
			const ui = nextStore.sessionUiByPath[session.path];
			const existingUiChat = ui ? existingChats.find((chat) => chat.id === ui.chatId) : undefined;
			const status =
				ui?.status === "running" && !activeSessionIds.has(ui.sessionId ?? "") ? "idle" : (ui?.status ?? "idle");
			const base = createChatFromSessionInfo({
				session,
				projectId: project.id,
				cwd: project.path,
				status,
				attention: status === "failed" ? (ui?.attention ?? false) : false,
				lastOpenedAt: ui?.lastOpenedAt ?? null,
			});
			return ui
				? {
						...base,
						id: ui.chatId,
						title:
							ui.sessionId && activeSessionIds.has(ui.sessionId)
								? resolveChatTitleForSession(existingUiChat?.title, base.title)
								: base.title,
					}
				: base;
		});
		const seenSessionPaths = new Set(piChats.map((chat) => chat.sessionPath).filter((value) => value !== null));
		const pendingStartedChats = existingChats
			.filter(
				(chat) =>
					chat.source === "pi-session" &&
					chat.sessionPath !== null &&
					nextStore.sessionUiByPath[chat.sessionPath] !== undefined &&
					(activeSessionIds.has(chat.sessionId ?? "") ||
						nextStore.sessionUiByPath[chat.sessionPath]?.status === "failed") &&
					!seenSessionPaths.has(chat.sessionPath),
			)
			.map((chat) => {
				const ui = chat.sessionPath ? nextStore.sessionUiByPath[chat.sessionPath] : undefined;
				return ui
					? {
							...chat,
							status: ui.status ?? chat.status,
							attention: ui.attention ?? chat.attention,
							updatedAt: ui.lastOpenedAt ?? chat.updatedAt,
						}
					: chat;
			});
		const drafts = existingChats.filter((chat) => chat.source === "draft");
		const chats = [...piChats, ...pendingStartedChats, ...drafts];
		if (chats.length > 0 || nextStore.chatsByProject[project.id] !== undefined) {
			nextStore.chatsByProject[project.id] = chats;
		}
	}

	const standaloneSessions = await deps.listProjectSessions(deps.desktopChatsPath);
	const standaloneChats = standaloneSessions.map((session) => {
		const ui = nextStore.sessionUiByPath[session.path];
		const status =
			ui?.status === "running" && !activeSessionIds.has(ui.sessionId ?? "") ? "idle" : (ui?.status ?? "idle");
		const base = createStandaloneChatFromSessionInfo({
			session,
			cwd: deps.desktopChatsPath,
			status,
			attention: status === "failed" ? (ui?.attention ?? false) : false,
			lastOpenedAt: ui?.lastOpenedAt ?? null,
		});
		const existingUiChat = ui
			? nextStore.standaloneChats.find((chat) => chat.id === ui.chatId)
			: undefined;
		return ui
			? {
					...base,
					id: ui.chatId,
					title:
						ui.sessionId && activeSessionIds.has(ui.sessionId)
							? resolveChatTitleForSession(existingUiChat?.title, base.title)
							: base.title,
				}
			: base;
	});
	const seenStandaloneSessionPaths = new Set(standaloneChats.map((chat) => chat.sessionPath));
	const pendingStartedChats = nextStore.standaloneChats
		.filter(
			(chat) =>
				chat.source === "pi-session" &&
				chat.cwd === deps.desktopChatsPath &&
				chat.sessionPath !== null &&
				nextStore.sessionUiByPath[chat.sessionPath] !== undefined &&
				(activeSessionIds.has(chat.sessionId ?? "") ||
					nextStore.sessionUiByPath[chat.sessionPath]?.status === "failed") &&
				!seenStandaloneSessionPaths.has(chat.sessionPath),
		)
		.map((chat) => {
			const ui = chat.sessionPath ? nextStore.sessionUiByPath[chat.sessionPath] : undefined;
			return ui
				? {
						...chat,
						status: ui.status ?? chat.status,
						attention: ui.attention ?? chat.attention,
						updatedAt: ui.lastOpenedAt ?? chat.updatedAt,
					}
				: chat;
		});
	const drafts = nextStore.standaloneChats.filter(
		(chat) => chat.source === "draft" && !seenStandaloneSessionPaths.has(chat.sessionPath),
	);
	nextStore.standaloneChats = [...standaloneChats, ...pendingStartedChats, ...drafts];
	pruneMissingStandaloneSelection(nextStore);

	return nextStore;
};

const getErrorCode = (error: unknown): unknown =>
	typeof error === "object" && error !== null && "code" in error ? error.code : undefined;

const checkPathAvailable = async (projectPath: string) => {
	try {
		const stats = await stat(projectPath);
		if (stats.isDirectory()) {
			return { status: "available" as const };
		}

		return { status: "unavailable" as const, reason: "Project path is not a directory." };
	} catch (error) {
		const code = getErrorCode(error);
		return {
			status: code === "ENOENT" || code === "ENOTDIR" ? ("missing" as const) : ("unavailable" as const),
			reason: error instanceof Error ? error.message : String(error),
		};
	}
};

const refreshProjectAvailability = async (project: ProjectRecord, now: string) => {
	const availability = await checkPathAvailable(project.path);
	const nextAvailability =
		availability.status === "available"
			? { status: "available" as const, checkedAt: now }
			: availability.status === "missing"
				? { status: "missing" as const, checkedAt: now }
				: project.availability.status === "unavailable"
					? project.availability
					: { status: "unavailable" as const, checkedAt: now, reason: availability.reason };
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

const createChatId = (now: string, existingChats: readonly { id: string }[]): string => {
	const existingIds = new Set(existingChats.map((chat) => chat.id));
	let suffix = existingChats.length + 1;
	let chatId = `chat:${now}:${suffix}`;

	while (existingIds.has(chatId)) {
		suffix += 1;
		chatId = `chat:${now}:${suffix}`;
	}

	return chatId;
};

const sessionIdMatchesUiSession = (sessionId: string, uiSessionId: string | null): boolean =>
	uiSessionId !== null && (sessionId === uiSessionId || sessionId.endsWith(`:${uiSessionId}`));

const syncChatTitleForSession = async (
	deps: Pick<ProjectServiceDeps, "readSessionInfoForPath">,
	store: ProjectStore,
	sessionId: string,
	now: string,
): Promise<boolean> => {
	let changed = false;

	for (const [sessionPath, ui] of Object.entries(store.sessionUiByPath)) {
		if (!sessionIdMatchesUiSession(sessionId, ui.sessionId)) {
			continue;
		}

		const session = await deps.readSessionInfoForPath(sessionPath);
		if (!session) {
			continue;
		}

		const sessionTitle = getChatTitleFromSessionInfo(session);
		const projectId = ui.projectId;

		if (projectId !== null) {
			const projectChats = store.chatsByProject[projectId] ?? [];
			store.chatsByProject[projectId] = projectChats.map((chat) => {
				if (chat.id !== ui.chatId) {
					return chat;
				}

				const title = resolveChatTitleForSession(chat.title, sessionTitle);
				if (title === chat.title) {
					return chat;
				}

				changed = true;
				return { ...chat, title, updatedAt: now };
			});
			continue;
		}

		store.standaloneChats = store.standaloneChats.map((chat) => {
			if (chat.id !== ui.chatId) {
				return chat;
			}

			const title = resolveChatTitleForSession(chat.title, sessionTitle);
			if (title === chat.title) {
				return chat;
			}

			changed = true;
			return { ...chat, title, updatedAt: now };
		});
	}

	return changed;
};

export const createProjectService = (deps: ProjectServiceDeps): ProjectService => {
	let transactionQueue: Promise<void> = Promise.resolve();
	const activeSessionIds = new Set<string>();

	const runSerialized = async <T>(work: () => Promise<T>): Promise<T> => {
		const run = transactionQueue.then(work, work);
		transactionQueue = run.then(
			() => undefined,
			() => undefined,
		);
		return run;
	};

	const saveAndViewWithSessions = async (store: ProjectStore): Promise<ProjectStateView> => {
		const withSessions = await refreshSessionChats(deps, store, activeSessionIds);
		await deps.store.save(withSessions);
		return createProjectStateView(withSessions);
	};

	return {
		async getState() {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const changed = await refreshAllProjectAvailability(store, deps.now());
				const withSessions = await refreshSessionChats(deps, store, activeSessionIds);
				if (changed || JSON.stringify(withSessions) !== JSON.stringify(store)) {
					await deps.store.save(withSessions);
				}

				return createProjectStateView(withSessions);
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

				return saveAndViewWithSessions(store);
			});
		},

		async selectProject(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const now = deps.now();
				const projectIndex = findProjectIndex(store, input.projectId);
				selectProjectInStore(store, input.projectId, now);
				await refreshProjectAvailabilityAtIndex(store, projectIndex, now);

				return saveAndViewWithSessions(store);
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

		async getSessionWorkspace(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const projectIndex = findProjectIndex(store, input.projectId);
				const availabilityChanged = await refreshProjectAvailabilityAtIndex(store, projectIndex, deps.now());
				const project = store.projects[projectIndex];
				if (availabilityChanged) {
					await deps.store.save(store);
				}

				if (project.availability.status === "missing") {
					if (!availabilityChanged) {
						await deps.store.save(store);
					}
					throw new Error("Project folder is missing. Locate the folder before starting a Pi session.");
				}

				if (project.availability.status === "unavailable") {
					if (!availabilityChanged) {
						await deps.store.save(store);
					}
					throw new Error(project.availability.reason);
				}

				return {
					projectId: project.id,
					displayName: basename(project.path),
					path: project.path,
				};
			});
		},

		async createChat(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const project = store.projects[findProjectIndex(store, input.projectId)];
				const now = deps.now();
				const existingChats = store.chatsByProject[input.projectId] ?? [];
				const chat: ChatMetadata = {
					id: createChatId(now, existingChats),
					projectId: input.projectId,
					source: "draft",
					sessionId: null,
					sessionPath: null,
					cwd: project.path,
					title: defaultChatTitle,
					status: "idle",
					attention: false,
					createdAt: now,
					updatedAt: now,
					lastOpenedAt: now,
				};

				store.chatsByProject[input.projectId] = [...existingChats, chat];
				touchProjectLastOpened(store, input.projectId, now);
				store.selectedProjectId = input.projectId;
				store.selectedChatId = chat.id;

				return saveAndView(deps.store, store);
			});
		},

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
					title: defaultChatTitle,
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

				touchProjectLastOpened(store, input.projectId, deps.now());
				store.selectedProjectId = input.projectId;
				store.selectedChatId = input.chatId;

				return saveAndView(deps.store, store);
			});
		},

		async renameChat(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const now = deps.now();

				if (input.projectId === null) {
					const chatIndex = store.standaloneChats.findIndex((chat) => chat.id === input.chatId);
					if (chatIndex === -1) {
						throw new Error("Standalone chat not found.");
					}

					const chat = store.standaloneChats[chatIndex];
					if (chat.sessionPath) {
						await deps.writeSessionName(chat.sessionPath, input.title);
					}
					store.standaloneChats[chatIndex] = {
						...chat,
						title: input.title,
						updatedAt: now,
					};

					return saveAndView(deps.store, store);
				}

				const chat = findProjectChat(store, input.projectId, input.chatId);
				if (chat.sessionPath) {
					await deps.writeSessionName(chat.sessionPath, input.title);
				}
				const projectChats = store.chatsByProject[input.projectId] ?? [];
				store.chatsByProject[input.projectId] = projectChats.map((candidate) =>
					candidate.id === input.chatId ? { ...candidate, title: input.title, updatedAt: now } : candidate,
				);

				return saveAndView(deps.store, store);
			});
		},

		async selectStandaloneChat(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const refreshed = await refreshSessionChats(deps, store, activeSessionIds);
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

		async forkChat(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const project = store.projects[findProjectIndex(store, input.projectId)];
				const chat = findProjectChat(store, input.projectId, input.chatId);
				const targetPath = await deps.forkSession(requireSessionPath(chat), project.path);
				const now = deps.now();

				store.sessionUiByPath[targetPath] = {
					chatId: createChatId(now, store.chatsByProject[input.projectId] ?? []),
					sessionId: null,
					sessionPath: targetPath,
					projectId: input.projectId,
					lastOpenedAt: now,
					status: "idle",
					attention: false,
				};

				const refreshed = await refreshSessionChats(deps, store, activeSessionIds);
				return saveAndView(deps.store, refreshed);
			});
		},

		async cloneChat(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const project = store.projects[findProjectIndex(store, input.projectId)];
				const chat = findProjectChat(store, input.projectId, input.chatId);
				const targetPath = await deps.cloneSession(requireSessionPath(chat), project.path);
				const now = deps.now();

				store.sessionUiByPath[targetPath] = {
					chatId: createChatId(now, store.chatsByProject[input.projectId] ?? []),
					sessionId: null,
					sessionPath: targetPath,
					projectId: input.projectId,
					lastOpenedAt: now,
					status: "idle",
					attention: false,
				};

				const refreshed = await refreshSessionChats(deps, store, activeSessionIds);
				return saveAndView(deps.store, refreshed);
			});
		},

		async branchChat(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const project = store.projects[findProjectIndex(store, input.projectId)];
				const chat = findProjectChat(store, input.projectId, input.chatId);
				const targetPath = await deps.branchSession(requireSessionPath(chat), project.path, input.entryId);
				const now = deps.now();

				store.sessionUiByPath[targetPath] = {
					chatId: createChatId(now, store.chatsByProject[input.projectId] ?? []),
					sessionId: null,
					sessionPath: targetPath,
					projectId: input.projectId,
					lastOpenedAt: now,
					status: "idle",
					attention: false,
				};

				const refreshed = await refreshSessionChats(deps, store, activeSessionIds);
				return saveAndView(deps.store, refreshed);
			});
		},

		async getSessionStartTarget(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();

				if (input.projectId === null) {
					const chat = store.standaloneChats.find((candidate) => candidate.id === input.chatId);
					if (!chat) {
						throw new Error("Select a project or existing standalone chat to start a Pi session.");
					}

					return {
						projectId: null,
						chatId: chat.id,
						workspacePath: chat.cwd,
						sessionPath: chat.sessionPath,
					};
				}

				const projectIndex = findProjectIndex(store, input.projectId);
				const availabilityChanged = await refreshProjectAvailabilityAtIndex(store, projectIndex, deps.now());
				const project = store.projects[projectIndex];
				if (project.availability.status === "missing") {
					await deps.store.save(store);
					throw new Error("Project folder is missing. Locate the folder before starting a Pi session.");
				}
				if (project.availability.status === "unavailable") {
					await deps.store.save(store);
					throw new Error(project.availability.reason);
				}
				if (availabilityChanged) {
					await deps.store.save(store);
				}

				const chat =
					input.chatId !== null
						? (store.chatsByProject[input.projectId] ?? []).find((candidate) => candidate.id === input.chatId)
						: null;
				if (input.chatId !== null && !chat) {
					throw new Error("Chat not found.");
				}

				return {
					projectId: input.projectId,
					chatId: chat?.id ?? null,
					workspacePath: project.path,
					sessionPath: chat?.sessionPath ?? null,
				};
			});
		},

		async recordSessionStarted(input) {
			activeSessionIds.add(input.sessionId);
			if (!input.sessionPath) {
				return { chatId: input.chatId ?? null };
			}
			const chatId = input.chatId ?? `chat:session:${input.sessionId}`;
			const sessionPath = input.sessionPath;

			return runSerialized(async () => {
				const store = await deps.store.load();
				const now = deps.now();
				store.sessionUiByPath[sessionPath] = {
					chatId,
					sessionId: input.sessionId,
					sessionPath,
					projectId: input.projectId,
					lastOpenedAt: now,
					status: input.status,
					attention: false,
				};
				if (input.projectId !== null) {
					touchProjectLastOpened(store, input.projectId, now);
					const project = store.projects[findProjectIndex(store, input.projectId)];
					const existingChats = store.chatsByProject[input.projectId] ?? [];
					const existingChat = input.chatId
						? existingChats.find((candidate) => candidate.id === input.chatId)
						: undefined;
					const startedChat: ChatMetadata = {
						id: chatId,
						projectId: input.projectId,
						source: "pi-session",
						sessionId: input.sessionId,
						sessionPath,
						cwd: existingChat?.cwd ?? project.path,
						title: existingChat?.title ?? defaultChatTitle,
						status: input.status,
						attention: false,
						createdAt: existingChat?.createdAt ?? now,
						updatedAt: now,
						lastOpenedAt: now,
					};
					store.chatsByProject[input.projectId] = [
						...existingChats.filter((chat) => chat.id !== input.chatId && chat.id !== chatId),
						startedChat,
					];
				}
				if (input.projectId === null && input.chatId !== null) {
					store.standaloneChats = store.standaloneChats.map((chat) =>
						chat.id === input.chatId && chat.source === "draft"
							? {
									...chat,
									source: "pi-session" as const,
									sessionId: input.sessionId,
									sessionPath,
									status: input.status,
									attention: false,
									updatedAt: now,
									lastOpenedAt: now,
								}
							: chat,
					);
				}
				await deps.store.save(store);
				return { chatId };
			});
		},

		async recordSessionStatus(input) {
			if (input.status === "running") {
				activeSessionIds.add(input.sessionId);
			} else {
				activeSessionIds.delete(input.sessionId);
			}
			return runSerialized(async () => {
				const store = await deps.store.load();
				for (const [sessionPath, ui] of Object.entries(store.sessionUiByPath)) {
					if (sessionIdMatchesUiSession(input.sessionId, ui.sessionId)) {
						const preserveFailure = ui.status === "failed" && input.status === "idle";
						store.sessionUiByPath[sessionPath] = {
							...ui,
							status: preserveFailure ? ui.status : input.status,
							attention: preserveFailure ? ui.attention : input.attention,
							lastOpenedAt: input.updatedAt,
						};
					}
				}
				await deps.store.save(store);
			});
		},

		async syncSessionChatTitle(input) {
			return runSerialized(async () => {
				const store = await deps.store.load();
				const titleChanged = await syncChatTitleForSession(deps, store, input.sessionId, input.updatedAt);
				if (!titleChanged) {
					return createProjectStateView(store);
				}

				return saveAndView(deps.store, store);
			});
		},
	};
};
