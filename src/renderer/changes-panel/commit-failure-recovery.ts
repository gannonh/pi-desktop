import type { GitStagingArea, GitStatusEntry } from "../../shared/source-control/types";
import { sortChats, type ProjectStateView } from "../../shared/project-state";

export type CommitFailurePresentation = {
	summary: string;
	details: string;
};

export type CommitFailureRecoveryFile = {
	path: string;
	area: GitStagingArea;
	status: GitStatusEntry["status"];
};

export const summarizeCommitFailure = (rawMessage: string): CommitFailurePresentation => {
	const details = rawMessage.trim();
	if (!details) {
		return { summary: "Commit failed.", details: "" };
	}

	const firstParagraph = details.split(/\n\n+/)[0]?.trim() ?? details;
	const summaryLine = firstParagraph.split("\n")[0]?.trim();
	return {
		summary: summaryLine && summaryLine.length > 0 ? summaryLine : "Commit failed.",
		details,
	};
};

export const buildCommitFailureRecoveryPrompt = (input: {
	commitMessage: string;
	failureOutput: string;
	changedFiles: readonly CommitFailureRecoveryFile[];
}): string => {
	const fileLines =
		input.changedFiles.length > 0
			? input.changedFiles.map((file) => `- ${file.path} (${file.area}, ${file.status})`).join("\n")
			: "- (no staged files recorded)";

	return [
		"A git commit failed in Pi Desktop. Diagnose the failure, fix the underlying issue, and help me complete the commit.",
		"",
		"## Commit message",
		input.commitMessage.trim() || "(empty)",
		"",
		"## Changed files",
		fileLines,
		"",
		"## Git failure output",
		"```text",
		input.failureOutput.trim() || "(no output captured)",
		"```",
		"",
		"## Requested validation",
		"Fix any blocking issues, verify `git commit` succeeds with the intended message, and summarize what you changed.",
	].join("\n");
};

export const resolveCommitRecoveryChatId = (projectState: ProjectStateView, projectId: string): string | null => {
	const project = projectState.projects.find((entry) => entry.id === projectId);
	if (!project || project.availability.status !== "available") {
		return null;
	}

	if (
		projectState.selectedProjectId === projectId &&
		projectState.selectedChatId &&
		project.chats.some((chat) => chat.id === projectState.selectedChatId)
	) {
		return projectState.selectedChatId;
	}

	return sortChats(project.chats)[0]?.id ?? null;
};

export const stagedFilesForRecovery = (entries: readonly GitStatusEntry[]): CommitFailureRecoveryFile[] =>
	entries
		.filter((entry) => entry.area === "staged")
		.map((entry) => ({
			path: entry.path,
			area: entry.area,
			status: entry.status,
		}));
