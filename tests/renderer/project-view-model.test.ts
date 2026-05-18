import { describe, expect, it } from "vitest";
import type {
	ChatMetadata,
	ProjectStateView,
	ProjectWithChats,
	StandaloneChatMetadata,
} from "../../src/shared/project-state";
import {
	createProjectSidebarRows,
	createStandaloneChatSidebarRows,
} from "../../src/renderer/projects/project-view-model";

const fixedNow = new Date("2026-05-12T12:00:00.000Z");

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
	source: "draft",
	sessionId: null,
	sessionPath: null,
	cwd: "/Users/gannonhall/dev/pi",
	title: "Project home",
	status: "idle",
	attention: false,
	createdAt: "2026-05-12T10:00:00.000Z",
	updatedAt: "2026-05-12T10:00:00.000Z",
	lastOpenedAt: null,
	...overrides,
});

const createStandaloneChat = (overrides: Partial<StandaloneChatMetadata> = {}): StandaloneChatMetadata => ({
	id: "chat:standalone",
	source: "draft",
	sessionId: null,
	sessionPath: null,
	cwd: "/Users/gannonhall/dev/pi",
	title: "Would NextJS be good for this app?",
	status: "idle",
	attention: false,
	createdAt: "2026-05-12T11:09:00.000Z",
	updatedAt: "2026-05-12T11:09:00.000Z",
	lastOpenedAt: null,
	...overrides,
});

