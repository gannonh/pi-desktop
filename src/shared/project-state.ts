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

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const deriveLegacyChatCwd = (projectId: string, projectPath: string | undefined): string => {
	if (projectPath !== undefined && projectPath.length > 0) {
		return projectPath;
	}

	const projectIdPrefix = "project:";
	if (projectId.startsWith(projectIdPrefix)) {
		const derivedPath = projectId.slice(projectIdPrefix.length);
		if (derivedPath.length > 0) {
			return derivedPath;
		}
	}

	return projectId.length > 0 ? projectId : "legacy:orphaned-project";
};

const migrateLegacyChatMetadata = (value: unknown, projectId: string, projectPath: string | undefined): unknown => {
	if (!isRecord(value)) {
		return value;
	}

	return {
		...value,
		projectId: value.projectId === undefined ? projectId : value.projectId,
		source: value.source === undefined ? "draft" : value.source,
		sessionId: value.sessionId === undefined ? null : value.sessionId,
		sessionPath: value.sessionPath === undefined ? null : value.sessionPath,
		cwd: value.cwd === undefined ? deriveLegacyChatCwd(projectId, projectPath) : value.cwd,
		attention: value.attention === undefined ? false : value.attention,
		createdAt: value.createdAt === undefined ? value.updatedAt : value.createdAt,
		lastOpenedAt: value.lastOpenedAt === undefined ? null : value.lastOpenedAt,
	};
};

const migrateLegacyProjectStore = (value: unknown): unknown => {
	if (!isRecord(value) || !isRecord(value.chatsByProject)) {
		return value;
	}

	const projectPathById = new Map<string, string>();
	if (Array.isArray(value.projects)) {
		for (const project of value.projects) {
			if (isRecord(project) && typeof project.id === "string" && typeof project.path === "string") {
				projectPathById.set(project.id, project.path);
			}
		}
	}

	const chatsByProject = Object.fromEntries(
		Object.entries(value.chatsByProject).map(([projectId, chats]) => [
			projectId,
			Array.isArray(chats)
				? chats.map((chat) => migrateLegacyChatMetadata(chat, projectId, projectPathById.get(projectId)))
				: chats,
		]),
	);

	return {
		...value,
		chatsByProject,
	};
};

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

export const ProjectStoreSchema = z.preprocess(
	migrateLegacyProjectStore,
	z.strictObject({
		projects: z.array(ProjectRecordSchema),
		selectedProjectId: z.string().min(1).nullable(),
		selectedChatId: z.string().min(1).nullable(),
		chatsByProject: z.record(z.string().min(1), z.array(ChatMetadataSchema)),
		standaloneChats: z.array(StandaloneChatMetadataSchema).default([]),
		sessionUiByPath: z.record(z.string().min(1), SessionUiMetadataSchema).default({}),
	}),
);

export const ProjectWithChatsSchema = ProjectRecordSchema.extend({
	chats: z.array(ChatMetadataSchema),
});

export const ProjectStateViewSchema = z.strictObject({
	projects: z.array(ProjectWithChatsSchema),
	standaloneChats: z.array(StandaloneChatMetadataSchema).default([]),
	selectedProjectId: z.string().min(1).nullable(),
	selectedChatId: z.string().min(1).nullable(),
	selectedProject: ProjectWithChatsSchema.nullable(),
	selectedChat: z.union([ChatMetadataSchema, StandaloneChatMetadataSchema]).nullable(),
});

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

export const createEmptyProjectStore = (): ProjectStore => ({
	projects: [],
	selectedProjectId: null,
	selectedChatId: null,
	chatsByProject: {},
	standaloneChats: [],
	sessionUiByPath: {},
});

export const createProjectId = (path: string): string => `project:${path}`;

const getProjectActivityAt = (
	project: ProjectRecord,
	chats: readonly Pick<ChatMetadata, "updatedAt">[],
): string => {
	const latestChatActivity = chats.reduce(
		(latest, chat) => (chat.updatedAt > latest ? chat.updatedAt : latest),
		"",
	);

	return latestChatActivity > project.lastOpenedAt ? latestChatActivity : project.lastOpenedAt;
};

const compareProjectsByRecency = (
	left: ProjectRecord,
	right: ProjectRecord,
	leftActivityAt: string,
	rightActivityAt: string,
): number => {
	if (left.pinned !== right.pinned) {
		return left.pinned ? -1 : 1;
	}

	const recentComparison = rightActivityAt.localeCompare(leftActivityAt);
	if (recentComparison !== 0) {
		return recentComparison;
	}

	return left.displayName.localeCompare(right.displayName);
};

export const sortProjects = (projects: readonly ProjectRecord[]): ProjectRecord[] =>
	[...projects].sort((left, right) =>
		compareProjectsByRecency(left, right, left.lastOpenedAt, right.lastOpenedAt),
	);

export const sortProjectsWithChats = (projects: readonly ProjectWithChats[]): ProjectWithChats[] =>
	[...projects].sort((left, right) =>
		compareProjectsByRecency(
			left,
			right,
			getProjectActivityAt(left, left.chats),
			getProjectActivityAt(right, right.chats),
		),
	);

export const sortChats = (chats: readonly ChatMetadata[]): ChatMetadata[] =>
	[...chats].sort((left, right) => {
		const recentComparison = right.updatedAt.localeCompare(left.updatedAt);
		if (recentComparison !== 0) {
			return recentComparison;
		}

		return left.title.localeCompare(right.title);
	});

export const sortStandaloneChats = (chats: readonly StandaloneChatMetadata[]): StandaloneChatMetadata[] =>
	[...chats].sort((left, right) => {
		const recentComparison = right.updatedAt.localeCompare(left.updatedAt);
		if (recentComparison !== 0) {
			return recentComparison;
		}

		return left.title.localeCompare(right.title);
	});

export const createProjectStateView = (store: ProjectStore): ProjectStateView => {
	const projects = sortProjectsWithChats(
		store.projects.map((project) => ({
			...project,
			chats: sortChats(store.chatsByProject[project.id] ?? []),
		})),
	);
	const standaloneChats = sortStandaloneChats(store.standaloneChats);
	const selectedProject = projects.find((project) => project.id === store.selectedProjectId) ?? null;
	const selectedChat =
		selectedProject?.chats.find((chat) => chat.id === store.selectedChatId) ??
		(store.selectedProjectId === null
			? (standaloneChats.find((chat) => chat.id === store.selectedChatId) ?? null)
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

export const getNextNewProjectName = (existingNames: readonly string[]): string => {
	const usedNames = new Set(existingNames);
	if (!usedNames.has("New project")) {
		return "New project";
	}

	let suffix = 2;
	while (usedNames.has(`New project ${suffix}`)) {
		suffix += 1;
	}

	return `New project ${suffix}`;
};
