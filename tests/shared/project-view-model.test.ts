import { describe, expect, it } from "vitest";
import type { ChatMetadata, ProjectStateView, ProjectWithChats } from "../../src/shared/project-state";
import { createProjectMainCopy, createProjectSidebarRows } from "../../src/renderer/projects/project-view-model";

const emptyView: ProjectStateView = {
	projects: [],
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
};

const createProject = (overrides: Partial<ProjectWithChats> = {}): ProjectWithChats => ({
	id: "project:/Users/gannonhall/dev/pi",
	displayName: "pi",
	path: "/Users/gannonhall/dev/pi",
	createdAt: "2026-05-12T09:00:00.000Z",
	updatedAt: "2026-05-12T09:00:00.000Z",
	lastOpenedAt: "2026-05-12T09:00:00.000Z",
	pinned: false,
	availability: { status: "available" },
	chats: [],
	...overrides,
});

const createChat = (overrides: Partial<ChatMetadata> = {}): ChatMetadata => ({
	id: "chat:project-home",
	projectId: "project:/Users/gannonhall/dev/pi",
	title: "Project home",
	status: "idle",
	updatedAt: "2026-05-12T10:00:00.000Z",
	...overrides,
});

describe("project view model", () => {
	it("creates global empty main copy so first launch asks for a project", () => {
		expect(createProjectMainCopy(emptyView)).toEqual({
			kind: "global-empty",
			title: "What should we work on?",
			projectSelectorLabel: "Work in a project",
		});
	});

	it("creates project empty main copy so an empty selected project can start work", () => {
		const project = createProject();
		const view: ProjectStateView = {
			projects: [project],
			selectedProjectId: project.id,
			selectedChatId: null,
			selectedProject: project,
			selectedChat: null,
		};

		expect(createProjectMainCopy(view)).toEqual({
			kind: "project-empty",
			title: "What should we build in pi?",
			projectId: project.id,
			projectSelectorLabel: "pi",
		});
	});

	it("creates an empty sidebar child for projects with no chats", () => {
		const project = createProject();
		const view: ProjectStateView = {
			projects: [project],
			selectedProjectId: project.id,
			selectedChatId: null,
			selectedProject: project,
			selectedChat: null,
		};

		expect(createProjectSidebarRows(view)).toEqual([
			{
				kind: "project",
				projectId: project.id,
				project,
				label: "pi",
				path: "/Users/gannonhall/dev/pi",
				selected: true,
				availability: { status: "available" },
				children: [{ kind: "empty", label: "No chats" }],
			},
		]);
	});

	it("creates missing project copy so recovery actions have project context", () => {
		const project = createProject({
			availability: { status: "missing", checkedAt: "2026-05-12T10:00:00.000Z" },
		});
		const view: ProjectStateView = {
			projects: [project],
			selectedProjectId: project.id,
			selectedChatId: null,
			selectedProject: project,
			selectedChat: null,
		};

		expect(createProjectMainCopy(view)).toEqual({
			kind: "missing-project",
			title: "pi is unavailable",
			body: "Locate the project folder or remove it from the sidebar.",
			projectId: project.id,
			projectSelectorLabel: "pi",
		});
	});

	it("creates unavailable project copy that surfaces the availability reason", () => {
		const project = createProject({
			availability: {
				status: "unavailable",
				checkedAt: "2026-05-12T10:00:00.000Z",
				reason: "Permission denied",
			},
		});
		const view: ProjectStateView = {
			projects: [project],
			selectedProjectId: project.id,
			selectedChatId: null,
			selectedProject: project,
			selectedChat: null,
		};

		expect(createProjectMainCopy(view)).toEqual({
			kind: "missing-project",
			title: "pi is unavailable",
			body: "Permission denied",
			projectId: project.id,
			projectSelectorLabel: "pi",
		});
	});

	it("creates selected chat copy and marks the active chat row", () => {
		const chat = createChat();
		const project = createProject({ chats: [chat] });
		const view: ProjectStateView = {
			projects: [project],
			selectedProjectId: project.id,
			selectedChatId: chat.id,
			selectedProject: project,
			selectedChat: chat,
		};

		expect(createProjectMainCopy(view)).toEqual({
			kind: "chat",
			title: "Project home",
			projectId: project.id,
			chatId: chat.id,
			projectSelectorLabel: "pi",
		});
		expect(createProjectSidebarRows(view)[0]?.children).toEqual([
			{
				kind: "chat",
				chatId: chat.id,
				label: "Project home",
				selected: true,
				status: "idle",
			},
		]);
	});
});
