// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChangesPanel } from "../../src/renderer/changes-panel/ChangesPanel";
import { ChangesPanelProvider, useChangesPanel } from "../../src/renderer/changes-panel/changes-panel-context";
import { registerCommitRecoverySessionHandler } from "../../src/renderer/session/commit-recovery-session-bridge";
import type { CommitRecoverySessionRequest } from "../../src/renderer/session/commit-recovery-session-bridge";
import type { PiDesktopApi } from "../../src/shared/preload-api";
import type { GitStatusPayload } from "../../src/shared/source-control/schemas";
import type { GitUpstreamStatus } from "../../src/shared/source-control/types";
import { createProjectId, DEFAULT_PROJECT_GIT_SETTINGS } from "../../src/shared/project-state";
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
	gitSettings: DEFAULT_PROJECT_GIT_SETTINGS,
	chats: [],
};

const otherProject = {
	...project,
	id: createProjectId("/tmp/pi-other-project"),
	displayName: "pi-other-project",
	path: "/tmp/pi-other-project",
};

const testUpstreamStatus = (
	status: Pick<GitUpstreamStatus, "hasUpstream" | "ahead" | "behind"> & Partial<GitUpstreamStatus>,
): GitUpstreamStatus => {
	const relation =
		status.relation ??
		(!status.hasUpstream
			? "none"
			: status.ahead > 0 && status.behind > 0
				? "diverged"
				: status.ahead > 0
					? "ahead"
					: status.behind > 0
						? "behind"
						: "up_to_date");
	return {
		...status,
		relation,
		isConfigured: status.isConfigured ?? true,
	};
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
			getUpstreamStatus: vi.fn(async () => ({
				ok: true as const,
				data: { hasUpstream: false, ahead: 0, behind: 0, relation: "none" as const, isConfigured: false },
			})),
			fetch: vi.fn(async () => ({ ok: true as const, data: {} })),
			push: vi.fn(async () => ({ ok: true as const, data: {} })),
			forcePushWithLease: vi.fn(async () => ({ ok: true as const, data: {} })),
			pull: vi.fn(async () => ({ ok: true as const, data: {} })),
			sync: vi.fn(async () => ({ ok: true as const, data: {} })),
			fastForward: vi.fn(async () => ({ ok: true as const, data: {} })),
			publish: vi.fn(async () => ({ ok: true as const, data: {} })),
			rebaseFromBase: vi.fn(async () => ({ ok: true as const, data: {} })),
			getBranchCompare: vi.fn(async () => ({ ok: true as const, data: { baseRef: "main", headRef: "HEAD", ahead: 0, behind: 0, files: [] } })),
			getHistory: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [
						{
							sha: "b".repeat(40),
							shortSha: "bbbbbbb",
							subject: "Second commit",
							author: "Test Author",
							authorDate: "2026-06-08T12:00:00-07:00",
							refs: ["main"],
						},
					],
					incomingCount: 0,
					outgoingCount: 0,
				},
			})),
			getCommitFiles: vi.fn(async () => ({
				ok: true as const,
				data: { commitRef: "b".repeat(40), files: [{ path: "README.md", status: "modified" as const }] },
			})),
			abortConflict,
			createPullRequest: vi.fn(async () => ({
				ok: true as const,
				data: { title: "Feature PR", url: "https://github.com/gannonh/pi-desktop/pull/1", state: "open" as const },
			})),
			getPullRequestInfo: vi.fn(async () => ({
				ok: false as const,
				error: { code: "source_control.no_linked_pull_request", message: "No pull request found." },
			})),
			getGhAuthStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					ghAvailable: true,
					authenticated: true,
					account: "gannonh",
					remediation: null,
				},
			})),
			generateCommitMessage: vi.fn(async () => ({
				ok: true as const,
				data: { message: "feat(changes): generated commit" },
			})),
			generatePullRequestFields: vi.fn(async () => ({
				ok: true as const,
				data: { title: "Generated PR", body: "Generated body" },
			})),
			cancelGeneration: vi.fn(async () => ({ ok: true as const, data: {} })),
			...overrides,
		},
		clipboard: {
			writeText: vi.fn(async () => ({ ok: true as const, data: { written: true as const } })),
		},
		app: {
			getVersion: vi.fn(async () => ({ ok: true as const, data: { name: "pi-desktop", version: "test" } })),
			openExternal: vi.fn(async () => ({ ok: true as const, data: { opened: true as const } })),
		},
	} as PiDesktopApi;
	return { getStatus, initializeRepository, commit, getDiff, abortConflict };
};

