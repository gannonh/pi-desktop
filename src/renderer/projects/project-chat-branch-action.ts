import type { ProjectStateViewResult } from "../../shared/ipc";
import type { StatusMessageTone } from "../status-message";
import { projectActionErrorMessage } from "./project-action-error";

export const PROJECT_CHAT_NO_SESSION_FILE_MESSAGE = "Chat does not have a Pi session file yet";

export type ProjectChatBranchVerb = "fork" | "clone";

export function canRunProjectChatBranchAction(sessionPath: string | null | undefined): boolean {
	return sessionPath != null && sessionPath !== "";
}

export function getProjectChatBranchActionDisabledTitle(sessionPath: string | null | undefined): string | undefined {
	return canRunProjectChatBranchAction(sessionPath) ? undefined : PROJECT_CHAT_NO_SESSION_FILE_MESSAGE;
}

function projectChatBranchLabel(verb: ProjectChatBranchVerb): string {
	return verb === "fork" ? "Fork" : "Clone";
}

function projectChatBranchPastTense(verb: ProjectChatBranchVerb): string {
	return verb === "fork" ? "Forked" : "Cloned";
}

function projectChatBranchUnavailableMessage(verb: ProjectChatBranchVerb): string {
	return `${projectChatBranchLabel(verb)} is available after the chat has a Pi session file. Send a message to start the session, then try again.`;
}

export function runProjectChatBranchAction({
	notify,
	applyProjectStateViewResult,
	projectId,
	chatId,
	sessionPath,
	verb,
	call,
}: {
	notify: (message: string, tone?: StatusMessageTone) => void;
	applyProjectStateViewResult: (result: ProjectStateViewResult) => void;
	projectId: string | null;
	chatId: string | null;
	sessionPath: string | null | undefined;
	verb: ProjectChatBranchVerb;
	call: (args: { projectId: string; chatId: string }) => Promise<ProjectStateViewResult>;
}): void {
	if (!projectId || !chatId) {
		notify(`Select a project chat before ${verb === "fork" ? "forking" : "cloning"}.`);
		return;
	}
	if (!canRunProjectChatBranchAction(sessionPath)) {
		notify(projectChatBranchUnavailableMessage(verb));
		return;
	}
	void Promise.resolve()
		.then(() => call({ projectId, chatId }))
		.then((result) => {
			applyProjectStateViewResult(result);
			notify(`${projectChatBranchPastTense(verb)} session.`, "success");
		})
		.catch((error) => {
			notify(projectActionErrorMessage(error, `Unable to ${verb} session.`));
		});
}

export function runProjectChatBranchActionForRow({
	runProjectAction,
	projectId,
	chatId,
	sessionPath,
	call,
}: {
	runProjectAction: (action: () => Promise<ProjectStateViewResult>) => Promise<void>;
	projectId: string;
	chatId: string;
	sessionPath: string | null;
	call: (args: { projectId: string; chatId: string }) => Promise<ProjectStateViewResult>;
}): void {
	if (!canRunProjectChatBranchAction(sessionPath)) {
		return;
	}
	void runProjectAction(() => call({ projectId, chatId }));
}
