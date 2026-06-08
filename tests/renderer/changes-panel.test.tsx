// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChangesPanel } from "../../src/renderer/changes-panel/ChangesPanel";
import { ChangesPanelProvider, useChangesPanel } from "../../src/renderer/changes-panel/changes-panel-context";
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

const otherProject = {
	...project,
	id: createProjectId("/tmp/pi-other-project"),
	displayName: "pi-other-project",
	path: "/tmp/pi-other-project",
};

const statusPayload: GitStatusPayload = {
	entries: [
		{ path: "README.md", status: "modified", area: "unstaged" },
		{ path: "new.txt", status: "untracked", area: "untracked" },
	],
	conflictOperation: "unknown",
	branch: "refs/heads/main",
};

function ChangesPanelStatusHarness() {
	const { status, refresh } = useChangesPanel();
	return (
		<div>
			<button type="button" onClick={() => void refresh()}>
				Refresh harness
			</button>
			{status?.entries.map((entry) => (
				<span key={`${entry.area}:${entry.path}`}>{entry.path}</span>
			))}
		</div>
	);
}

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
			createPullRequest: vi.fn(async () => ({
				ok: true as const,
				data: { title: "Feature PR", url: "https://github.com/gannonh/pi-desktop/pull/1", state: "open" as const },
			})),
			getPullRequestInfo: vi.fn(async () => ({
				ok: false as const,
				error: { code: "source_control.operation_failed", message: "No pull request found." },
			})),
			...overrides,
		},
		clipboard: {
			writeText: vi.fn(async () => ({ ok: true as const, data: { written: true as const } })),
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
					error: { code: "source_control.not_a_git_repo", message: "Project is not a git repository." },
				})),
		});
		render(<ChangesPanel project={project} isActive />);

		await waitFor(() => {
			expect(screen.getByText("Initialize repository")).toBeTruthy();
		});
	});

	it("shows initialize repository failures", async () => {
		installApi({
				getStatus: vi.fn(async () => ({
					ok: false as const,
					error: { code: "source_control.not_a_git_repo", message: "Project is not a git repository." },
				})),
			initializeRepository: vi.fn(async () => ({
				ok: false as const,
				error: { code: "source_control.operation_failed", message: "Cannot initialize repository." },
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("Initialize repository");
		fireEvent.click(screen.getByRole("button", { name: "Initialize repository" }));

		await screen.findByText("Cannot initialize repository.");
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

	it("bulk unstages only staged selections", async () => {
		const bulkUnstage = vi.fn(async () => ({ ok: true as const, data: {} }));
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
			bulkUnstage,
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("staged.ts");
		fireEvent.click(screen.getByLabelText("Select staged.ts"));
		fireEvent.click(screen.getByLabelText("Select unstaged.ts"));
		fireEvent.click(screen.getByRole("button", { name: "Unstage Selected" }));

		await waitFor(() => {
			expect(bulkUnstage).toHaveBeenCalledWith({ projectId: project.id, relativePaths: ["staged.ts"] });
		});
	});

	it("does not discard a row when confirmation is cancelled", async () => {
		const discard = vi.fn(async () => ({ ok: true as const, data: {} }));
		installApi({ discard });
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("README.md");
		fireEvent.click(screen.getAllByRole("button", { name: "Discard" })[0]);
		await screen.findByRole("alertdialog", { name: "Discard changes for README.md?" });
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(discard).not.toHaveBeenCalled();
	});

	it("confirms bulk discard before discarding selected rows", async () => {
		const bulkDiscard = vi.fn(async () => ({ ok: true as const, data: {} }));
		installApi({ bulkDiscard });
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("README.md");
		fireEvent.click(screen.getByLabelText("Select README.md"));
		fireEvent.click(screen.getByLabelText("Select new.txt"));
		fireEvent.click(screen.getByRole("button", { name: "Discard Selected" }));
		await screen.findByRole("alertdialog", { name: "Discard changes for 2 selected files?" });
		expect(screen.getByText("This will permanently delete untracked files.")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Discard Changes" }));

		await waitFor(() => {
			expect(bulkDiscard).toHaveBeenCalledWith({
				projectId: project.id,
				entries: [
					{ relativePath: "README.md", area: "unstaged" },
					{ relativePath: "new.txt", area: "untracked" },
				],
			});
		});
	});

	it("copies pull request links instead of rendering remote anchors", async () => {
		const createPullRequest = vi.fn(async () => ({
			ok: true as const,
			data: { title: "Feature PR", url: "https://github.com/gannonh/pi-desktop/pull/1", state: "open" as const },
		}));
		const writeText = vi.fn(async () => ({ ok: true as const, data: { written: true as const } }));
		installApi({ createPullRequest });
		window.piDesktop.clipboard.writeText = writeText;
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("README.md");
		fireEvent.change(screen.getByLabelText("PR title"), { target: { value: "Feature PR" } });
		fireEvent.click(screen.getByRole("button", { name: "Create PR" }));
		await screen.findByText("Feature PR");

		expect(document.querySelector('a[href="https://github.com/gannonh/pi-desktop/pull/1"]')).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Copy PR Link" }));

		await waitFor(() => {
			expect(writeText).toHaveBeenCalledWith({ text: "https://github.com/gannonh/pi-desktop/pull/1" });
		});
	});

	it("uses linked pull request state to disable duplicate create PR actions", async () => {
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [],
					conflictOperation: "unknown",
					branch: "refs/heads/feature",
					upstreamStatus: { hasUpstream: true, upstreamName: "origin/feature", ahead: 0, behind: 0 },
				} satisfies GitStatusPayload,
			})),
			getPullRequestInfo: vi.fn(async () => ({
				ok: true as const,
				data: { title: "Existing PR", url: "https://github.com/gannonh/pi-desktop/pull/2", state: "open" as const },
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("Existing PR");
		fireEvent.click(screen.getByRole("button", { name: "More source control actions" }));

		expect(screen.getAllByText("Pull request already linked.").length).toBeGreaterThan(0);
	});

	it("shows source-control actions for a clean working tree", async () => {
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
					upstreamStatus: { hasUpstream: true, upstreamName: "origin/main", ahead: 1, behind: 0 },
				} satisfies GitStatusPayload,
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("No uncommitted changes");

		expect(screen.getByText("origin/main")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Push" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Compare" })).toBeTruthy();
	});

	it("disables publish until upstream status is loaded", async () => {
		let resolveStatus: (value: { ok: true; data: GitStatusPayload }) => void = () => {};
		const getStatus = vi.fn(
			() =>
				new Promise<{ ok: true; data: GitStatusPayload }>((resolve) => {
					resolveStatus = resolve;
				}),
		);
		installApi({ getStatus });
		render(<ChangesPanel project={project} isActive />);

		fireEvent.click(screen.getByText("More source control actions"));
		expect(screen.getByRole<HTMLButtonElement>("button", { name: "Publish" }).disabled).toBe(true);

		await act(async () => {
			resolveStatus({
				ok: true,
				data: {
					entries: [],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
					upstreamStatus: { hasUpstream: false, ahead: 0, behind: 0 },
				},
			});
		});

		await screen.findByText("No uncommitted changes");
		expect(screen.getAllByRole<HTMLButtonElement>("button", { name: "Publish" }).some((button) => !button.disabled)).toBe(
			true,
		);
	});

	it("ignores stale status results after switching projects", async () => {
		let resolveFirstStatus: (value: { ok: true; data: GitStatusPayload }) => void = () => {};
		const getStatus = vi.fn((input: { projectId: string }) => {
			if (input.projectId === project.id) {
				return new Promise<{ ok: true; data: GitStatusPayload }>((resolve) => {
					resolveFirstStatus = resolve;
				});
			}
			return Promise.resolve({
				ok: true as const,
				data: {
					entries: [{ path: "other.ts", status: "modified", area: "unstaged" }],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
				} satisfies GitStatusPayload,
			});
		});
		installApi({ getStatus });
		const { rerender } = render(<ChangesPanel project={project} isActive />);

		rerender(<ChangesPanel project={otherProject} isActive />);

		await screen.findByText("other.ts");
		await act(async () => {
			resolveFirstStatus({
				ok: true,
				data: {
					entries: [{ path: "stale.ts", status: "modified", area: "unstaged" }],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
				},
			});
		});

		expect(screen.queryByText("stale.ts")).toBeNull();
		expect(screen.getByText("other.ts")).toBeTruthy();
	});

	it("ignores stale status results from older refreshes for the same project", async () => {
		let resolveFirstStatus: (value: { ok: true; data: GitStatusPayload }) => void = () => {};
		const getStatus = vi
			.fn()
			.mockImplementationOnce(
				() =>
					new Promise<{ ok: true; data: GitStatusPayload }>((resolve) => {
						resolveFirstStatus = resolve;
					}),
			)
			.mockResolvedValue({
				ok: true as const,
				data: {
					entries: [{ path: "newer.ts", status: "modified", area: "unstaged" }],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
				} satisfies GitStatusPayload,
			});
		installApi({ getStatus });
		render(
			<ChangesPanelProvider projectId={project.id} isActive={false}>
				<ChangesPanelStatusHarness />
			</ChangesPanelProvider>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Refresh harness" }));
		fireEvent.click(screen.getByRole("button", { name: "Refresh harness" }));
		await screen.findByText("newer.ts");
		await act(async () => {
			resolveFirstStatus({
				ok: true,
				data: {
					entries: [{ path: "stale.ts", status: "modified", area: "unstaged" }],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
				},
			});
		});

		expect(screen.queryByText("stale.ts")).toBeNull();
		expect(screen.getByText("newer.ts")).toBeTruthy();
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
