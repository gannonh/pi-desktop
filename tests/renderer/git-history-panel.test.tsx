// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { GitCommitFilesResult } from "../../src/shared/source-control/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHistoryPanel } from "../../src/renderer/changes-panel/GitHistoryPanel";
import { ChangesPanelProvider } from "../../src/renderer/changes-panel/changes-panel-context";
import type { PiDesktopApi } from "../../src/shared/preload-api";
import { createProjectId } from "../../src/shared/project-state";

const projectId = createProjectId("/tmp/pi-history-project");

const historyEntry = {
	sha: "a".repeat(40),
	shortSha: "aaaaaaa",
	subject: "Initial commit",
	author: "Test Author",
	authorDate: "2026-06-08T12:00:00-07:00",
	refs: ["main"],
};

const installApi = (overrides: Partial<PiDesktopApi["sourceControl"]> = {}) => {
	const getHistory = vi.fn(async () => ({
		ok: true as const,
		data: {
			entries: [historyEntry],
			incomingCount: 2,
			outgoingCount: 1,
			upstreamName: "origin/main",
		},
	}));
	const getCommitFiles = vi.fn(async () => ({
		ok: true as const,
		data: {
			commitRef: historyEntry.sha,
			files: [{ path: "README.md", status: "modified" as const }],
		},
	}));
	const getDiff = vi.fn(async () => ({
		ok: true as const,
		data: {
			kind: "text" as const,
			path: "README.md",
			title: "README.md (aaaaaaa)",
			diffKind: "commit" as const,
			patch: "@@\n-old\n+new\n",
		},
	}));

	window.piDesktop = {
		...window.piDesktop,
		sourceControl: {
			getStatus: vi.fn(async () => ({
				ok: true as const,
				data: { entries: [], conflictOperation: "unknown" as const },
			})),
			checkIgnored: vi.fn(),
			stage: vi.fn(),
			unstage: vi.fn(),
			discard: vi.fn(),
			bulkStage: vi.fn(),
			bulkUnstage: vi.fn(),
			bulkDiscard: vi.fn(),
			initializeRepository: vi.fn(),
			commit: vi.fn(),
			getUpstreamStatus: vi.fn(),
			fetch: vi.fn(),
			push: vi.fn(),
			forcePushWithLease: vi.fn(),
			pull: vi.fn(),
			sync: vi.fn(),
			fastForward: vi.fn(),
			publish: vi.fn(),
			rebaseFromBase: vi.fn(),
			getBranchCompare: vi.fn(),
			abortConflict: vi.fn(),
			createPullRequest: vi.fn(),
			getPullRequestInfo: vi.fn(),
			getHistory,
			getCommitFiles,
			getDiff,
			...overrides,
		},
	} as PiDesktopApi;

	return { getHistory, getCommitFiles, getDiff };
};

describe("GitHistoryPanel", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("loads history and shows incoming/outgoing boundaries", async () => {
		const { getHistory } = installApi();
		render(
			<ChangesPanelProvider projectId={projectId} isActive>
				<GitHistoryPanel />
			</ChangesPanelProvider>,
		);

		await waitFor(() => {
			expect(getHistory).toHaveBeenCalledWith({ projectId });
			expect(screen.getByTestId("history-incoming-boundary").textContent).toContain("2 incoming");
			expect(screen.getByText("Initial commit")).toBeTruthy();
		});
	});

	it("loads commit files and requests a commit diff", async () => {
		const { getCommitFiles, getDiff } = installApi();

		render(
			<ChangesPanelProvider projectId={projectId} isActive>
				<GitHistoryPanel />
			</ChangesPanelProvider>,
		);

		await waitFor(() => {
			expect(screen.getByText("Initial commit")).toBeTruthy();
		});

		fireEvent.click(screen.getByText("Initial commit"));

		await waitFor(() => {
			expect(getCommitFiles).toHaveBeenCalledWith({ projectId, commitRef: historyEntry.sha });
			expect(screen.getByRole("button", { name: /README\.md/ })).toBeTruthy();
		});

		fireEvent.click(screen.getByRole("button", { name: /README\.md/ }));

		await waitFor(() => {
			expect(getDiff).toHaveBeenCalledWith({
				projectId,
				relativePath: "README.md",
				kind: "commit",
				commitRef: historyEntry.sha,
			});
		});
	});

	it("ignores stale commit-file responses when selection changes quickly", async () => {
		const secondEntry = {
			...historyEntry,
			sha: "b".repeat(40),
			shortSha: "bbbbbbb",
			subject: "Second commit",
		};
		let resolveFirst: ((value: { ok: true; data: GitCommitFilesResult }) => void) | undefined;
		const getCommitFiles = vi.fn(({ commitRef }: { projectId: string; commitRef: string }) => {
			if (commitRef === historyEntry.sha) {
				return new Promise<{ ok: true; data: GitCommitFilesResult }>((resolve) => {
					resolveFirst = resolve;
				});
			}
			return Promise.resolve({
				ok: true as const,
				data: { commitRef, files: [{ path: "second.txt", status: "added" as const }] },
			});
		});
		installApi({
			getHistory: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [secondEntry, historyEntry],
					incomingCount: 0,
					outgoingCount: 0,
				},
			})),
			getCommitFiles,
		});

		render(
			<ChangesPanelProvider projectId={projectId} isActive>
				<GitHistoryPanel />
			</ChangesPanelProvider>,
		);

		await waitFor(() => {
			expect(screen.getByText("Initial commit")).toBeTruthy();
			expect(screen.getByText("Second commit")).toBeTruthy();
		});

		fireEvent.click(screen.getByText("Initial commit"));
		fireEvent.click(screen.getByText("Second commit"));

		await waitFor(() => {
			expect(screen.getByRole("button", { name: /second\.txt/ })).toBeTruthy();
		});

		resolveFirst?.({
			ok: true,
			data: { commitRef: historyEntry.sha, files: [{ path: "README.md", status: "modified" }] },
		});
		await act(async () => {
			await Promise.resolve();
		});

		await waitFor(() => {
			expect(screen.queryByRole("button", { name: /README\.md/ })).toBeNull();
			expect(screen.getByRole("button", { name: /second\.txt/ })).toBeTruthy();
		});
	});
});
