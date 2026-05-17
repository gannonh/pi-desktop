import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProjectSidebar } from "../../src/renderer/components/project-sidebar";
import type {
	ChatMetadata,
	ProjectStateView,
	ProjectWithChats,
	StandaloneChatMetadata,
} from "../../src/shared/project-state";

const createChat = (overrides: Partial<ChatMetadata> = {}): ChatMetadata => ({
	id: "chat:project-1",
	projectId: "project:/tmp/pi-desktop",
	source: "pi-session",
	sessionId: "session-1",
	sessionPath: "/tmp/pi-desktop/.pi/sessions/session-1.jsonl",
	cwd: "/tmp/pi-desktop",
	title: "Project chat 1",
	status: "idle",
	attention: false,
	createdAt: "2026-05-12T10:00:00.000Z",
	updatedAt: "2026-05-12T10:00:00.000Z",
	lastOpenedAt: null,
	...overrides,
});

const createStandaloneChat = (overrides: Partial<StandaloneChatMetadata> = {}): StandaloneChatMetadata => ({
	id: "chat:standalone-1",
	source: "pi-session",
	sessionId: "standalone-session-1",
	sessionPath: "/tmp/pi-desktop/.pi/sessions/standalone-session-1.jsonl",
	cwd: "/tmp/pi-desktop",
	title: "Standalone chat 1",
	status: "idle",
	attention: false,
	createdAt: "2026-05-12T10:00:00.000Z",
	updatedAt: "2026-05-12T10:00:00.000Z",
	lastOpenedAt: null,
	...overrides,
});

const createProject = (chats: ChatMetadata[]): ProjectWithChats => ({
	id: "project:/tmp/pi-desktop",
	displayName: "pi-desktop",
	path: "/tmp/pi-desktop",
	createdAt: "2026-05-12T09:00:00.000Z",
	updatedAt: "2026-05-12T09:00:00.000Z",
	lastOpenedAt: "2026-05-12T09:00:00.000Z",
	pinned: false,
	availability: { status: "available" },
	chats,
});

const renderSidebar = (state: ProjectStateView) =>
	renderToStaticMarkup(
		createElement(ProjectSidebar, {
			state,
			collapsed: false,
			onToggleCollapsed: vi.fn(),
			onProjectState: vi.fn(),
		}),
	);

describe("ProjectSidebar", () => {
	it("renders project and standalone show-more controls as enabled buttons", () => {
		const projectChats = Array.from({ length: 6 }, (_, index) =>
			createChat({
				id: `chat:project-${index + 1}`,
				title: `Project chat ${index + 1}`,
			}),
		);
		const standaloneChats = Array.from({ length: 6 }, (_, index) =>
			createStandaloneChat({
				id: `chat:standalone-${index + 1}`,
				title: `Standalone chat ${index + 1}`,
			}),
		);
		const project = createProject(projectChats);
		const markup = renderSidebar({
			projects: [project],
			standaloneChats,
			selectedProjectId: project.id,
			selectedChatId: null,
			selectedProject: project,
			selectedChat: null,
		});

		const showMoreButtons = [...markup.matchAll(/<button class="project-sidebar__show-more"([^>]*)>Show more/g)];

		expect(showMoreButtons).toHaveLength(2);
		expect(showMoreButtons.every((match) => !match[1]?.includes("disabled"))).toBe(true);
	});

	it("keeps chat menu anchors out of chat row layout flow", () => {
		const styles = readFileSync("src/renderer/styles.css", "utf8");

		expect(styles).toContain(".menu-anchor.project-sidebar__chat-menu-anchor");
		expect(styles).toContain("position: absolute;");
	});

	it("renders project chat menus for session-backed project chats", () => {
		const chat = createChat();
		const project = createProject([chat]);
		const markup = renderSidebar({
			projects: [project],
			standaloneChats: [],
			selectedProjectId: project.id,
			selectedChatId: chat.id,
			selectedProject: project,
			selectedChat: chat,
		});

		expect(markup).toContain('aria-label="Project chat 1 menu"');
		expect(markup).not.toContain('aria-label="Standalone chat 1 menu"');
	});
});
