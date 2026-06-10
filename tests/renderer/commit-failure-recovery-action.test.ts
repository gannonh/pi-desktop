import { describe, expect, it, vi } from "vitest";
import { resolveCommitRecoverySessionTarget } from "../../src/renderer/changes-panel/commit-failure-recovery-action";
import { createProjectId, type ProjectStateView } from "../../src/shared/project-state";

const projectId = createProjectId("/tmp/pi-project");
const chatId = "chat:1";

const baseState = {
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
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
} satisfies ProjectStateView;

describe("resolveCommitRecoverySessionTarget", () => {
	it("selects the project and chat before recovery can start", async () => {
		const selectProject = vi.fn(async () => ({
			ok: true as const,
			data: { ...baseState, selectedProjectId: projectId },
		}));
		const selectChat = vi.fn(async () => ({
			ok: true as const,
			data: { ...baseState, selectedProjectId: projectId, selectedChatId: chatId },
		}));

		const result = await resolveCommitRecoverySessionTarget(projectId, {
			getProjectState: async () => ({ ok: true as const, data: baseState }),
			selectProject,
			createChat: vi.fn(),
			selectChat,
		});

		expect(result).toEqual({ ok: true, projectId, chatId });
		expect(selectProject).toHaveBeenCalledWith({ projectId });
		expect(selectChat).toHaveBeenCalledWith({ projectId, chatId });
	});

	it("creates a chat when the project has none", async () => {
		const stateWithoutChats = {
			...baseState,
			projects: [{ ...baseState.projects[0], chats: [] }],
		};
		const createChat = vi.fn(async () => ({
			ok: true as const,
			data: { ...baseState, selectedProjectId: projectId, selectedChatId: chatId },
		}));

		const result = await resolveCommitRecoverySessionTarget(projectId, {
			getProjectState: async () => ({ ok: true as const, data: stateWithoutChats }),
			selectProject: vi.fn(async () => ({
				ok: true as const,
				data: { ...stateWithoutChats, selectedProjectId: projectId },
			})),
			createChat,
			selectChat: vi.fn(async () => ({
				ok: true as const,
				data: { ...baseState, selectedProjectId: projectId, selectedChatId: chatId },
			})),
		});

		expect(createChat).toHaveBeenCalledWith({ projectId });
		expect(result).toEqual({ ok: true, projectId, chatId });
	});
});
