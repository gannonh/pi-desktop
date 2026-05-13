import type { PiDesktopApi } from "../shared/preload-api";
import {
	createProjectId,
	createProjectStateView,
	getNextNewProjectName,
	sortStandaloneChats,
	type ChatMetadata,
	type ProjectRecord,
	type ProjectStore,
	type StandaloneChatMetadata,
} from "../shared/project-state";

const now = new Date().toISOString();

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60_000).toISOString();
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();

const project = (path: string, overrides: Partial<ProjectRecord> = {}): ProjectRecord => ({
	id: createProjectId(path),
	displayName: path.split("/").filter(Boolean).at(-1) ?? path,
	path,
	createdAt: now,
	updatedAt: now,
	lastOpenedAt: now,
	pinned: false,
	availability: { status: "available", checkedAt: now },
	...overrides,
});

const chat = (
	projectId: string,
	id: string,
	title: string,
	updatedAt: string,
	status: ChatMetadata["status"] = "idle",
): ChatMetadata => ({
	id,
	projectId,
	title,
	status,
	updatedAt,
});

const standaloneChat = (
	id: string,
	title: string,
	updatedAt: string,
	status: StandaloneChatMetadata["status"] = "idle",
): StandaloneChatMetadata => ({
	id,
	title,
	status,
	updatedAt,
});

const previewRoot = "/tmp/pi-desktop-preview";
const previewDocumentsDir = `${previewRoot}/Documents`;

const piDesktop = project(`${previewRoot}/pi-desktop`, {
	displayName: "pi-desktop",
	pinned: true,
	lastOpenedAt: "2026-05-12T17:30:00.000Z",
});
const agentis = project(`${previewRoot}/agentis`, {
	displayName: "agentis",
	lastOpenedAt: "2026-05-12T16:45:00.000Z",
});
const missing = project(`${previewDocumentsDir}/New project`, {
	displayName: "New project",
	availability: { status: "missing", checkedAt: now },
	lastOpenedAt: "2026-05-12T15:30:00.000Z",
});

const store: ProjectStore = {
	projects: [piDesktop, agentis, missing],
	selectedProjectId: null,
	selectedChatId: null,
	chatsByProject: {
		[piDesktop.id]: [
			chat(
				piDesktop.id,
				"chat:milestone-01",
				"Execute milestone 01: project home sidebar refinements",
				hoursAgo(15),
			),
			chat(piDesktop.id, "chat:project-home", "Plan project home milestone", hoursAgo(18)),
			chat(piDesktop.id, "chat:subagent", "Subagent-driven-development planning notes", minutesAgo(18 * 60 + 5)),
			chat(piDesktop.id, "chat:license", "Add MIT license", minutesAgo(18 * 60 + 15)),
			chat(piDesktop.id, "chat:foundation", "Execute milestone 0 foundation", hoursAgo(22)),
			chat(piDesktop.id, "chat:foundation-review", "Review foundation acceptance evidence", daysAgo(3)),
		],
		[agentis.id]: [
			chat(agentis.id, "chat:phase-s009", "Execute phase S009", minutesAgo(22), "running"),
			chat(agentis.id, "chat:kata-phase", "Plan kata phase", hoursAgo(2)),
			chat(agentis.id, "chat:pr-comments", "Address PR comments", hoursAgo(17)),
			chat(agentis.id, "chat:phase-s008", "Execute phase S008", hoursAgo(18)),
			chat(agentis.id, "chat:pr-comments-followup", "Address PR comments", hoursAgo(20)),
			chat(agentis.id, "chat:phase-s007", "Execute phase S007", daysAgo(2)),
		],
		[missing.id]: [chat(missing.id, "chat:missing-plan", "Draft first task", hoursAgo(16))],
	},
};

const standaloneChats = [
	standaloneChat("chat:standalone-nextjs", "Would NextJS be good for this app?", minutesAgo(51)),
];

const view = () => ({
	...createProjectStateView(store),
	standaloneChats: sortStandaloneChats(standaloneChats),
});
const ok = () => Promise.resolve({ ok: true as const, data: view() });