const expandBranchCompareSection = () => {
	fireEvent.click(screen.getByRole("button", { name: "Branch Compare" }));
};

const expandPullRequestSection = () => {
	fireEvent.click(screen.getByRole("button", { name: "Pull Request" }));
};

const openSourceControlMenu = async () => {
	const user = userEvent.setup();
	const trigger = await screen.findByRole("button", { name: "More source control actions" });
	if (trigger.getAttribute("aria-expanded") !== "true") {
		await user.click(trigger);
	}
	await screen.findByRole("menu");
};

const closeSourceControlMenu = async () => {
	const user = userEvent.setup();
	await user.keyboard("{Escape}");
	await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
};

const expectMenuItemDisabled = (name: string | RegExp, disabled: boolean) => {
	const item = screen.getByRole("menuitem", { name });
	if (disabled) {
		expect(item.getAttribute("aria-disabled")).toBe("true");
		return;
	}
	expect(item.getAttribute("aria-disabled")).not.toBe("true");
};

describe("ChangesPanel", () => {
	afterEach(() => {
		registerCommitRecoverySessionHandler(null);
		vi.restoreAllMocks();
	});

	it("renders live status sections for a git project", async () => {
		installApi();
		render(<ChangesPanel project={project} isActive />);

		expect(screen.getByTestId("workspace-panel-changes")).toBeTruthy();
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Changes" })).toBeTruthy();
			expect(screen.getByTestId("changes-panel-branch").textContent).toBe("main");
			expect(screen.getByText("README.md")).toBeTruthy();
			expect(screen.getByText("Untracked Files")).toBeTruthy();
			expect(screen.getByText("new.txt")).toBeTruthy();
		});
	});

	it("places file sections above the commit form and keeps secondary workflows collapsed by default", async () => {
		installApi();
		render(<ChangesPanel project={project} isActive />);

		const readme = await screen.findByText("README.md");
		const commitMessage = screen.getByLabelText("Commit message");
		expect(commitMessage.compareDocumentPosition(readme) & Node.DOCUMENT_POSITION_PRECEDING).toBe(
			Node.DOCUMENT_POSITION_PRECEDING,
		);
		expect(screen.queryByLabelText("PR title")).toBeNull();
		expect(screen.queryByRole("button", { name: "Compare" })).toBeNull();
		expect(screen.queryByText("Second commit")).toBeNull();
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

	it("shows commit failure summary with expandable git output", async () => {
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [{ path: "README.md", status: "modified", area: "staged" }],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
				} satisfies GitStatusPayload,
			})),
			commit: vi.fn(async () => ({
				ok: false as const,
				error: {
					code: "source_control.operation_failed",
					message: "Commit failed.\n\nerror: gpg failed to sign the data",
				},
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("README.md");
		fireEvent.change(screen.getByLabelText("Commit message"), { target: { value: "Ship it" } });
		fireEvent.click(screen.getByRole("button", { name: "Commit" }));

		await screen.findByRole("alertdialog", { name: "Commit failed" });
		expect(screen.getByText("Commit failed.")).toBeTruthy();
		expect(screen.queryByText("error: gpg failed to sign the data")).toBeNull();

		fireEvent.click(screen.getByText("Show git output"));
		expect(screen.getByText(/error: gpg failed to sign the data/)).toBeTruthy();
	});

	it("dismisses commit failure recovery without launching Pi", async () => {
		const recover = vi.fn<(request: CommitRecoverySessionRequest) => Promise<boolean>>(async () => true);
		registerCommitRecoverySessionHandler(recover);

		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [{ path: "README.md", status: "modified", area: "staged" }],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
				} satisfies GitStatusPayload,
			})),
			commit: vi.fn(async () => ({
				ok: false as const,
				error: { code: "source_control.operation_failed", message: "Commit failed.\n\nhook declined" },
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("README.md");
		fireEvent.change(screen.getByLabelText("Commit message"), { target: { value: "Ship it" } });
		fireEvent.click(screen.getByRole("button", { name: "Commit" }));
		await screen.findByRole("alertdialog", { name: "Commit failed" });
		fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

		expect(screen.queryByRole("alertdialog", { name: "Commit failed" })).toBeNull();
		expect(recover).not.toHaveBeenCalled();
	});

	it("starts Pi recovery with failure output and staged files in the prompt", async () => {
		const recover = vi.fn<(request: CommitRecoverySessionRequest) => Promise<boolean>>(async () => true);
		registerCommitRecoverySessionHandler(recover);

		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [
						{ path: "README.md", status: "modified", area: "staged" },
						{ path: "notes.txt", status: "untracked", area: "untracked" },
					],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
				} satisfies GitStatusPayload,
			})),
			commit: vi.fn(async () => ({
				ok: false as const,
				error: { code: "source_control.operation_failed", message: "Commit failed.\n\nhook declined" },
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("README.md");
		fireEvent.change(screen.getByLabelText("Commit message"), { target: { value: "Ship it" } });
		fireEvent.click(screen.getByRole("button", { name: "Commit" }));
		await screen.findByRole("alertdialog", { name: "Commit failed" });
		fireEvent.click(screen.getByRole("button", { name: "Recover with Pi" }));

		await waitFor(() => {
			expect(recover).toHaveBeenCalledTimes(1);
			const request = recover.mock.calls[0]?.[0];
			expect(request?.projectId).toBe(project.id);
			expect(request?.prompt).toContain("Ship it");
			expect(request?.prompt).toContain("README.md (staged, modified)");
			expect(request?.prompt).toContain("hook declined");
			expect(request?.prompt).toContain("Requested validation");
		});
		expect(screen.queryByRole("alertdialog", { name: "Commit failed" })).toBeNull();
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

	it("confirms a single-file discard before discarding the row", async () => {
		const discard = vi.fn(async () => ({ ok: true as const, data: {} }));
		installApi({ discard });
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("README.md");
		fireEvent.click(screen.getAllByRole("button", { name: "Discard" })[0]);
		await screen.findByRole("alertdialog", { name: "Discard changes for README.md?" });
		fireEvent.click(screen.getByRole("button", { name: "Discard Changes" }));

		await waitFor(() => {
			expect(discard).toHaveBeenCalledWith({ projectId: project.id, relativePath: "README.md", area: "unstaged" });
		});
	});

	it("uses delete-focused copy for untracked file discard confirmation", async () => {
		installApi();
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("new.txt");
		fireEvent.click(screen.getAllByRole("button", { name: "Discard" })[1]);

		await screen.findByRole("alertdialog", { name: "Delete untracked file new.txt?" });
		expect(screen.getByText("This file is not tracked by git. Deleting it cannot be undone by git.")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Delete File" })).toBeTruthy();
	});

	it("uses delete-focused copy for newly-added file discard confirmation", async () => {
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [{ path: "new-feature.ts", status: "added", area: "staged" }],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
				} satisfies GitStatusPayload,
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("new-feature.ts");
		fireEvent.click(screen.getByRole("button", { name: "Discard" }));

		await screen.findByRole("alertdialog", { name: "Delete newly-added file new-feature.ts?" });
		expect(screen.getByText("This file was added to git. Discarding it will remove it from the working tree.")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Delete File" })).toBeTruthy();
	});

	it("uses restore-focused copy for deleted tracked file discard confirmation", async () => {
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [{ path: "removed.ts", status: "deleted", area: "unstaged" }],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
				} satisfies GitStatusPayload,
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("removed.ts");
		fireEvent.click(screen.getByRole("button", { name: "Discard" }));

		await screen.findByRole("alertdialog", { name: "Restore deleted file removed.ts?" });
		expect(screen.getByText("This will restore the tracked file from git.")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Restore File" })).toBeTruthy();
	});

	it("confirms bulk discard before discarding selected rows", async () => {
		const bulkDiscard = vi.fn(async () => ({ ok: true as const, data: {} }));
		installApi({ bulkDiscard });
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("README.md");
		fireEvent.click(screen.getByLabelText("Select README.md"));
		fireEvent.click(screen.getByLabelText("Select new.txt"));
		fireEvent.click(screen.getByRole("button", { name: "Discard Selected" }));
		await screen.findByRole("alertdialog", { name: "Discard 2 selected changes?" });
		expect(screen.getByText("This affects 1 unstaged change and 1 untracked change.")).toBeTruthy();
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
		expandPullRequestSection();
		fireEvent.change(screen.getByLabelText("PR title"), { target: { value: "Feature PR" } });
		fireEvent.click(screen.getByRole("button", { name: "Create PR" }));
		await screen.findByTestId("linked-pull-request");

		expect(document.querySelector('a[href="https://github.com/gannonh/pi-desktop/pull/1"]')).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Copy PR Link" }));

		await waitFor(() => {
			expect(writeText).toHaveBeenCalledWith({ text: "https://github.com/gannonh/pi-desktop/pull/1" });
		});
	});

	it("creates a pull request from the primary source-control action when the PR title is filled", async () => {
		const createPullRequest = vi.fn(async () => ({
			ok: true as const,
			data: { title: "Feature PR", url: "https://github.com/gannonh/pi-desktop/pull/1", state: "open" as const },
		}));
		installApi({
			createPullRequest,
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [],
					conflictOperation: "unknown",
					branch: "refs/heads/feature",
					upstreamStatus: testUpstreamStatus({ hasUpstream: true, upstreamName: "origin/feature", ahead: 0, behind: 0 }),
				} satisfies GitStatusPayload,
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("No uncommitted changes");
		expandPullRequestSection();
		fireEvent.change(screen.getByLabelText("PR title"), { target: { value: "Feature PR" } });
		fireEvent.click(screen.getAllByRole("button", { name: "Create PR" })[0]);

		await waitFor(() => {
			expect(createPullRequest).toHaveBeenCalledWith({ projectId: project.id, title: "Feature PR", body: "" });
		});
		expect(screen.getAllByText("Feature PR").length).toBeGreaterThan(0);
	});

	it("renders linked pull request summary with state badge and PR number", async () => {
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [],
					conflictOperation: "unknown",
					branch: "refs/heads/feature",
					upstreamStatus: testUpstreamStatus({ hasUpstream: true, upstreamName: "origin/feature", ahead: 0, behind: 0 }),
				} satisfies GitStatusPayload,
			})),
			getPullRequestInfo: vi.fn(async () => ({
				ok: true as const,
				data: {
					title: "Hosted review slice",
					url: "https://github.com/gannonh/pi-desktop/pull/155",
					state: "open" as const,
					number: 155,
				},
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByTestId("linked-pull-request");
		const linkedPullRequest = screen.getByTestId("linked-pull-request");
		expect(within(linkedPullRequest).getByText("Open")).toBeTruthy();
		expect(screen.getAllByText("Hosted review slice").length).toBeGreaterThan(0);
		expect(within(linkedPullRequest).getByText("#155")).toBeTruthy();
	});

	it("opens linked pull requests in the browser instead of rendering remote anchors", async () => {
		const openExternal = vi.fn(async () => ({ ok: true as const, data: { opened: true as const } }));
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [],
					conflictOperation: "unknown",
					branch: "refs/heads/feature",
					upstreamStatus: testUpstreamStatus({ hasUpstream: true, upstreamName: "origin/feature", ahead: 0, behind: 0 }),
				} satisfies GitStatusPayload,
			})),
			getPullRequestInfo: vi.fn(async () => ({
				ok: true as const,
				data: {
					title: "Hosted review slice",
					url: "https://github.com/gannonh/pi-desktop/pull/155",
					state: "open" as const,
					number: 155,
				},
			})),
		});
		window.piDesktop.app.openExternal = openExternal;
		render(<ChangesPanel project={project} isActive />);

		await screen.findByTestId("linked-pull-request");
		expect(document.querySelector('a[href="https://github.com/gannonh/pi-desktop/pull/155"]')).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Open in Browser" }));

		await waitFor(() => {
			expect(openExternal).toHaveBeenCalledWith({ url: "https://github.com/gannonh/pi-desktop/pull/155" });
		});
	});

	it("shows actionable gh auth remediation when GitHub is not authenticated", async () => {
		installApi({
			getGhAuthStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					ghAvailable: true,
					authenticated: false,
					account: null,
					remediation: "Run `gh auth login` in a terminal to connect GitHub.",
				},
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("README.md");
		expandPullRequestSection();
		await screen.findByText("Run `gh auth login` in a terminal to connect GitHub.");
	});

	it("shows create PR auth failures from gh", async () => {
		installApi({
			createPullRequest: vi.fn(async () => ({
				ok: false as const,
				error: {
					code: "source_control.gh_auth_required",
					message: "GitHub is not authenticated. Run `gh auth login` in a terminal and try again.",
				},
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("README.md");
		expandPullRequestSection();
		fireEvent.change(screen.getByLabelText("PR title"), { target: { value: "Feature PR" } });
		fireEvent.click(screen.getByRole("button", { name: "Create PR" }));

		await screen.findByText("GitHub is not authenticated. Run `gh auth login` in a terminal and try again.");
	});

	it("uses linked pull request state to disable duplicate create PR actions", async () => {
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [],
					conflictOperation: "unknown",
					branch: "refs/heads/feature",
					upstreamStatus: testUpstreamStatus({ hasUpstream: true, upstreamName: "origin/feature", ahead: 0, behind: 0 }),
				} satisfies GitStatusPayload,
			})),
			getPullRequestInfo: vi.fn(async () => ({
				ok: true as const,
				data: { title: "Existing PR", url: "https://github.com/gannonh/pi-desktop/pull/2", state: "open" as const },
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByTestId("linked-pull-request");
		await openSourceControlMenu();

		expect(screen.getAllByText("Pull request already linked.").length).toBeGreaterThan(0);
	});

	it("refreshes linked pull request state when the current branch changes", async () => {
		let currentStatus: GitStatusPayload = {
			entries: [],
			conflictOperation: "unknown",
			branch: "refs/heads/feature",
			upstreamStatus: testUpstreamStatus({ hasUpstream: true, upstreamName: "origin/feature", ahead: 1, behind: 0 }),
		};
		const getPullRequestInfo = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true as const,
				data: { title: "Existing PR", url: "https://github.com/gannonh/pi-desktop/pull/2", state: "open" as const },
			})
			.mockResolvedValue({
				ok: false as const,
				error: { code: "source_control.no_linked_pull_request", message: "No pull request found." },
			});
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: currentStatus,
			})),
			getPullRequestInfo,
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByTestId("linked-pull-request");
		currentStatus = {
			entries: [],
			conflictOperation: "unknown",
			branch: "refs/heads/release",
			upstreamStatus: testUpstreamStatus({ hasUpstream: true, upstreamName: "origin/release", ahead: 0, behind: 0 }),
		};
		fireEvent.click(screen.getByRole("button", { name: "Refresh source control status" }));

		await waitFor(() => {
			expect(screen.queryByTestId("linked-pull-request")).toBeNull();
			expect(getPullRequestInfo).toHaveBeenCalledTimes(2);
		});
		expandPullRequestSection();
		expect(screen.getByRole("button", { name: "Create PR" }).hasAttribute("disabled")).toBe(false);
	});

	it("shows source-control actions for a clean working tree", async () => {
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
					upstreamStatus: testUpstreamStatus({ hasUpstream: true, upstreamName: "origin/main", ahead: 1, behind: 0 }),
				} satisfies GitStatusPayload,
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("No uncommitted changes");

		expect(screen.getByText("origin/main")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Push" })).toBeTruthy();
		expandBranchCompareSection();
		expect(screen.getByRole("button", { name: "Compare" })).toBeTruthy();
	});

	it("closes the source-control action menu after selecting a dropdown action", async () => {
		const fetch = vi.fn(async () => ({ ok: true as const, data: {} }));
		installApi({
			fetch,
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
					upstreamStatus: testUpstreamStatus({ hasUpstream: true, upstreamName: "origin/main", ahead: 0, behind: 0 }),
				} satisfies GitStatusPayload,
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("No uncommitted changes");
		await openSourceControlMenu();

		const user = userEvent.setup();
		await user.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Fetch" }));

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith({ projectId: project.id });
			expect(screen.queryByRole("menu")).toBeNull();
		});
	});

	it("trims pull request titles before creating them", async () => {
		const createPullRequest = vi.fn(async () => ({
			ok: true as const,
			data: { title: "Feature PR", url: "https://github.com/gannonh/pi-desktop/pull/1", state: "open" as const },
		}));
		installApi({ createPullRequest });
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("README.md");
		expandPullRequestSection();
		fireEvent.change(screen.getByLabelText("PR title"), { target: { value: "  Feature PR  " } });
		fireEvent.click(screen.getByRole("button", { name: "Create PR" }));

		await waitFor(() => {
			expect(createPullRequest).toHaveBeenCalledWith({ projectId: project.id, title: "Feature PR", body: "" });
		});
	});

	it("rebases against the configured upstream instead of unsafe sync for a clean diverged branch", async () => {
		const rebaseFromBase = vi.fn(async () => ({ ok: true as const, data: {} }));
		const forcePushWithLease = vi.fn(async () => ({ ok: true as const, data: {} }));
		installApi({
			rebaseFromBase,
			forcePushWithLease,
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [],
					conflictOperation: "unknown",
					branch: "refs/heads/feature",
					upstreamStatus: testUpstreamStatus({ hasUpstream: true, upstreamName: "origin/feature", ahead: 1, behind: 1 }),
				} satisfies GitStatusPayload,
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("No uncommitted changes");

		expect(screen.getByText("1 ahead, 1 behind")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Rebase from Upstream" }));

		await waitFor(() => {
			expect(rebaseFromBase).toHaveBeenCalledWith({ projectId: project.id, baseRef: "origin/feature" });
		});

		await openSourceControlMenu();

		const menu = screen.getByRole("menu");
		expect(within(menu).getByRole("menuitem", { name: /Rebase from Upstream/ })).toBeTruthy();
		expectMenuItemDisabled(/Force Push with Lease/, false);
		expectMenuItemDisabled(/Sync/, true);
		expect(screen.getByText("Branch has diverged. Rebase or merge before syncing.")).toBeTruthy();
		const user = userEvent.setup();
		await user.click(within(menu).getByRole("menuitem", { name: /Force Push with Lease/ }));

		await waitFor(() => {
			expect(forcePushWithLease).toHaveBeenCalledWith({ projectId: project.id });
		});
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

		await openSourceControlMenu();
		expectMenuItemDisabled(/Publish/, true);
		await closeSourceControlMenu();

		await act(async () => {
			resolveStatus({
				ok: true,
				data: {
					entries: [],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
					upstreamStatus: testUpstreamStatus({ hasUpstream: false, ahead: 0, behind: 0, isConfigured: false }),
				},
			});
		});

		await screen.findByText("No uncommitted changes");
		expect(screen.getByRole("button", { name: "Publish" }).hasAttribute("disabled")).toBe(false);
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
			<ChangesPanelProvider projectId={project.id} defaultBaseRef="main" isActive={false}>
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

	it("shows conflict operation metadata and aborts merge operations", async () => {
		const abortConflict = vi.fn(async () => ({ ok: true as const, data: {} }));
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [{ path: "README.md", status: "modified", area: "unstaged", conflictKind: "both_modified" }],
					conflictOperation: "merge",
					branch: "refs/heads/main",
				} satisfies GitStatusPayload,
			})),
			abortConflict,
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("Merge in progress");
		expect(screen.getByText("Both modified")).toBeTruthy();
		expect(screen.getByText("Resolve before staging")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Abort merge" }));

		await waitFor(() => {
			expect(abortConflict).toHaveBeenCalledWith({ projectId: project.id, operation: "merge" });
		});
	});

	it("generates a commit message and fills the textarea on success", async () => {
		const generateCommitMessage = vi.fn(async () => ({
			ok: true as const,
			data: { message: "feat(changes): generated commit" },
		}));
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [{ path: "README.md", status: "modified", area: "staged" }],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
				} satisfies GitStatusPayload,
			})),
			generateCommitMessage,
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByLabelText("Commit message");
		fireEvent.click(screen.getByRole("button", { name: "Generate" }));

		await waitFor(() => {
			expect(generateCommitMessage).toHaveBeenCalled();
			expect((screen.getByLabelText("Commit message") as HTMLTextAreaElement).value).toBe(
				"feat(changes): generated commit",
			);
			expect(screen.getByText("Draft generated")).toBeTruthy();
		});
	});

	it("disables commit generation while loading and cancels in-flight requests", async () => {
		let resolveGeneration: ((value: { ok: true; data: { message: string } }) => void) | undefined;
		const generateCommitMessage = vi.fn(
			() =>
				new Promise<{ ok: true; data: { message: string } }>((resolve) => {
					resolveGeneration = resolve;
				}),
		);
		const cancelGeneration = vi.fn(async () => ({ ok: true as const, data: {} }));
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [{ path: "README.md", status: "modified", area: "staged" }],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
				} satisfies GitStatusPayload,
			})),
			generateCommitMessage,
			cancelGeneration,
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByLabelText("Commit message");
		fireEvent.click(screen.getByRole("button", { name: "Generate" }));

		expect(await screen.findByText("Generating commit message…")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Cancel generation" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Generate" })).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Cancel generation" }));
		await waitFor(() => {
			expect(cancelGeneration).toHaveBeenCalled();
		});

		resolveGeneration?.({ ok: true, data: { message: "stale draft" } });
		expect((screen.getByLabelText("Commit message") as HTMLTextAreaElement).value).toBe("");
	});

	it("shows commit generation errors from the main process", async () => {
		installApi({
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [{ path: "README.md", status: "modified", area: "staged" }],
					conflictOperation: "unknown",
					branch: "refs/heads/main",
				} satisfies GitStatusPayload,
			})),
			generateCommitMessage: vi.fn(async () => ({
				ok: false as const,
				error: { code: "source_control.operation_failed", message: "No Pi model is configured for this project." },
			})),
		});
		render(<ChangesPanel project={project} isActive />);

		await screen.findByLabelText("Commit message");
		fireEvent.click(screen.getByRole("button", { name: "Generate" }));

		await waitFor(() => {
			expect(screen.getByText("No Pi model is configured for this project.")).toBeTruthy();
		});
	});

	it("generates pull request fields and surfaces loading and error states", async () => {
		const generatePullRequestFields = vi.fn(async () => ({
			ok: true as const,
			data: { title: "Generated PR", body: "Generated body" },
		}));
		installApi({ generatePullRequestFields });
		render(<ChangesPanel project={project} isActive />);

		await screen.findByText("README.md");
		expandPullRequestSection();
		await screen.findByLabelText("PR title");
		fireEvent.click(screen.getByRole("button", { name: "Generate with AI" }));

		await waitFor(() => {
			expect(generatePullRequestFields).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: project.id, baseRef: "main", headRef: "main" }),
			);
			expect((screen.getByLabelText("PR title") as HTMLInputElement).value).toBe("Generated PR");
			expect((screen.getByLabelText("PR body") as HTMLTextAreaElement).value).toBe("Generated body");
		});
	});
});
