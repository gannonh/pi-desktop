import { describe, expect, it } from "vitest";
import { createChatShellRoute, resolveChatSessionHeader } from "../../src/renderer/chat/chat-view-model";
import { createInitialSessionState } from "../../src/renderer/session/session-state";
import type {
	ChatMetadata,
	ProjectStateView,
	ProjectWithChats,
	StandaloneChatMetadata,
} from "../../src/shared/project-state";
import { createComposerContext, idleSession, previewComposerSettings } from "./composer-fixtures";

const emptyView: ProjectStateView = {
	projects: [],
	standaloneChats: [],
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
};

const createProject = (overrides: Partial<ProjectWithChats> = {}): ProjectWithChats => ({
	id: "project:/Users/gannonhall/dev/pi-desktop",
	displayName: "pi-desktop",
	path: "/Users/gannonhall/dev/pi-desktop",
	createdAt: "2026-05-12T09:00:00.000Z",
	updatedAt: "2026-05-12T09:00:00.000Z",
	lastOpenedAt: "2026-05-12T09:00:00.000Z",
	pinned: false,
	availability: { status: "available" },
	chats: [],
	...overrides,
});

const createChat = (overrides: Partial<ChatMetadata> = {}): ChatMetadata => ({
	id: "chat:milestone-01",
	projectId: "project:/Users/gannonhall/dev/pi-desktop",
	source: "draft",
	sessionId: null,
	sessionPath: null,
	cwd: "/Users/gannonhall/dev/pi-desktop",
	title: "Execute milestone 01: project home sidebar refinements",
	status: "idle",
	attention: false,
	createdAt: "2026-05-12T10:00:00.000Z",
	updatedAt: "2026-05-12T10:00:00.000Z",
	lastOpenedAt: null,
	...overrides,
});

const createStandaloneChat = (overrides: Partial<StandaloneChatMetadata> = {}): StandaloneChatMetadata => ({
	id: "chat:standalone",
	source: "pi-session",
	sessionId: "sdk-session:standalone",
	sessionPath: "/Users/gannonhall/Downloads/pi-session.jsonl",
	cwd: "/Users/gannonhall/Downloads",
	title: "Standalone chat",
	status: "idle",
	attention: false,
	createdAt: "2026-05-12T10:00:00.000Z",
	updatedAt: "2026-05-12T10:00:00.000Z",
	lastOpenedAt: null,
	...overrides,
});

const createMetadataLabel = (chat: Pick<ChatMetadata | StandaloneChatMetadata, "status" | "updatedAt" | "cwd">) =>
	`${chat.status} · ${chat.cwd} · updated ${new Date(chat.updatedAt).toLocaleString()}`;

const settingsComposer = createComposerContext({
	modelLabel: previewComposerSettings.modelLabel,
	thinkingLabel: "High",
	modelOptions: previewComposerSettings.availableModels.map((model) => ({
		provider: model.provider,
		id: model.id,
		label: model.label,
	})),
	thinkingOptions: previewComposerSettings.availableThinkingLevels.map((level) => ({
		level,
		label: level === "off" ? "Off" : level.charAt(0).toUpperCase() + level.slice(1),
	})),
});

const assertRouteFixturesAreReadonly = (route: ReturnType<typeof createChatShellRoute>) => {
	if (route.kind === "global-start" || route.kind === "project-start" || route.kind === "standalone-start") {
		// @ts-expect-error Suggestions are shared fixture data and must stay readonly.
		route.suggestions.push("Connect your favorite apps to Pi");
	}
};

void assertRouteFixturesAreReadonly;

