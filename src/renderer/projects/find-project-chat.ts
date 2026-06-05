import type { ProjectStateView, ProjectWithChats } from "../../shared/project-state";

export function findProjectChat(
	view: ProjectStateView,
	projectId: string,
	chatId: string,
): { project: ProjectWithChats; chatId: string } | null {
	const project = view.projects.find((candidate) => candidate.id === projectId);
	if (!project?.chats.some((chat) => chat.id === chatId)) {
		return null;
	}

	return { project, chatId };
}
