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
import { DEFAULT_PROJECT_GIT_SETTINGS } from "../../src/shared/project-state";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const createProject = (chats: ChatMetadata[], overrides: Partial<ProjectWithChats> = {}): ProjectWithChats => ({
	id: "project:/tmp/pi-desktop",
	displayName: "pi-desktop",
	path: "/tmp/pi-desktop",
	createdAt: "2026-05-12T09:00:00.000Z",
	updatedAt: "2026-05-12T09:00:00.000Z",
	lastOpenedAt: "2026-05-12T09:00:00.000Z",
	pinned: false,
	availability: { status: "available" },
	gitSettings: DEFAULT_PROJECT_GIT_SETTINGS,
	chats,
	...overrides,
});

const renderSidebar = (state: ProjectStateView, options: { loading?: boolean } = {}) =>
	renderToStaticMarkup(
		createElement(ProjectSidebar, {
			state,
			collapsed: false,
			onToggleCollapsed: vi.fn(),
			onProjectState: vi.fn(),
			loading: options.loading,
		}),
	);

describe("ProjectSidebar", () => {
	it("marks the sidebar busy and overlays loading feedback while sessions load", () => {
		const markup = renderSidebar(
			{
				projects: [],
				standaloneChats: [],
				selectedProjectId: null,
				selectedChatId: null,
				selectedProject: null,
				selectedChat: null,
			},
			{ loading: true },
		);

		expect(markup).toContain('aria-busy="true"');
		expect(markup).toContain("project-sidebar__panel--loading");
		expect(markup).toContain('role="status"');
		expect(markup).toContain("Loading sessions…");
	});

	it("enables the CHATS new-chat button for Desktop quick-start chats", () => {
		const markup = renderSidebar({
			projects: [],
			standaloneChats: [],
			selectedProjectId: null,
			selectedChatId: null,
			selectedProject: null,
			selectedChat: null,
		});

		expect(markup).toContain('aria-label="New quick-start chat"');
		expect(markup).not.toContain('aria-label="New quick-start chat" disabled=""');
	});

	it("renders project and standalone show-more controls as enabled toggle buttons", () => {
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

		const showMoreButtons = [...markup.matchAll(/<button class="project-sidebar__show-more"([^>]*)>/g)];

		expect(showMoreButtons).toHaveLength(2);
		expect(showMoreButtons.every((match) => !match[1]?.includes("disabled"))).toBe(true);
		expect(markup.match(/Show more/g)?.length).toBe(2);
		expect(markup).toContain('aria-expanded="false"');
		expect(markup).toContain("project-sidebar__chats-overflow-shell--collapsed");
		expect(markup).toMatch(
			/class="project-sidebar__chats-overflow-shell project-sidebar__chats-overflow-shell--collapsed"[^>]*\binert\b/,
		);
		expect(markup).toContain("project-sidebar__scroll");
	});

	it("renders pinned projects in a separate section before regular projects", () => {
		const pinnedProject = createProject([], {
			id: "project:/tmp/pinned-work",
			displayName: "pinned-work",
			path: "/tmp/pinned-work",
			pinned: true,
		});
		const regularProject = createProject([], {
			id: "project:/tmp/regular-work",
			displayName: "regular-work",
			path: "/tmp/regular-work",
			pinned: false,
		});
		const markup = renderSidebar({
			projects: [regularProject, pinnedProject],
			standaloneChats: [],
			selectedProjectId: null,
			selectedChatId: null,
			selectedProject: null,
			selectedChat: null,
		});

		const pinnedHeadingIndex = markup.indexOf(">Pinned<");
		const pinnedProjectIndex = markup.indexOf(">pinned-work<");
		const projectsHeadingIndex = markup.indexOf(">Projects<");
		const regularProjectIndex = markup.indexOf(">regular-work<");

		expect(pinnedHeadingIndex).toBeGreaterThanOrEqual(0);
		expect(markup).toMatch(/>Pinned<.*aria-expanded="true"/s);
		expect(pinnedHeadingIndex).toBeLessThan(pinnedProjectIndex);
		expect(pinnedProjectIndex).toBeLessThan(projectsHeadingIndex);
		expect(projectsHeadingIndex).toBeLessThan(regularProjectIndex);
	});

	it("keeps chat menu anchors out of chat row layout flow", () => {
		const styles = readFileSync("src/renderer/styles.css", "utf8");

		expect(styles).toContain(".menu-anchor.project-sidebar__chat-menu-anchor");
		expect(styles).toContain("position: absolute;");
	});

	it("aligns project titles with nested chat rows", () => {
		const styles = readFileSync("src/renderer/styles.css", "utf8");

		expect(styles).toContain("--sidebar-project-row-padding: 0.375rem 0.5rem 0.375rem 0;");
		expect(styles).toContain("padding: var(--sidebar-project-row-padding);");
		expect(styles).toContain("--sidebar-chat-row-padding: 0.375rem 0.5rem 0.375rem 2rem;");
	});

	it("uses inline rename fields instead of browser prompts", () => {
		const source = readFileSync("src/renderer/components/project-sidebar.tsx", "utf8");
		const styles = readFileSync("src/renderer/styles.css", "utf8");

		expect(source).toContain("SidebarInlineRenameField");
		expect(source).toContain("window.piDesktop.project.rename");
		expect(source).toContain("window.piDesktop.chat.rename");
		expect(source).not.toContain("window.prompt");
		expect(styles).toContain(".project-sidebar__inline-rename");
	});

	it("allows sidebar menus to escape the scroll container while open", () => {
		const styles = readFileSync("src/renderer/styles.css", "utf8");

		expect(styles).toContain(".project-sidebar__panel--menu-open .project-sidebar__scroll");
		expect(styles).toMatch(
			/\.project-sidebar__panel--menu-open \.project-sidebar__scroll\s*\{[^}]*overflow:\s*visible;/s,
		);
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

	it("exposes a dedicated disclosure control for each project row", () => {
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

		expect(markup).toContain('class="project-sidebar__project-disclosure"');
		expect(markup).toMatch(
			/class="project-sidebar__project-disclosure"[^>]*aria-expanded="true"|aria-expanded="true"[^>]*class="project-sidebar__project-disclosure"/,
		);
		expect(markup).toContain('aria-label="Collapse pi-desktop"');
		expect(markup).not.toMatch(
			/class="project-sidebar__project-row"[^>]*aria-expanded=|aria-expanded=[^>]*class="project-sidebar__project-row"/,
		);
	});

	it("declares menu semantics on sidebar disclosure buttons", () => {
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
		const menuLabels = ["Filter projects", "Add project", "Filter chats", "pi-desktop menu", "Project chat 1 menu"];

		for (const label of menuLabels) {
			const pattern = new RegExp(
				`aria-label="${escapeRegExp(label)}"[^>]*aria-controls="[^"]+"[^>]*aria-haspopup="menu"`,
			);
			expect(markup, `${label} should expose menu semantics`).toMatch(pattern);
		}
	});
});
