// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChangesPanel } from "../../src/renderer/changes-panel/ChangesPanel";
import type { PiDesktopApi } from "../../src/shared/preload-api";
import type { GitStatusPayload } from "../../src/shared/source-control/schemas";
import { createProjectId } from "../../src/shared/project-state";
import { FileViewer } from "../../src/renderer/file-workspace/file-viewer";
import { ShellTestProviders } from "./shell-test-providers";

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
	const commit = vi.fn(async () => ({ ok: true as const, data: { sha: "a".repeat(40), summary: "Update readme" } }));
	const getDiff = vi.fn(async () => ({
		ok: true as const,
		data: { kind: "text" as const, path: "README.md", title: "README.md (unstaged)", diffKind: "unstaged" as const, patch: "@@\n-old\n+new\n" },
	}));
	const abortConflict = vi.fn(async () => ({ ok: true as const, data: {} }));
	window.piDesktop = {
		...window.piDesktop,
		sourceControl: {
			getStatus,
			checkIgnored: vi.fn(),
			stage: vi.fn(async () => ({ ok: true as const, data: {} })),
			unstage: vi.fn(async () => ({ ok: true as const, data: {} })),
			discard: vi.fn(async () => ({ ok: true as const, data: {} })),
			bulkStage: vi.fn(async () => ({ ok: true as const, data: {} })),
			bulkUnstage: vi.fn(async () => ({ ok: true as const, data: {} })),
			bulkDiscard: vi.fn(async () => ({ ok: true as const, data: {} })),
			initializeRepository,
			commit,
			getDiff,
			getUpstreamStatus: vi.fn(async () => ({ ok: true as const, data: { hasUpstream: false, ahead: 0, behind: 0 } })),
			fetch: vi.fn(async () => ({ ok: true as const, data: {} })),
			push: vi.fn(async () => ({ ok: true as const, data: {} })),
			pull: vi.fn(async () => ({ ok: true as const, data: {} })),
			sync: vi.fn(async () => ({ ok: true as const, data: {} })),
			fastForward: vi.fn(async () => ({ ok: true as const, data: {} })),
			publish: vi.fn(async () => ({ ok: true as const, data: {} })),
			rebaseFromBase: vi.fn(async () => ({ ok: true as const, data: {} })),
			getBranchCompare: vi.fn(async () => ({ ok: true as const, data: { baseRef: "main", headRef: "HEAD", ahead: 0, behind: 0, files: [] } })),
			abortConflict,
			...overrides,
		},
	} as PiDesktopApi;
	return { getStatus, initializeRepository, commit, getDiff, abortConflict };
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

	it("commits staged changes and shows success feedback", async () => {
		const commit = vi.fn(async () => ({ ok: true as const, data: { sha: "b".repeat(40), summary: "Ship it" } }));
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [{ path: "README.md", status: "modified", area: "staged" }],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
				} satisfies GitStatusPayload,
			})),
			commit,
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("README.md");
		fireEvent.change(screen.getByLabelText("Commit message"), { target: { value: "Ship it" } });
		fireEvent.click(screen.getByRole("button", { name: "Commit" }));

		await waitFor(() => {
			expect(commit).toHaveBeenCalledWith({ projectId: project.id, message: "Ship it" });
			expect(screen.getByText("Committed Ship it")).toBeTruthy();
		});
	});

	it("opens changed files as diff tabs", async () => {
		const { getDiff } = installApi();
		render(
			<ShellTestProviders project={project}>
				<ChangesPanel project={project} isActive />
				<FileViewer />
			</ShellTestProviders>,
		);

		await screen.findByText("README.md");
		fireEvent.click(screen.getByRole("button", { name: /Open diff for README\.md/ }));

		await waitFor(() => {
			expect(getDiff).toHaveBeenCalledWith({ projectId: project.id, relativePath: "README.md", kind: "unstaged" });
			expect(screen.getByTestId("file-diff-viewer").textContent).toContain("+new");
		});
	});

	it("opens untracked files with an untracked diff request", async () => {
		const getDiff = vi.fn(async () => ({
			ok: true as const,
			data: {
				kind: "unsupported" as const,
				path: "new.txt",
				title: "new.txt (untracked)",
				message: "Untracked file diffs are not displayed yet.",
				diffKind: "untracked" as const,
			},
		}));
		installApi({ getDiff });
		render(
			<ShellTestProviders project={project}>
				<ChangesPanel project={project} isActive />
				<FileViewer />
			</ShellTestProviders>,
		);

		await screen.findByText("new.txt");
		fireEvent.click(screen.getByRole("button", { name: /Open diff for new\.txt/ }));

		await waitFor(() => {
			expect(getDiff).toHaveBeenCalledWith({ projectId: project.id, relativePath: "new.txt", kind: "untracked" });
			expect(screen.getByTestId("file-diff-state").textContent).toContain("Untracked file diffs");
		});
	});

	it("runs bulk actions for selected files", async () => {
		const bulkStage = vi.fn(async () => ({ ok: true as const, data: {} }));
		installApi({ bulkStage });
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("README.md");
		fireEvent.click(screen.getByLabelText("Select README.md"));
		fireEvent.click(screen.getByLabelText("Select new.txt"));
		fireEvent.click(screen.getByRole("button", { name: "Stage Selected" }));

		await waitFor(() => {
			expect(bulkStage).toHaveBeenCalledWith({
				projectId: project.id,
				relativePaths: ["README.md", "new.txt"],
			});
		});
	});

	it("keeps Stage All enabled when staged and unstaged changes coexist", async () => {
		const bulkStage = vi.fn(async () => ({ ok: true as const, data: {} }));
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [
						{ path: "staged.ts", status: "modified", area: "staged" },
						{ path: "unstaged.ts", status: "modified", area: "unstaged" },
					],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
				} satisfies GitStatusPayload,
			})),
			bulkStage,
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("unstaged.ts");
		fireEvent.click(screen.getByRole("button", { name: "Stage All" }));

		await waitFor(() => {
			expect(bulkStage).toHaveBeenCalledWith({ projectId: project.id, relativePaths: ["unstaged.ts"] });
		});
	});

	it("shows conflict operation badges and aborts merge operations", async () => {
		const abortConflict = vi.fn(async () => ({ ok: true as const, data: {} }));
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: { entries: [], conflictOperation: "merge", branch: "refs/heads/main" } satisfies GitStatusPayload,
			})),
			abortConflict,
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("Merge in progress");
		fireEvent.click(screen.getByRole("button", { name: "Abort merge" }));

		await waitFor(() => {
			expect(abortConflict).toHaveBeenCalledWith({ projectId: project.id, operation: "merge" });
		});
	});
});
