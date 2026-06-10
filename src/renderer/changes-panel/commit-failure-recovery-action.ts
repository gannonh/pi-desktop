import type { ProjectStateViewResult } from "../../shared/ipc";
import type { ProjectStateView } from "../../shared/project-state";
import { resolveCommitRecoveryChatId } from "./commit-failure-recovery";

export type CommitRecoverySessionTarget =
	| {
			ok: true;
			projectId: string;
			chatId: string;
	  }
	| {
			ok: false;
			message: string;
	  };

type ProjectStateReader = () => Promise<ProjectStateViewResult>;
type ProjectSelector = (input: { projectId: string }) => Promise<ProjectStateViewResult>;
type ChatCreator = (input: { projectId: string }) => Promise<ProjectStateViewResult>;
type ChatSelector = (input: { projectId: string; chatId: string }) => Promise<ProjectStateViewResult>;

export type CommitRecoverySessionDeps = {
	getProjectState: ProjectStateReader;
	selectProject: ProjectSelector;
	createChat: ChatCreator;
	selectChat: ChatSelector;
};

const readProjectState = async (getProjectState: ProjectStateReader): Promise<ProjectStateView | { error: string }> => {
	const result = await getProjectState();
	if (!result.ok) {
		return { error: result.error.message };
	}
	return result.data;
};

export const resolveCommitRecoverySessionTarget = async (
	projectId: string,
	deps: CommitRecoverySessionDeps,
): Promise<CommitRecoverySessionTarget> => {
	let projectState = await readProjectState(deps.getProjectState);
	if ("error" in projectState) {
		return { ok: false, message: projectState.error };
	}

	const project = projectState.projects.find((entry) => entry.id === projectId);
	if (!project) {
		return { ok: false, message: "Select an available project before starting recovery." };
	}
	if (project.availability.status !== "available") {
		return { ok: false, message: "This project is unavailable, so Pi recovery cannot start." };
	}

	let chatId = resolveCommitRecoveryChatId(projectState, projectId);
	if (!chatId) {
		const created = await deps.createChat({ projectId });
		if (!created.ok) {
			return { ok: false, message: created.error.message };
		}
		projectState = created.data;
		chatId = resolveCommitRecoveryChatId(projectState, projectId);
		if (!chatId) {
			return { ok: false, message: "Unable to create a Pi chat for commit recovery." };
		}
	}

	if (projectState.selectedProjectId !== projectId) {
		const selectedProject = await deps.selectProject({ projectId });
		if (!selectedProject.ok) {
			return { ok: false, message: selectedProject.error.message };
		}
		projectState = selectedProject.data;
	}

	if (projectState.selectedProjectId !== projectId || projectState.selectedChatId !== chatId) {
		const selectedChat = await deps.selectChat({ projectId, chatId });
		if (!selectedChat.ok) {
			return { ok: false, message: selectedChat.error.message };
		}
	}

	return { ok: true, projectId, chatId };
};

export const defaultCommitRecoverySessionDeps = (): CommitRecoverySessionDeps => ({
	getProjectState: () => window.piDesktop.project.getState(),
	selectProject: (input) => window.piDesktop.project.select(input),
	createChat: (input) => window.piDesktop.chat.create(input),
	selectChat: (input) => window.piDesktop.chat.select(input),
});
