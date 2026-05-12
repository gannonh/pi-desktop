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

export const createProjectId = (path: string): string => `project:${path}`;

export const sortProjects = (projects: readonly ProjectRecord[]): ProjectRecord[] =>
	[...projects].sort((left, right) => {
		if (left.pinned !== right.pinned) {
			return left.pinned ? -1 : 1;
		}

		const recentComparison = right.lastOpenedAt.localeCompare(left.lastOpenedAt);
		if (recentComparison !== 0) {
			return recentComparison;
		}

		return left.displayName.localeCompare(right.displayName);
	});

export const sortChats = (chats: readonly ChatMetadata[]): ChatMetadata[] =>
	[...chats].sort((left, right) => {
		const recentComparison = right.updatedAt.localeCompare(left.updatedAt);
		if (recentComparison !== 0) {
			return recentComparison;
		}

		return left.title.localeCompare(right.title);
	});

export const createProjectStateView = (store: ProjectStore): ProjectStateView => {
	const projects = sortProjects(store.projects).map((project) => ({
		...project,
		chats: sortChats(store.chatsByProject[project.id] ?? []),
	}));
	const selectedProject = projects.find((project) => project.id === store.selectedProjectId) ?? null;
	const selectedChat = selectedProject?.chats.find((chat) => chat.id === store.selectedChatId) ?? null;

	return ProjectStateViewSchema.parse({
		projects,
		selectedProjectId: store.selectedProjectId,
		selectedChatId: store.selectedChatId,
		selectedProject,
		selectedChat,
	});
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
