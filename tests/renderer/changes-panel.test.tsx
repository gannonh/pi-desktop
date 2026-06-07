// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChangesPanel } from "../../src/renderer/changes-panel/ChangesPanel";
import type { PiDesktopApi } from "../../src/shared/preload-api";
import type { GitStatusPayload } from "../../src/shared/source-control/schemas";
import { createProjectId } from "../../src/shared/project-state";

const project = {
	id: createProjectId("/tmp/pi-project"),
	displayName: "pi-project",
	path: "/tmp/pi-project",
	createdAt: "2026-06-07T00:00:00.000Z",
	updatedAt: "2026-06-07T00:00:00.000Z",
	lastOpenedAt: "2026-06-07T00:00:00.000Z",
	pinned: false,
	availability: { status: "available" as const, checkedAt: "2026-06-07T00:00:00.000Z" },
	chats: [],
};

const statusPayload: GitStatusPayload = {
	entries: [
		{ path: "README.md", status: "modified", area: "unstaged" },
		{ path: "new.txt", status: "untracked", area: "untracked" },
	],
	conflictOperation: "unknown",
	branch: "refs/heads/main",
};

const installApi = (overrides: Partial<PiDesktopApi["sourceControl"]> = {}) => {
	const getStatus = vi.fn(async () => ({ ok: true as const, data: statusPayload }));
	const initializeRepository = vi.fn(async () => ({ ok: true as const, data: {} }));
	window.piDesktop = {
		...window.piDesktop,
		sourceControl: {
			getStatus,
			checkIgnored: vi.fn(),
			stage: vi.fn(),
			unstage: vi.fn(),
			discard: vi.fn(),
			bulkStage: vi.fn(),
			bulkUnstage: vi.fn(),
			bulkDiscard: vi.fn(),
			initializeRepository,
			...overrides,
		},
	} as PiDesktopApi;
	return { getStatus, initializeRepository };
};

describe("ChangesPanel", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("renders live status sections for a git project", async () => {
		installApi();
		render(<ChangesPanel project={project} isActive />);

		expect(screen.getByTestId("workspace-panel-changes")).toBeTruthy();
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Changes" })).toBeTruthy();
			expect(screen.getByText("README.md")).toBeTruthy();
			expect(screen.getByText("Untracked Files")).toBeTruthy();
			expect(screen.getByText("new.txt")).toBeTruthy();
		});
	});

	it("shows initialize repository when the project is not a git repo", async () => {
		installApi({
			getStatus: vi.fn(async () => ({
				ok: false as const,
				error: { code: "source_control.operation_failed", message: "Project is not a git repository." },
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await waitFor(() => {
			expect(screen.getByText("Initialize repository")).toBeTruthy();
		});
	});

	it("shows an empty state when no project is selected", () => {
		installApi();
		render(<ChangesPanel project={null} isActive />);
		expect(screen.getByText("Select a project to inspect source control changes.")).toBeTruthy();
	});
});
