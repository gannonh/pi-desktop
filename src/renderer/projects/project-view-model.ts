import type {
	ChatMetadata,
	ProjectAvailability,
	ProjectStateView,
	ProjectWithChats,
	StandaloneChatMetadata,
} from "../../shared/project-state";

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

export const createProjectSidebarRows = (view: ProjectStateView, now = new Date()): SidebarProjectRow[] =>
	view.projects.map((project) => ({
		kind: "project",
		projectId: project.id,
		project,
		label: project.displayName,
		path: project.path,
		selected: project.id === view.selectedProjectId,
		availability: project.availability,
		children:
			project.chats.length > 0
				? [
						...project.chats.slice(0, visibleChatLimit).map((chat) => ({
							kind: "chat" as const,
							chatId: chat.id,
							label: chat.title,
							selected: chat.id === view.selectedChatId,
							status: chat.status,
							updatedLabel: formatUpdatedLabel(chat.updatedAt, now),
							needsAttention: chat.status === "running",
						})),
						...(project.chats.length > visibleChatLimit
							? [
									{
										kind: "show-more" as const,
										label: "Show more" as const,
										hiddenCount: project.chats.length - visibleChatLimit,
									},
								]
							: []),
					]
				: [{ kind: "empty", label: "No chats" }],
	}));

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
	needsAttention: chat.status === "running",
});

export const createStandaloneChatSidebarRows = (view: ProjectStateView, now = new Date()): SidebarChatRow[] => {
	if (view.standaloneChats.length === 0) {
		return [{ kind: "empty", label: "No chats" }];
	}

	const selectedChatId = view.selectedProjectId === null ? view.selectedChatId : null;
	const rows = view.standaloneChats
		.slice(0, visibleChatLimit)
		.map((chat) => createChatSidebarRow(chat, selectedChatId, now));

	if (view.standaloneChats.length > visibleChatLimit) {
		rows.push({
			kind: "show-more",
			label: "Show more",
			hiddenCount: view.standaloneChats.length - visibleChatLimit,
		});
	}

	return rows;
};
