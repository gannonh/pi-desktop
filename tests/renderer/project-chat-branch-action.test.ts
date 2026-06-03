import { describe, expect, it, vi } from "vitest";
import {
	canRunProjectChatBranchAction,
	getProjectChatBranchActionDisabledTitle,
	PROJECT_CHAT_NO_SESSION_FILE_MESSAGE,
	runProjectChatBranchAction,
} from "../../src/renderer/projects/project-chat-branch-action";

describe("project chat branch action", () => {
	it("treats null session paths as unavailable", () => {
		expect(canRunProjectChatBranchAction(null)).toBe(false);
		expect(getProjectChatBranchActionDisabledTitle(null)).toBe(PROJECT_CHAT_NO_SESSION_FILE_MESSAGE);
	});

	it("notifies when fork is requested without a session file", () => {
		const notify = vi.fn();
		const applyProjectStateViewResult = vi.fn();
		const call = vi.fn();

		runProjectChatBranchAction({
			notify,
			applyProjectStateViewResult,
			projectId: "project-1",
			chatId: "chat-1",
			sessionPath: null,
			verb: "fork",
			call,
		});

		expect(notify).toHaveBeenCalledOnce();
		expect(call).not.toHaveBeenCalled();
		expect(applyProjectStateViewResult).not.toHaveBeenCalled();
	});
});
