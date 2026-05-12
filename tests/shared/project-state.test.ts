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
				title: "Beta",
				status: "idle" as const,
				updatedAt: "2026-05-12T09:00:00.000Z",
			},
			{
				id: "chat:recent",
				projectId: "project:pi-desktop",
				title: "Recent",
				status: "idle" as const,
				updatedAt: "2026-05-12T10:00:00.000Z",
			},
			{
				id: "chat:alpha",
				projectId: "project:pi-desktop",
				title: "Alpha",
				status: "idle" as const,
				updatedAt: "2026-05-12T09:00:00.000Z",
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
						title: "Plan project home milestone",
						status: "idle" as const,
						updatedAt: "2026-05-12T10:00:00.000Z",
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
						title: "Other project chat",
						status: "idle" as const,
						updatedAt: "2026-05-12T10:00:00.000Z",
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
});
