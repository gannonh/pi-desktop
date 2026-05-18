import type {
	ChatMetadata,
	ProjectAvailability,
	ProjectStateView,
	ProjectWithChats,
	StandaloneChatMetadata,
} from "../../shared/project-state";

export type ChatFilter = "all" | "attention" | "failed" | "running";

export interface ProjectSidebarRowOptions {
	chatFilter?: ChatFilter;
	expandedProjectIds?: ReadonlySet<string>;
	expandStandaloneChats?: boolean;
}

export type SidebarChatRow =
	| {
			kind: "chat";
			chatId: string;
			label: string;
			selected: boolean;
			status: ChatMetadata["status"];
			updatedLabel: string;
			needsAttention: boolean;
	  }
	| {
			kind: "empty";
			label: "No chats";
	  }
	| {
			kind: "show-more";
			label: "Show more";
			hiddenCount: number;
	  };

export interface SidebarProjectRow {
	kind: "project";
	projectId: string;
	project: ProjectWithChats;
	label: string;
	path: string;
	selected: boolean;
	availability: ProjectAvailability;
	children: SidebarChatRow[];
}

const visibleChatLimit = 5;

const formatUpdatedLabel = (updatedAt: string, now: Date): string => {
	const updatedTime = new Date(updatedAt).getTime();
	const elapsedMinutes = Math.max(1, Math.floor((now.getTime() - updatedTime) / 60_000));

	if (elapsedMinutes < 60) {
		return `${elapsedMinutes}min`;
	}

	const elapsedHours = Math.floor(elapsedMinutes / 60);
	if (elapsedHours < 24) {
		return `${elapsedHours}h`;
	}

	return `${Math.floor(elapsedHours / 24)}d`;
};

const filterChats = <T extends ChatMetadata | StandaloneChatMetadata>(
	chats: readonly T[],
	chatFilter: ChatFilter = "all",
): T[] => {
	switch (chatFilter) {
		case "attention":
			return chats.filter((chat) => chat.attention || chat.status === "failed" || chat.status === "running");
		case "failed":
			return chats.filter((chat) => chat.status === "failed");
		case "running":
			return chats.filter((chat) => chat.status === "running");
		case "all":
			return [...chats];
	}
};

const createChatSidebarRow = (
	chat: ChatMetadata | StandaloneChatMetadata,
	selectedChatId: string | null,
	now: Date,
): SidebarChatRow => ({
	kind: "chat",
	chatId: chat.id,
	label: chat.title,
	selected: chat.id === selectedChatId,
	status: chat.status,
	updatedLabel: formatUpdatedLabel(chat.updatedAt, now),
	needsAttention: chat.attention || chat.status === "running",
});

const createChatRows = (
	chats: readonly (ChatMetadata | StandaloneChatMetadata)[],
	selectedChatId: string | null,
	now: Date,
	expanded: boolean,
): SidebarChatRow[] => {
	if (chats.length === 0) {
		return [{ kind: "empty", label: "No chats" }];
	}

	const visibleChats = expanded ? chats : chats.slice(0, visibleChatLimit);
	const rows = visibleChats.map((chat) => createChatSidebarRow(chat, selectedChatId, now));

	if (!expanded && chats.length > visibleChatLimit) {
		rows.push({
			kind: "show-more",
			label: "Show more",
			hiddenCount: chats.length - visibleChatLimit,
		});
	}

	return rows;
};

export const createProjectSidebarRows = (
	view: ProjectStateView,
	now = new Date(),
	options: ProjectSidebarRowOptions = {},
): SidebarProjectRow[] =>
	view.projects.map((project) => {
		const chats = filterChats(project.chats, options.chatFilter);

		return {
			kind: "project",
			projectId: project.id,
			project,
			label: project.displayName,
			path: project.path,
			selected: project.id === view.selectedProjectId,
			availability: project.availability,
			children: createChatRows(
				chats,
				view.selectedChatId,
				now,
				options.expandedProjectIds?.has(project.id) ?? false,
			),
		};
	});

export const createStandaloneChatSidebarRows = (
	view: ProjectStateView,
	now = new Date(),
	options: ProjectSidebarRowOptions = {},
): SidebarChatRow[] => {
	const selectedChatId = view.selectedProjectId === null ? view.selectedChatId : null;
	const chats = filterChats(view.standaloneChats, options.chatFilter);

	return createChatRows(chats, selectedChatId, now, options.expandStandaloneChats ?? false);
};
