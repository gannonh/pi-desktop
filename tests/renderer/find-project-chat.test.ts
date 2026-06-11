import { describe, expect, it } from "vitest";
import { findProjectChat } from "../../src/renderer/projects/find-project-chat";
import type { ProjectStateView } from "../../src/shared/project-state";
import { DEFAULT_PROJECT_GIT_SETTINGS } from "../../src/shared/project-state";

const createView = (): ProjectStateView => ({
	projects: [
		{
			id: "project-1",
			displayName: "Alpha",
			path: "/alpha",
			createdAt: "2026-05-12T10:00:00.000Z",
			updatedAt: "2026-05-12T10:00:00.000Z",
			lastOpenedAt: "2026-05-12T10:00:00.000Z",
			pinned: false,
			availability: { status: "available" },
			gitSettings: DEFAULT_PROJECT_GIT_SETTINGS,
			chats: [
				{
					id: "chat-1",
					projectId: "project-1",
					source: "draft",
					sessionId: null,
					sessionPath: null,
					cwd: "/alpha",
					title: "One",
					status: "idle",
					attention: false,
					createdAt: "2026-05-12T10:00:00.000Z",
					updatedAt: "2026-05-12T10:00:00.000Z",
					lastOpenedAt: null,
				},
			],
		},
	],
	standaloneChats: [],
	selectedProjectId: "project-1",
	selectedChatId: "chat-1",
	selectedProject: null,
	selectedChat: null,
});

describe("findProjectChat", () => {
	it("returns the project when the chat exists", () => {
		const match = findProjectChat(createView(), "project-1", "chat-1");

		expect(match?.project.id).toBe("project-1");
		expect(match?.chatId).toBe("chat-1");
	});

	it("returns null when the chat is missing", () => {
		expect(findProjectChat(createView(), "project-1", "missing")).toBeNull();
		expect(findProjectChat(createView(), "missing", "chat-1")).toBeNull();
	});
});
