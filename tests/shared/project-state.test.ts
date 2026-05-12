import { describe, expect, it } from "vitest";
import {
	createEmptyProjectStore,
	createProjectId,
	createProjectStateView,
	getNextNewProjectName,
	ProjectStoreSchema,
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
