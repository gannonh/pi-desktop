import { describe, expect, it } from "vitest";
import { createChatShellRoute } from "../../src/renderer/chat/chat-view-model";
import type { getStaticTranscript } from "../../src/renderer/chat/static-transcripts";
import type { ChatMetadata, ProjectStateView, ProjectWithChats } from "../../src/shared/project-state";

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
	title: "Execute milestone 01: project home sidebar refinements",
	status: "idle",
	updatedAt: "2026-05-12T10:00:00.000Z",
	...overrides,
});

const assertRouteFixturesAreReadonly = (route: ReturnType<typeof createChatShellRoute>) => {
	if (route.kind === "global-start" || route.kind === "project-start") {
		// @ts-expect-error Suggestions are shared fixture data and must stay readonly.
		route.suggestions.push("Connect your favorite apps to Pi");
	}
};

const assertStaticTranscriptFixturesAreReadonly = (transcript: NonNullable<ReturnType<typeof getStaticTranscript>>) => {
	// @ts-expect-error Transcript summaries are fixture data and must stay readonly.
	transcript.assistantSummary.push("Changed summary");
	// @ts-expect-error Transcript card lists are fixture data and must stay readonly.
	transcript.cards.push({ title: "Changed", subtitle: "Changed", actionLabel: "Open" });

	const card = transcript.cards[0];
	if (card) {
		// @ts-expect-error Transcript card fields are fixture data and must stay readonly.
		card.title = "Changed";
	}
};

void assertRouteFixturesAreReadonly;
void assertStaticTranscriptFixturesAreReadonly;

describe("createChatShellRoute", () => {
	it("creates a global start route when no project is selected", () => {
		expect(createChatShellRoute(emptyView)).toEqual({
			kind: "global-start",
			title: "What should we work on?",
			composer: {
				projectSelectorLabel: "Work in a project",
				modeLabel: "Work locally",
				modelLabel: "5.5 High",
				runtimeAvailable: false,
			},
			suggestions: [
				"Review my recent commits for correctness risks and maintainability concerns",
				"Unblock my most recent open PR",
				"Connect your favorite apps to Pi",
			],
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

		expect(createChatShellRoute(view)).toEqual({
			kind: "project-start",
			title: "What should we build in pi-desktop?",
			projectId: project.id,
			composer: {
				projectSelectorLabel: "pi-desktop",
				modeLabel: "Work locally",
				branchLabel: "feat/M02-chat-shell",
				modelLabel: "5.5 High",
				runtimeAvailable: false,
			},
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

		expect(createChatShellRoute(view)).toEqual({
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

		expect(createChatShellRoute(view)).toEqual({
			kind: "unavailable-project",
			title: "pi-desktop is unavailable",
			body: "Locate the project folder or remove it from the sidebar.",
			projectId: project.id,
			projectSelectorLabel: "pi-desktop",
		});
	});

	it("creates a continued chat route when a static transcript fixture exists", () => {
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

		const route = createChatShellRoute(view);

		expect(route.kind).toBe("continued-chat");
		if (route.kind !== "continued-chat") {
			throw new Error("Expected a continued chat route");
		}
		expect(route.title).toBe("Execute milestone 01: project home sidebar refinements");
		expect(route.projectId).toBe(project.id);
		expect(route.chatId).toBe(chat.id);
		expect(route.composer.projectSelectorLabel).toBe("pi-desktop");
		expect(route.transcript.workedLabel).toBe("Worked for 7m 10s");
		expect(route.transcript.cards[0]).toEqual({
			title: "SKILL.md",
			subtitle: "Document · MD",
			actionLabel: "Open",
		});
	});

	it("creates an empty chat route when selected chat metadata has no fixture", () => {
		const chat = createChat({
			id: "chat:no-fixture",
			title: "Static metadata only",
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

		expect(createChatShellRoute(view)).toEqual({
			kind: "empty-chat",
			title: "Static metadata only",
			projectId: project.id,
			chatId: chat.id,
			composer: {
				projectSelectorLabel: "pi-desktop",
				modeLabel: "Work locally",
				branchLabel: "feat/M02-chat-shell",
				modelLabel: "5.5 High",
				runtimeAvailable: false,
			},
		});
	});
});
