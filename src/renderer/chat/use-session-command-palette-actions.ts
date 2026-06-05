import { useMemo, type RefObject } from "react";
import type { ProjectStateView } from "../../shared/project-state";
import type { ProjectStateViewResult } from "../../shared/ipc";
import { projectActionErrorMessage } from "../projects/project-action-error";
import { runProjectChatBranchAction } from "../projects/project-chat-branch-action";
import type { ProjectSidebarActions } from "../projects/project-sidebar-actions";
import type { StatusMessageTone } from "../status-message";
import type { SessionCommandPaletteActions } from "./session-command-palette";

export interface UseSessionCommandPaletteActionsOptions {
	selectedProjectId: string | null;
	selectedChatId: string | null;
	selectedChat: ProjectStateView["selectedChat"];
	applyProjectStateViewResult: (result: ProjectStateViewResult) => void;
	notifyProjectStatus: (message: string, tone?: StatusMessageTone) => void;
	sidebarActionsRef: RefObject<ProjectSidebarActions | null>;
}

export function useSessionCommandPaletteActions({
	selectedProjectId,
	selectedChatId,
	selectedChat,
	applyProjectStateViewResult,
	notifyProjectStatus,
	sidebarActionsRef,
}: UseSessionCommandPaletteActionsOptions): SessionCommandPaletteActions {
	const selectedChatSessionPath = selectedChat?.sessionPath;

	return useMemo(
		(): SessionCommandPaletteActions => ({
			onNewSession: () => {
				void (
					selectedProjectId
						? window.piDesktop.chat.create({ projectId: selectedProjectId })
						: window.piDesktop.chat.createStandalone({})
				)
					.then((result) => {
						applyProjectStateViewResult(result);
						notifyProjectStatus("Started new session.", "success");
					})
					.catch((error) => {
						notifyProjectStatus(projectActionErrorMessage(error, "Unable to start a new session."));
					});
			},
			onRenameSession: () => {
				if (!selectedChatId) {
					notifyProjectStatus("Select a chat before renaming the session.");
					return;
				}
				if (!selectedProjectId) {
					notifyProjectStatus(
						"Quick-start chat rename from the command palette is not available yet. Select a project chat to rename from the sidebar.",
					);
					return;
				}
				const sidebarActions = sidebarActionsRef.current;
				if (!sidebarActions) {
					notifyProjectStatus("Rename is temporarily unavailable. Try again in a moment.");
					return;
				}
				const result = sidebarActions.startChatRename(selectedProjectId, selectedChatId);
				if (result === "chat-not-found") {
					notifyProjectStatus("Could not find the selected chat in the project sidebar.");
					return;
				}
				notifyProjectStatus("Rename editor opened.", "success");
			},
			onShowSessionInfo: () => {
				if (!selectedChat) {
					notifyProjectStatus("Select a chat to view session info.");
					return;
				}
				const lines = [
					`Title: ${selectedChat.title}`,
					`Status: ${selectedChat.status}`,
					`Workspace: ${selectedChat.cwd}`,
					selectedChat.sessionPath ? `Session file: ${selectedChat.sessionPath}` : "Session file: not created yet",
					`Updated: ${selectedChat.updatedAt}`,
				];
				notifyProjectStatus(lines.join(" · "));
			},
			onForkSession: () => {
				runProjectChatBranchAction({
					notify: notifyProjectStatus,
					applyProjectStateViewResult,
					projectId: selectedProjectId,
					chatId: selectedChatId,
					sessionPath: selectedChatSessionPath,
					verb: "fork",
					call: window.piDesktop.chat.fork,
				});
			},
			onCloneSession: () => {
				runProjectChatBranchAction({
					notify: notifyProjectStatus,
					applyProjectStateViewResult,
					projectId: selectedProjectId,
					chatId: selectedChatId,
					sessionPath: selectedChatSessionPath,
					verb: "clone",
					call: window.piDesktop.chat.clone,
				});
			},
			onShowPaletteNotice: notifyProjectStatus,
		}),
		[
			applyProjectStateViewResult,
			notifyProjectStatus,
			selectedChat,
			selectedChatId,
			selectedChatSessionPath,
			selectedProjectId,
			sidebarActionsRef,
		],
	);
}
