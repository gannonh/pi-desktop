import type { ChatMetadata, ProjectAvailability, ProjectStateView } from "../../shared/project-state";

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
	  }
	| {
			kind: "empty";
			label: "No chats";
	  };

export interface SidebarProjectRow {
	kind: "project";
	projectId: string;
	label: string;
	path: string;
	selected: boolean;
	availability: ProjectAvailability;
	children: SidebarChatRow[];
}

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
			body: "Locate the project folder or remove it from the sidebar.",
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

export const createProjectSidebarRows = (view: ProjectStateView): SidebarProjectRow[] =>
	view.projects.map((project) => ({
		kind: "project",
		projectId: project.id,
		label: project.displayName,
		path: project.path,
		selected: project.id === view.selectedProjectId,
		availability: project.availability,
		children:
			project.chats.length > 0
				? project.chats.map((chat) => ({
						kind: "chat",
						chatId: chat.id,
						label: chat.title,
						selected: chat.id === view.selectedChatId,
						status: chat.status,
					}))
				: [{ kind: "empty", label: "No chats" }],
	}));