describe("project view model", () => {
	it("creates an empty sidebar child for projects with no chats", () => {
		const project = createProject();
		const view: ProjectStateView = {
			projects: [project],
			standaloneChats: [],
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

	it("marks the active project chat row when a chat is selected", () => {
		const chat = createChat();
		const project = createProject({ chats: [chat] });
		const view: ProjectStateView = {
			projects: [project],
			standaloneChats: [],
			selectedProjectId: project.id,
			selectedChatId: chat.id,
			selectedProject: project,
			selectedChat: chat,
		};

		expect(createProjectSidebarRows(view, fixedNow)[0]?.children).toEqual([
			{
				kind: "chat",
				chatId: chat.id,
				label: "Project home",
				selected: true,
				status: "idle",
				updatedLabel: "2h",
				needsAttention: false,
			},
		]);
	});

	it("limits visible chats and adds sidebar metadata", () => {
		const chats = [
			createChat({ id: "chat:1", title: "First long project chat title", updatedAt: "2026-05-12T11:45:00.000Z" }),
			createChat({ id: "chat:2", title: "Second", updatedAt: "2026-05-12T10:00:00.000Z", status: "running" }),
			createChat({ id: "chat:3", title: "Third", updatedAt: "2026-05-11T12:00:00.000Z" }),
			createChat({ id: "chat:4", title: "Fourth", updatedAt: "2026-05-09T12:00:00.000Z" }),
			createChat({ id: "chat:5", title: "Fifth", updatedAt: "2026-05-12T11:30:00.000Z" }),
			createChat({ id: "chat:6", title: "Hidden", updatedAt: "2026-05-12T11:00:00.000Z" }),
		];
		const project = createProject({ chats });
		const view: ProjectStateView = {
			projects: [project],
			standaloneChats: [],
			selectedProjectId: project.id,
			selectedChatId: "chat:2",
			selectedProject: project,
			selectedChat: chats[1] ?? null,
		};

		expect(createProjectSidebarRows(view, fixedNow)[0]?.children).toEqual([
			{
				kind: "chat",
				chatId: "chat:1",
				label: "First long project chat title",
				selected: false,
				status: "idle",
				updatedLabel: "15min",
				needsAttention: false,
			},
			{
				kind: "chat",
				chatId: "chat:2",
				label: "Second",
				selected: true,
				status: "running",
				updatedLabel: "2h",
				needsAttention: true,
			},
			{
				kind: "chat",
				chatId: "chat:3",
				label: "Third",
				selected: false,
				status: "idle",
				updatedLabel: "1d",
				needsAttention: false,
			},
			{
				kind: "chat",
				chatId: "chat:4",
				label: "Fourth",
				selected: false,
				status: "idle",
				updatedLabel: "3d",
				needsAttention: false,
			},
			{
				kind: "chat",
				chatId: "chat:5",
				label: "Fifth",
				selected: false,
				status: "idle",
				updatedLabel: "30min",
				needsAttention: false,
			},
			{ kind: "show-more", label: "Show more", hiddenCount: 1 },
		]);
	});

	it("filters project chat rows by failed and attention status", () => {
		const failedChat = createChat({ id: "chat:failed", title: "Failed", status: "failed" });
		const runningChat = createChat({ id: "chat:running", title: "Running", status: "running", attention: true });
		const idleChat = createChat({ id: "chat:idle", title: "Idle" });
		const project = createProject({ chats: [failedChat, runningChat, idleChat] });
		const view: ProjectStateView = {
			projects: [project],
			standaloneChats: [],
			selectedProjectId: project.id,
			selectedChatId: null,
			selectedProject: project,
			selectedChat: null,
		};

		expect(createProjectSidebarRows(view, fixedNow, { chatFilter: "attention" })[0]?.children).toEqual([
			{
				kind: "chat",
				chatId: "chat:failed",
				label: "Failed",
				selected: false,
				status: "failed",
				updatedLabel: "2h",
				needsAttention: false,
			},
			{
				kind: "chat",
				chatId: "chat:running",
				label: "Running",
				selected: false,
				status: "running",
				updatedLabel: "2h",
				needsAttention: true,
			},
		]);
	});

	it("expands project chat rows when showMore is true", () => {
		const chats = Array.from({ length: 6 }, (_, index) =>
			createChat({
				id: `chat:${index + 1}`,
				title: `Chat ${index + 1}`,
			}),
		);
		const project = createProject({ chats });
		const view: ProjectStateView = {
			projects: [project],
			standaloneChats: [],
			selectedProjectId: project.id,
			selectedChatId: null,
			selectedProject: project,
			selectedChat: null,
		};

		expect(
			createProjectSidebarRows(view, fixedNow, { expandedProjectIds: new Set([project.id]) })[0]?.children,
		).toHaveLength(6);
	});

	it("creates standalone chat rows directly under chats", () => {
		const view: ProjectStateView = {
			projects: [],
			standaloneChats: [createStandaloneChat()],
			selectedProjectId: null,
			selectedChatId: null,
			selectedProject: null,
			selectedChat: null,
		};

		expect(createStandaloneChatSidebarRows(view, fixedNow)).toEqual([
			{
				kind: "chat",
				chatId: "chat:standalone",
				label: "Would NextJS be good for this app?",
				selected: false,
				status: "idle",
				updatedLabel: "51min",
				needsAttention: false,
			},
		]);
	});

	it("adds a show-more row when standalone chats exceed the visible limit", () => {
		const standaloneChats = Array.from({ length: 6 }, (_, index) =>
			createStandaloneChat({
				id: `chat:standalone:${index + 1}`,
				title: `Standalone ${index + 1}`,
			}),
		);
		const view: ProjectStateView = {
			projects: [],
			standaloneChats,
			selectedProjectId: null,
			selectedChatId: null,
			selectedProject: null,
			selectedChat: null,
		};

		expect(createStandaloneChatSidebarRows(view, fixedNow).at(-1)).toEqual({
			kind: "show-more",
			label: "Show more",
			hiddenCount: 1,
		});
	});

	it("expands standalone chat rows when expandStandaloneChats is true", () => {
		const standaloneChats = Array.from({ length: 6 }, (_, index) =>
			createStandaloneChat({
				id: `chat:standalone:${index + 1}`,
				title: `Standalone ${index + 1}`,
			}),
		);
		const view: ProjectStateView = {
			projects: [],
			standaloneChats,
			selectedProjectId: null,
			selectedChatId: null,
			selectedProject: null,
			selectedChat: null,
		};

		expect(createStandaloneChatSidebarRows(view, fixedNow, { expandStandaloneChats: true })).toHaveLength(6);
	});
});