describe("createChatShellRoute", () => {
	it("creates a global start route when no project is selected", () => {
		expect(createChatShellRoute(emptyView, idleSession, null)).toEqual({
			kind: "global-start",
			title: "What should we work on?",
			composer: createComposerContext({
				projectSelectorLabel: "Work in a project",
				runtimeAvailable: false,
				disabledReason: "Select an available project to start a Pi session.",
				showProjectMenu: true,
			}),
			suggestions: [
				"Review my recent commits for correctness risks and maintainability concerns",
				"Unblock my most recent open PR",
				"Connect your favorite apps to Pi",
			],
		});
	});

	it("creates a standalone start route with an enabled composer for a selected standalone session chat", () => {
		const chat = createStandaloneChat({
			cwd: "/tmp/outside",
			title: "Standalone",
		});
		const view: ProjectStateView = {
			projects: [],
			standaloneChats: [chat],
			selectedProjectId: null,
			selectedChatId: chat.id,
			selectedProject: null,
			selectedChat: chat,
		};

		expect(createChatShellRoute(view, idleSession, previewComposerSettings)).toEqual({
			kind: "standalone-start",
			title: "Standalone",
			chatId: chat.id,
			composer: createComposerContext({
				...settingsComposer,
				projectSelectorLabel: "/tmp/outside",
				showProjectMenu: true,
			}),
			suggestions: [
				"Review my recent commits for correctness risks and maintainability concerns",
				"Unblock my most recent open PR",
				"Connect your favorite apps to Pi",
			],
			resumeLabel: "Resume session",
			metadataLabel: createMetadataLabel(chat),
		});
	});

	it("creates a project start route with selected project context", () => {
		const project = createProject();
		const view: ProjectStateView = {
			projects: [project],
			standaloneChats: [],
			selectedProjectId: project.id,
			selectedChatId: null,
			selectedProject: project,
			selectedChat: null,
		};

		expect(createChatShellRoute(view, idleSession, previewComposerSettings)).toEqual({
			kind: "project-start",
			title: "What should we build in pi-desktop?",
			projectId: project.id,
			composer: createComposerContext({
				...settingsComposer,
				projectSelectorLabel: "pi-desktop",
				projectId: project.id,
				showProjectMenu: true,
				projectOptions: [{ projectId: project.id, label: "pi-desktop" }],
			}),
			suggestions: [
				"Review my recent commits for correctness risks and maintainability concerns",
				"Unblock my most recent open PR",
				"Connect your favorite apps to Pi",
			],
		});
	});

	it("creates an unavailable project route with the stored recovery copy", () => {
		const project = createProject({
			availability: { status: "unavailable", checkedAt: "2026-05-12T10:00:00.000Z", reason: "Permission denied" },
		});
		const view: ProjectStateView = {
			projects: [project],
			standaloneChats: [],
			selectedProjectId: project.id,
			selectedChatId: null,
			selectedProject: project,
			selectedChat: null,
		};

		expect(createChatShellRoute(view, idleSession, null)).toEqual({
			kind: "unavailable-project",
			title: "pi-desktop is unavailable",
			body: "Permission denied",
			projectId: project.id,
			projectSelectorLabel: "pi-desktop",
		});
	});

	it("creates an unavailable project route with generic recovery copy when the project is missing", () => {
		const project = createProject({
			availability: { status: "missing", checkedAt: "2026-05-12T10:00:00.000Z" },
		});
		const view: ProjectStateView = {
			projects: [project],
			standaloneChats: [],
			selectedProjectId: project.id,
			selectedChatId: null,
			selectedProject: project,
			selectedChat: null,
		};

		expect(createChatShellRoute(view, idleSession, null)).toEqual({
			kind: "unavailable-project",
			title: "pi-desktop is unavailable",
			body: "Locate the project folder or remove it from the sidebar.",
			projectId: project.id,
			projectSelectorLabel: "pi-desktop",
		});
	});

	it("creates an empty chat route for a selected project chat", () => {
		const chat = createChat({
			id: "chat:no-fixture",
			title: "Static metadata only",
			sessionPath: "/tmp/session.jsonl",
		});
		const project = createProject({ chats: [chat] });
		const view: ProjectStateView = {
			projects: [project],
			standaloneChats: [],
			selectedProjectId: project.id,
			selectedChatId: chat.id,
			selectedProject: project,
			selectedChat: chat,
		};

		expect(createChatShellRoute(view, idleSession, previewComposerSettings)).toEqual({
			kind: "empty-chat",
			title: "Static metadata only",
			startTitle: "What should we build in pi-desktop?",
			projectId: project.id,
			chatId: chat.id,
			composer: createComposerContext({
				...settingsComposer,
				projectSelectorLabel: "pi-desktop",
				projectId: project.id,
				showProjectMenu: false,
				projectOptions: [{ projectId: project.id, label: "pi-desktop" }],
			}),
			suggestions: [
				"Review my recent commits for correctness risks and maintainability concerns",
				"Unblock my most recent open PR",
				"Connect your favorite apps to Pi",
			],
			resumeLabel: "Resume session",
			metadataLabel: createMetadataLabel(chat),
		});
	});
});

describe("resolveChatSessionHeader", () => {
	it("returns chat title and session labels for an active session layout", () => {
		const chat = createChat({
			title: "Milestone transcript",
			sessionPath: "/tmp/session.jsonl",
			status: "running",
		});
		const project = createProject({ chats: [chat] });
		const view: ProjectStateView = {
			projects: [project],
			standaloneChats: [],
			selectedProjectId: project.id,
			selectedChatId: chat.id,
			selectedProject: project,
			selectedChat: chat,
		};
		const route = createChatShellRoute(view, idleSession, previewComposerSettings);
		const session = {
			...createInitialSessionState(),
			status: "running" as const,
			messages: [{ id: "assistant:1", role: "assistant" as const, content: "Live response", streaming: true }],
		};

		expect(resolveChatSessionHeader(route, session)).toEqual({
			title: "Milestone transcript",
			resumeLabel: "Resume session",
			metadataLabel: createMetadataLabel(chat),
		});
	});

	it("returns null for centered start layout drafts", () => {
		const chat = createChat({ sessionPath: null, status: "idle" });
		const project = createProject({ chats: [chat] });
		const view: ProjectStateView = {
			projects: [project],
			standaloneChats: [],
			selectedProjectId: project.id,
			selectedChatId: chat.id,
			selectedProject: project,
			selectedChat: chat,
		};

		expect(
			resolveChatSessionHeader(createChatShellRoute(view, idleSession, null), createInitialSessionState()),
		).toBeNull();
	});
});
