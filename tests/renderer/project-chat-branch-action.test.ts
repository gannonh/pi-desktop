import { describe, expect, it, vi } from "vitest";
import type { ProjectStateViewResult } from "../../src/shared/ipc";
import {
	canRunProjectChatBranchAction,
	getProjectChatBranchActionDisabledTitle,
	PROJECT_CHAT_NO_SESSION_FILE_MESSAGE,
	runProjectChatBranchAction,
	runProjectChatBranchActionForRow,
} from "../../src/renderer/projects/project-chat-branch-action";

const okProjectState = (selectedProjectId: string | null, selectedChatId: string | null): ProjectStateViewResult =>
	({
		ok: true,
		data: {
			projects: [],
			standaloneChats: [],
			selectedProjectId,
			selectedChatId,
			selectedProject: null,
			selectedChat: null,
		},
	}) as ProjectStateViewResult;

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

	it("shows pending feedback before fork completes", async () => {
		const notify = vi.fn();
		const applyProjectStateViewResult = vi.fn();
		const result = okProjectState("project-1", "chat-forked");
		let resolveCall!: (result: ProjectStateViewResult) => void;
		const call = vi.fn(
			() =>
				new Promise<ProjectStateViewResult>((resolve) => {
					resolveCall = resolve;
				}),
		);

		runProjectChatBranchAction({
			notify,
			applyProjectStateViewResult,
			projectId: "project-1",
			chatId: "chat-1",
			sessionPath: "/tmp/session.jsonl",
			verb: "fork",
			call,
		});

		await vi.waitFor(() => {
			expect(call).toHaveBeenCalledWith({ projectId: "project-1", chatId: "chat-1" });
		});
		expect(notify).toHaveBeenCalledWith("Forking session…", "pending", {
			projectId: "project-1",
			chatId: "chat-1",
		});
		expect(applyProjectStateViewResult).not.toHaveBeenCalled();

		resolveCall(result);

		await vi.waitFor(() => {
			expect(applyProjectStateViewResult).toHaveBeenCalledWith(result);
			expect(notify).toHaveBeenCalledWith("Forked session.", "success", {
				projectId: "project-1",
				chatId: "chat-forked",
			});
		});
	});

	it("notifies when fork rejects", async () => {
		const notify = vi.fn();
		const applyProjectStateViewResult = vi.fn();
		const call = vi.fn().mockRejectedValue(new Error("fork failed"));

		runProjectChatBranchAction({
			notify,
			applyProjectStateViewResult,
			projectId: "project-1",
			chatId: "chat-1",
			sessionPath: "/tmp/session.jsonl",
			verb: "fork",
			call,
		});

		await vi.waitFor(() => {
			expect(notify).toHaveBeenCalledWith("fork failed", "error", {
				projectId: "project-1",
				chatId: "chat-1",
			});
		});
		expect(applyProjectStateViewResult).not.toHaveBeenCalled();
	});

	it("notifies when fork throws synchronously", async () => {
		const notify = vi.fn();
		const applyProjectStateViewResult = vi.fn();
		const call = vi.fn(() => {
			throw new Error("bridge unavailable");
		});

		runProjectChatBranchAction({
			notify,
			applyProjectStateViewResult,
			projectId: "project-1",
			chatId: "chat-1",
			sessionPath: "/tmp/session.jsonl",
			verb: "clone",
			call,
		});

		await vi.waitFor(() => {
			expect(notify).toHaveBeenCalledWith("bridge unavailable", "error", {
				projectId: "project-1",
				chatId: "chat-1",
			});
		});
		expect(applyProjectStateViewResult).not.toHaveBeenCalled();
	});

	it("skips row actions when the chat has no session file", async () => {
		const runProjectAction = vi.fn().mockResolvedValue(undefined);

		runProjectChatBranchActionForRow({
			runProjectAction,
			projectId: "project-1",
			chatId: "chat-1",
			sessionPath: null,
			call: vi.fn(),
		});

		expect(runProjectAction).not.toHaveBeenCalled();
	});

	it("delegates row actions when the chat has a session file", async () => {
		const runProjectAction = vi.fn(async (action) => {
			await action();
		});
		const call = vi.fn().mockResolvedValue({ ok: true, data: {} });

		runProjectChatBranchActionForRow({
			runProjectAction,
			projectId: "project-1",
			chatId: "chat-1",
			sessionPath: "/tmp/session.jsonl",
			call,
		});

		await vi.waitFor(() => {
			expect(call).toHaveBeenCalledWith({ projectId: "project-1", chatId: "chat-1" });
		});
	});
});