const findProject = (projectId: string) => {
	const projectIndex = store.projects.findIndex((candidate) => candidate.id === projectId);
	if (projectIndex === -1) {
		throw new Error("Project not found in preview data.");
	}
	return { project: store.projects[projectIndex], projectIndex };
};

const addProject = (projectPath: string) => {
	const nextProject = project(projectPath, {
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		lastOpenedAt: new Date().toISOString(),
	});
	store.projects = [...store.projects, nextProject];
	store.chatsByProject[nextProject.id] = [];
	store.selectedProjectId = nextProject.id;
	store.selectedChatId = null;
};

export const installDevPreviewApi = () => {
	if ("piDesktop" in window) {
		return;
	}

	const api: PiDesktopApi = {
		app: {
			getVersion: async () => ({ ok: true, data: { name: "pi-desktop web preview", version: "dev" } }),
		},
		project: {
			getState: ok,
			createFromScratch: async () => {
				const occupiedNames = store.projects
					.filter((candidate) => candidate.path.startsWith(`${previewDocumentsDir}/`))
					.map((candidate) => candidate.displayName);
				addProject(`${previewDocumentsDir}/${getNextNewProjectName(occupiedNames)}`);
				return ok();
			},
			addExistingFolder: async () => {
				addProject(`${previewRoot}/pi-mono`);
				return ok();
			},
			select: async ({ projectId }) => {
				const { project, projectIndex } = findProject(projectId);
				store.projects[projectIndex] = { ...project, lastOpenedAt: new Date().toISOString() };
				store.selectedProjectId = projectId;
				store.selectedChatId = null;
				return ok();
			},
			rename: async ({ projectId, displayName }) => {
				const { project, projectIndex } = findProject(projectId);
				store.projects[projectIndex] = { ...project, displayName, updatedAt: new Date().toISOString() };
				return ok();
			},
			remove: async ({ projectId }) => {
				store.projects = store.projects.filter((candidate) => candidate.id !== projectId);
				delete store.chatsByProject[projectId];
				if (store.selectedProjectId === projectId) {
					store.selectedProjectId = null;
					store.selectedChatId = null;
				}
				return ok();
			},
			openInFinder: ok,
			locateFolder: async ({ projectId }) => {
				const { project: currentProject, projectIndex } = findProject(projectId);
				const recoveredPath = `${previewRoot}/recovered/${currentProject.displayName}`;
				const recoveredId = createProjectId(recoveredPath);
				const recoveredProject = {
					...currentProject,
					id: recoveredId,
					path: recoveredPath,
					availability: { status: "available" as const, checkedAt: new Date().toISOString() },
				};
				store.projects[projectIndex] = recoveredProject;
				store.chatsByProject[recoveredId] = (store.chatsByProject[projectId] ?? []).map((entry) => ({
					...entry,
					projectId: recoveredId,
				}));
				delete store.chatsByProject[projectId];
				store.selectedProjectId = recoveredId;
				store.selectedChatId = null;
				return ok();
			},
			setPinned: async ({ projectId, pinned }) => {
				const { project, projectIndex } = findProject(projectId);
				store.projects[projectIndex] = { ...project, pinned, updatedAt: new Date().toISOString() };
				return ok();
			},
			checkAvailability: ok,
		},
		chat: {
			create: async ({ projectId }) => {
				findProject(projectId);
				const chats = store.chatsByProject[projectId] ?? [];
				const nextChat = chat(projectId, `chat:preview:${chats.length + 1}`, "New chat", new Date().toISOString());
				store.chatsByProject[projectId] = [...chats, nextChat];
				store.selectedProjectId = projectId;
				store.selectedChatId = nextChat.id;
				return ok();
			},
			select: async ({ projectId, chatId }) => {
				findProject(projectId);
				store.selectedProjectId = projectId;
				store.selectedChatId = chatId;
				return ok();
			},
		},
	};

	Object.defineProperty(window, "piDesktop", {
		configurable: true,
		value: api,
	});
};
