import { describe, expect, it } from "vitest";
import {
	createEmptyProjectStore,
	createProjectId,
	createProjectStateView,
	getNextNewProjectName,
	ProjectStoreSchema,
	sortChats,
	sortProjects,
} from "../../src/shared/project-state";

describe("project state contracts", () => {
	it("creates a valid empty store so first launch has no selected project", () => {
		const store = createEmptyProjectStore();

		expect(ProjectStoreSchema.parse(store)).toEqual(store);
		expect(store.projects).toEqual([]);
		expect(store.selectedProjectId).toBeNull();
		expect(store.chatsByProject).toEqual({});
	});

	it("sorts pinned projects first, then recent unpinned projects", () => {
		const projects = [
			{
				id: "project:beta",
				displayName: "beta",
				path: "/tmp/beta",
				createdAt: "2026-05-12T10:00:00.000Z",
				updatedAt: "2026-05-12T10:00:00.000Z",
				lastOpenedAt: "2026-05-12T10:00:00.000Z",
				pinned: false,
				availability: { status: "available" as const },
			},
			{
				id: "project:alpha",
				displayName: "alpha",
				path: "/tmp/alpha",
				createdAt: "2026-05-12T09:00:00.000Z",
				updatedAt: "2026-05-12T09:00:00.000Z",
				lastOpenedAt: "2026-05-12T09:00:00.000Z",
				pinned: true,
				availability: { status: "available" as const },
			},
		];

		expect(sortProjects(projects).map((project) => project.displayName)).toEqual(["alpha", "beta"]);
	});

	it("sorts unpinned projects by most recent open time so project lists resume recent work first", () => {
		const projects = [
			{
				id: "project:older",
				displayName: "older",
				path: "/tmp/older",
				createdAt: "2026-05-12T08:00:00.000Z",
				updatedAt: "2026-05-12T08:00:00.000Z",
				lastOpenedAt: "2026-05-12T08:00:00.000Z",
				pinned: false,
				availability: { status: "available" as const },
			},
			{
				id: "project:newer",
				displayName: "newer",
				path: "/tmp/newer",
				createdAt: "2026-05-12T09:00:00.000Z",
				updatedAt: "2026-05-12T09:00:00.000Z",
				lastOpenedAt: "2026-05-12T11:00:00.000Z",
				pinned: false,
				availability: { status: "available" as const },
			},
		];

		expect(sortProjects(projects).map((project) => project.displayName)).toEqual(["newer", "older"]);
	});

	it("sorts projects with matching recency by display name for stable sidebar order", () => {
		const projects = [
			{
				id: "project:beta",
				displayName: "beta",
				path: "/tmp/beta",
				createdAt: "2026-05-12T09:00:00.000Z",
				updatedAt: "2026-05-12T09:00:00.000Z",
				lastOpenedAt: "2026-05-12T09:00:00.000Z",
				pinned: false,
				availability: { status: "available" as const },
			},
			{
				id: "project:alpha",
				displayName: "alpha",
				path: "/tmp/alpha",
				createdAt: "2026-05-12T09:00:00.000Z",
				updatedAt: "2026-05-12T09:00:00.000Z",
				lastOpenedAt: "2026-05-12T09:00:00.000Z",
				pinned: false,
				availability: { status: "available" as const },
			},
		];

		expect(sortProjects(projects).map((project) => project.displayName)).toEqual(["alpha", "beta"]);
	});

	it("sorts chats by recent activity, then title, so project chat lists stay deterministic", () => {
		const chats = [
			{
				id: "chat:beta",
				projectId: "project:pi-desktop",
				source: "draft" as const,
				sessionId: null,
				sessionPath: null,
				cwd: "/tmp/pi-desktop",
				title: "Beta",
				status: "idle" as const,
				attention: false,
				createdAt: "2026-05-12T09:00:00.000Z",
				updatedAt: "2026-05-12T09:00:00.000Z",
				lastOpenedAt: null,
			},
			{
				id: "chat:recent",
				projectId: "project:pi-desktop",
				source: "draft" as const,
				sessionId: null,
				sessionPath: null,
				cwd: "/tmp/pi-desktop",
				title: "Recent",
				status: "idle" as const,
				attention: false,
				createdAt: "2026-05-12T10:00:00.000Z",
				updatedAt: "2026-05-12T10:00:00.000Z",
				lastOpenedAt: null,
			},
			{
				id: "chat:alpha",
				projectId: "project:pi-desktop",
				source: "draft" as const,
				sessionId: null,
				sessionPath: null,
				cwd: "/tmp/pi-desktop",
				title: "Alpha",
				status: "idle" as const,
				attention: false,
				createdAt: "2026-05-12T09:00:00.000Z",
				updatedAt: "2026-05-12T09:00:00.000Z",
				lastOpenedAt: null,
			},
		];

		expect(sortChats(chats).map((chat) => chat.title)).toEqual(["Recent", "Alpha", "Beta"]);
	});

	it("preserves chat metadata when a project is marked missing", () => {
		const store = {
			projects: [
				{
					id: "project:pi-desktop",
					displayName: "pi-desktop",
					path: "/missing/pi-desktop",
					createdAt: "2026-05-12T09:00:00.000Z",
					updatedAt: "2026-05-12T09:00:00.000Z",
					lastOpenedAt: "2026-05-12T09:00:00.000Z",
					pinned: false,
					availability: { status: "missing" as const, checkedAt: "2026-05-12T10:00:00.000Z" },
				},
			],
			selectedProjectId: "project:pi-desktop",
			selectedChatId: null,
			chatsByProject: {
				"project:pi-desktop": [
					{
						id: "chat:plan",
						projectId: "project:pi-desktop",
						source: "draft" as const,
						sessionId: null,
						sessionPath: null,
						cwd: "/missing/pi-desktop",
						title: "Plan project home milestone",
						status: "idle" as const,
						attention: false,
						createdAt: "2026-05-12T10:00:00.000Z",
						updatedAt: "2026-05-12T10:00:00.000Z",
						lastOpenedAt: null,
					},
				],
			},
		};

		const view = createProjectStateView(ProjectStoreSchema.parse(store));

		expect(view.selectedProject?.availability.status).toBe("missing");
		expect(view.projects[0]?.chats.map((chat) => chat.title)).toEqual(["Plan project home milestone"]);
	});

	it("does not select chat metadata from a different project", () => {
		const store = {
			projects: [
				{
					id: "project:selected",
					displayName: "selected",
					path: "/tmp/selected",
					createdAt: "2026-05-12T09:00:00.000Z",
					updatedAt: "2026-05-12T09:00:00.000Z",
					lastOpenedAt: "2026-05-12T09:00:00.000Z",
					pinned: false,
					availability: { status: "available" as const },
				},
				{
					id: "project:other",
					displayName: "other",
					path: "/tmp/other",
					createdAt: "2026-05-12T10:00:00.000Z",
					updatedAt: "2026-05-12T10:00:00.000Z",
					lastOpenedAt: "2026-05-12T10:00:00.000Z",
					pinned: false,
					availability: { status: "available" as const },
				},
			],
			selectedProjectId: "project:selected",
			selectedChatId: "chat:other",
			chatsByProject: {
				"project:selected": [],
				"project:other": [
					{
						id: "chat:other",
						projectId: "project:other",
						source: "draft" as const,
						sessionId: null,
						sessionPath: null,
						cwd: "/tmp/other",
						title: "Other project chat",
						status: "idle" as const,
						attention: false,
						createdAt: "2026-05-12T10:00:00.000Z",
						updatedAt: "2026-05-12T10:00:00.000Z",
						lastOpenedAt: null,
					},
				],
			},
		};

		const view = createProjectStateView(ProjectStoreSchema.parse(store));

		expect(view.selectedProject?.id).toBe("project:selected");
		expect(view.selectedChat).toBeNull();
	});

	it("chooses the next available New project name", () => {
		expect(getNextNewProjectName(["New project", "New project 2", "Other"])).toBe("New project 3");
		expect(getNextNewProjectName([])).toBe("New project");
	});

	it("derives stable project ids from paths", () => {
		expect(createProjectId("/Users/gannonhall/Documents/New project 2")).toBe(
			"project:/Users/gannonhall/Documents/New project 2",
		);
	});

	it("keeps Pi-backed chat metadata in recency order", () => {
		const first = {
			id: "chat:session:first",
			projectId: "project:/tmp/pi",
			source: "pi-session" as const,
			sessionId: "session-first",
			sessionPath: "/tmp/sessions/first.jsonl",
			cwd: "/tmp/pi",
			title: "First",
			status: "idle" as const,
			attention: false,
			createdAt: "2026-05-12T09:00:00.000Z",
			updatedAt: "2026-05-12T10:00:00.000Z",
			lastOpenedAt: null,
		};
		const second = {
			...first,
			id: "chat:session:second",
			sessionId: "session-second",
			sessionPath: "/tmp/sessions/second.jsonl",
			title: "Second",
			updatedAt: "2026-05-12T11:00:00.000Z",
		};

		expect(sortChats([first, second]).map((chat) => chat.id)).toEqual(["chat:session:second", "chat:session:first"]);
	});

	it("creates a state view with standalone selected chat metadata", () => {
		const standalone = {
			id: "chat:standalone",
			source: "pi-session" as const,
			sessionId: "session-standalone",
			sessionPath: "/tmp/sessions/standalone.jsonl",
			cwd: "/tmp/outside-project",
			title: "Standalone work",
			status: "idle" as const,
			attention: false,
			createdAt: "2026-05-12T09:00:00.000Z",
			updatedAt: "2026-05-12T10:00:00.000Z",
			lastOpenedAt: "2026-05-12T10:15:00.000Z",
		};

		const view = createProjectStateView({
			...createEmptyProjectStore(),
			standaloneChats: [standalone],
			selectedProjectId: null,
			selectedChatId: standalone.id,
		});

		expect(view.selectedProject).toBeNull();
		expect(view.selectedChat).toEqual(standalone);
		expect(view.standaloneChats).toEqual([standalone]);
	});

	it("parses legacy stores without standalone chats or session UI metadata", () => {
		const parsed = ProjectStoreSchema.parse({
			projects: [],
			selectedProjectId: null,
			selectedChatId: null,
			chatsByProject: {},
		});

		expect(parsed.standaloneChats).toEqual([]);
		expect(parsed.sessionUiByPath).toEqual({});
	});

	it("migrates legacy project chat records with draft Pi session defaults", () => {
		const parsed = ProjectStoreSchema.parse({
			projects: [
				{
					id: "project:/tmp/pi-desktop",
					displayName: "pi-desktop",
					path: "/tmp/pi-desktop",
					createdAt: "2026-05-12T09:00:00.000Z",
					updatedAt: "2026-05-12T09:00:00.000Z",
					lastOpenedAt: "2026-05-12T09:00:00.000Z",
					pinned: false,
					availability: { status: "available" as const },
				},
			],
			selectedProjectId: "project:/tmp/pi-desktop",
			selectedChatId: "chat:legacy",
			chatsByProject: {
				"project:/tmp/pi-desktop": [
					{
						id: "chat:legacy",
						projectId: "project:/tmp/pi-desktop",
						title: "Legacy chat",
						status: "idle",
						updatedAt: "2026-05-12T10:00:00.000Z",
					},
				],
			},
		});

		expect(parsed.chatsByProject["project:/tmp/pi-desktop"]?.[0]).toEqual({
			id: "chat:legacy",
			projectId: "project:/tmp/pi-desktop",
			source: "draft",
			sessionId: null,
			sessionPath: null,
			cwd: "/tmp/pi-desktop",
			title: "Legacy chat",
			status: "idle",
			attention: false,
			createdAt: "2026-05-12T10:00:00.000Z",
			updatedAt: "2026-05-12T10:00:00.000Z",
			lastOpenedAt: null,
		});
	});

	it("derives a non-empty cwd for orphaned legacy project chats", () => {
		const parsed = ProjectStoreSchema.parse({
			projects: [],
			selectedProjectId: "project:/tmp/orphaned-pi-desktop",
			selectedChatId: "chat:orphaned",
			chatsByProject: {
				"project:/tmp/orphaned-pi-desktop": [
					{
						id: "chat:orphaned",
						title: "Orphaned legacy chat",
						status: "idle",
						updatedAt: "2026-05-12T10:00:00.000Z",
					},
				],
			},
		});

		expect(parsed.chatsByProject["project:/tmp/orphaned-pi-desktop"]?.[0]?.cwd).toBe("/tmp/orphaned-pi-desktop");
	});

	it("uses a non-project legacy key as cwd when no project path exists", () => {
		const fallbackProjectId = "legacy-workspace";
		const parsed = ProjectStoreSchema.parse({
			projects: [],
			selectedProjectId: fallbackProjectId,
			selectedChatId: "chat:legacy-key",
			chatsByProject: {
				[fallbackProjectId]: [
					{
						id: "chat:legacy-key",
						title: "Legacy key chat",
						status: "idle",
						updatedAt: "2026-05-12T10:00:00.000Z",
					},
				],
			},
		});

		const cwd = parsed.chatsByProject[fallbackProjectId]?.[0]?.cwd;
		expect(cwd).toBeTruthy();
		expect(cwd).toBe(fallbackProjectId);
	});
});
