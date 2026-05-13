import type {
	ChatMetadata,
	ProjectAvailability,
	ProjectStateView,
	ProjectWithChats,
	StandaloneChatMetadata,
} from "../../shared/project-state";

export type ProjectMainCopy =
	| {
			kind: "global-empty";
			title: "What should we work on?";
			projectSelectorLabel: "Work in a project";
	  }
	| {
			kind: "missing-project";
			title: string;
			body: string;
			projectId: string;
			projectSelectorLabel: string;
	  }
	| {
			kind: "project-empty";
			title: string;
			projectId: string;
			projectSelectorLabel: string;
	  }
	| {
			kind: "chat";
			title: string;
			projectId: string;
			chatId: string;
			projectSelectorLabel: string;
	  };

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

export const createProjectMainCopy = (view: ProjectStateView): ProjectMainCopy => {
	const selectedProject = view.selectedProject;

	if (!selectedProject) {
		return {
			kind: "global-empty",
			title: "What should we work on?",
			projectSelectorLabel: "Work in a project",
		};
	}

	const projectSelectorLabel = selectedProject.displayName;

	if (selectedProject.availability.status !== "available") {
		return {
			kind: "missing-project",
			title: `${selectedProject.displayName} is unavailable`,
			body:
				selectedProject.availability.status === "unavailable"
					? selectedProject.availability.reason
					: "Locate the project folder or remove it from the sidebar.",
			projectId: selectedProject.id,
			projectSelectorLabel,
		};
	}

	if (view.selectedChat) {
		return {
			kind: "chat",
			title: view.selectedChat.title,
			projectId: selectedProject.id,
			chatId: view.selectedChat.id,
			projectSelectorLabel,
		};
	}

	return {
		kind: "project-empty",
		title: `What should we build in ${selectedProject.displayName}?`,
		projectId: selectedProject.id,
		projectSelectorLabel,
	};
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

export const createStandaloneChatSidebarRows = (view: ProjectStateView, now = new Date()): SidebarChatRow[] =>
	view.standaloneChats.length > 0
		? view.standaloneChats
				.slice(0, visibleChatLimit)
				.map((chat) =>
					createChatSidebarRow(chat, view.selectedProjectId === null ? view.selectedChatId : null, now),
				)
		: [{ kind: "empty", label: "No chats" }];
