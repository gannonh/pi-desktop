import { describe, expect, it } from "vitest";
import {
	buildCommitFailureRecoveryPrompt,
	resolveCommitRecoveryChatId,
	stagedFilesForRecovery,
	summarizeCommitFailure,
} from "../../src/renderer/changes-panel/commit-failure-recovery";
import { createProjectId, DEFAULT_PROJECT_GIT_SETTINGS, type ProjectStateView } from "../../src/shared/project-state";

const projectId = createProjectId("/tmp/pi-project");
const chatId = "chat:1";

const projectState = {
	projects: [
		{
			id: projectId,
			displayName: "pi-project",
			path: "/tmp/pi-project",
			createdAt: "2026-06-07T00:00:00.000Z",
			updatedAt: "2026-06-07T00:00:00.000Z",
			lastOpenedAt: "2026-06-07T00:00:00.000Z",
			pinned: false,
			availability: { status: "available" as const, checkedAt: "2026-06-07T00:00:00.000Z" },
			gitSettings: DEFAULT_PROJECT_GIT_SETTINGS,
			chats: [
				{
					id: chatId,
					projectId,
					source: "draft" as const,
					sessionId: null,
					sessionPath: null,
					cwd: "/tmp/pi-project",
					title: "Draft",
					status: "idle" as const,
					attention: false,
					createdAt: "2026-06-07T00:00:00.000Z",
					updatedAt: "2026-06-08T00:00:00.000Z",
					lastOpenedAt: null,
				},
			],
		},
	],
	standaloneChats: [],
	selectedProjectId: projectId,
	selectedChatId: chatId,
	selectedProject: null,
	selectedChat: null,
} satisfies ProjectStateView;

describe("commit failure recovery helpers", () => {
	it("summarizes the first line while preserving full git output", () => {
		const raw = "Commit failed.\n\nerror: gpg failed to sign the data\nfatal: failed to write commit object";
		expect(summarizeCommitFailure(raw)).toEqual({
			summary: "Commit failed.",
			details: raw,
		});
	});

	it("builds a recovery prompt with failure output, changed files, and validation", () => {
		const prompt = buildCommitFailureRecoveryPrompt({
			commitMessage: "Ship fix",
			failureOutput: "Commit failed.\n\nhook declined",
			changedFiles: [{ path: "README.md", area: "staged", status: "modified" }],
		});

		expect(prompt).toContain("Ship fix");
		expect(prompt).toContain("- README.md (staged, modified)");
		expect(prompt).toContain("hook declined");
		expect(prompt).toContain("Requested validation");
	});

	it("collects staged files for recovery context", () => {
		expect(
			stagedFilesForRecovery([
				{ path: "README.md", status: "modified", area: "staged" },
				{ path: "notes.txt", status: "untracked", area: "untracked" },
			]),
		).toEqual([{ path: "README.md", area: "staged", status: "modified" }]);
	});

	it("prefers the selected project chat for recovery", () => {
		expect(resolveCommitRecoveryChatId(projectState, projectId)).toBe(chatId);
	});
});
