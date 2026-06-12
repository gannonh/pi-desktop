import {
	ChevronDown,
	ChevronRight,
	Minus,
	MoreHorizontal,
	Plus,
	RefreshCw,
	RotateCcw,
	Settings,
	Undo2,
	WandSparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { ProjectStateViewResult } from "../../shared/ipc";
import { resolveProjectDefaultBaseRef, type ProjectRecord } from "../../shared/project-state";
import type { GitStatusPayload } from "../../shared/source-control/schemas";
import type {
	GitBranchCompareResult,
	GitConflictKind,
	GitConflictOperation,
	GitStagingArea,
	GitStatusEntry,
	SourceControlPullRequestInfo,
} from "../../shared/source-control/types";
import { Button } from "../components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { useOptionalFileWorkspace } from "../file-workspace/use-optional-file-workspace";
import { ChangesPanelProvider, useChangesPanel } from "./changes-panel-context";
import { GitHistoryPanel } from "./GitHistoryPanel";
import {
	resolveSourceControlActions,
	type SourceControlPrimaryActionId,
} from "./source-control-primary-action-resolver";
import {
	buildGitStatusSourceControlTree,
	compactSourceControlTree,
	flattenSourceControlTree,
	type SourceControlTreeNode,
} from "./source-control-tree";
import { requestCommitRecoverySession } from "../session/commit-recovery-session-bridge";
import {
	buildCommitFailureRecoveryPrompt,
	stagedFilesForRecovery,
	summarizeCommitFailure,
} from "./commit-failure-recovery";
import { CommitFailureRecoveryDialog } from "./CommitFailureRecoveryDialog";
import { GitSettingsDialog } from "./GitSettingsDialog";
import {
	SECTION_LABELS,
	SECTION_ORDER,
	STATUS_LABELS,
	STATUS_TITLES,
	type SourceControlSection,
} from "./status-display";
import { LinkedPullRequestSummary } from "./linked-pull-request-summary";
import { getPullRequestStateDisplay } from "./pull-request-state-display";
import { resolvePullRequestCompareRefs } from "./pull-request-compare-refs";
import { useSourceControlGeneration } from "./use-source-control-generation";
import { Badge } from "../components/ui/badge";
import {
	COMMIT_SECTION_MAX_HEIGHT,
	COMMIT_SECTION_MIN_HEIGHT,
	readChangesPanelLayout,
	type ChangesPanelLayout,
	type WorkflowSectionId,
	writeChangesPanelLayout,
} from "./changes-panel-layout";
import { SectionResizeHandle } from "./SectionResizeHandle";
import { WorkflowCollapsibleSection } from "./WorkflowCollapsibleSection";

type ChangesPanelProps = {
	project: ProjectRecord | null;
	isActive: boolean;
	onProjectState?: (result: ProjectStateViewResult) => void;
};

const groupEntriesByArea = (entries: GitStatusEntry[]): Record<GitStagingArea, GitStatusEntry[]> => {
	const grouped: Record<GitStagingArea, GitStatusEntry[]> = {
		staged: [],
		unstaged: [],
		untracked: [],
	};
	for (const entry of entries) {
		grouped[entry.area].push(entry);
	}
	return grouped;
};

const CONFLICT_KIND_LABELS = {
	both_modified: "Both modified",
	both_added: "Both added",
	both_deleted: "Both deleted",
	added_by_us: "Added by us",
	added_by_them: "Added by them",
	deleted_by_us: "Deleted by us",
	deleted_by_them: "Deleted by them",
} satisfies Record<GitConflictKind, string>;

const conflictCompatibilityLabel = (entry: GitStatusEntry): string | null => {
	if (!entry.conflictKind) {
		return null;
	}
	if (entry.status === "deleted") {
		return "Choose delete or restore";
	}
	return "Resolve before staging";
};

const formatBranchLabel = (status: GitStatusPayload | null): string | null => {
	const branch = status?.branch;
	if (branch) {
		return branch.startsWith("refs/heads/") ? branch.slice("refs/heads/".length) : branch;
	}
	return status?.head ? `detached ${status.head.slice(0, 7)}` : null;
};

const formatUpstreamSummary = (upstream: GitStatusPayload["upstreamStatus"]): string => {
	if (!upstream) {
		return "Loading upstream status…";
	}
	if (!upstream.hasUpstream) {
		return "No upstream configured";
	}
	return `${upstream.upstreamName} · ${upstream.ahead}↑ ${upstream.behind}↓`;
};

function SourceControlTreeRow({
	node,
	collapsedDirectoryKeys,
	onToggleDirectory,
	onOpenDiff,
	onStage,
	onUnstage,
	onDiscard,
	selected,
	onToggleSelected,
}: {
	node: SourceControlTreeNode;
	collapsedDirectoryKeys: ReadonlySet<string>;
	onToggleDirectory: (key: string) => void;
	onOpenDiff: (entry: GitStatusEntry) => void;
	onStage: (entry: GitStatusEntry) => void;
	onUnstage: (entry: GitStatusEntry) => void;
	onDiscard: (entry: GitStatusEntry) => void;
	selected: boolean;
	onToggleSelected: (entry: GitStatusEntry) => void;
}) {
	if (node.type === "directory") {
		const collapsed = collapsedDirectoryKeys.has(node.key);
		return (
			<button
				type="button"
				className="changes-panel__tree-row changes-panel__tree-row--directory"
				style={{ paddingLeft: `${node.depth * 12 + 8}px` }}
				onClick={() => onToggleDirectory(node.key)}
			>
				{collapsed ? (
					<ChevronRight aria-hidden className="changes-panel__tree-chevron-icon" />
				) : (
					<ChevronDown aria-hidden className="changes-panel__tree-chevron-icon" />
				)}
				<span className="changes-panel__tree-name">{node.name}</span>
				<span className="changes-panel__tree-count">{node.fileCount}</span>
			</button>
		);
	}

	const entry = node.entry;
	return (
		<div
			className="changes-panel__tree-row changes-panel__tree-row--file"
			style={{ paddingLeft: `${node.depth * 12 + 24}px` }}
		>
			<input
				type="checkbox"
				aria-label={`Select ${entry.path}`}
				checked={selected}
				onChange={() => onToggleSelected(entry)}
			/>
			<span className="changes-panel__status-badge" title={STATUS_TITLES[entry.status]}>
				{STATUS_LABELS[entry.status]}
			</span>
			<button
				type="button"
				className="changes-panel__tree-name changes-panel__diff-open"
				aria-label={`Open diff for ${entry.path}`}
				onClick={() => onOpenDiff(entry)}
			>
				{node.name}
			</button>
			{entry.added !== undefined || entry.removed !== undefined ? (
				<span className="changes-panel__line-stats">
					{entry.added ? `+${entry.added}` : null}
					{entry.removed ? `−${entry.removed}` : null}
				</span>
			) : null}
			{entry.conflictKind ? (
				<span className="changes-panel__conflict-metadata">
					<span className="changes-panel__conflict-kind">{CONFLICT_KIND_LABELS[entry.conflictKind]}</span>
					<span className="changes-panel__conflict-compatibility">{conflictCompatibilityLabel(entry)}</span>
				</span>
			) : null}
			<span className="changes-panel__row-actions">
				{entry.area === "staged" ? (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="changes-panel__row-action-icon"
						aria-label={`Unstage ${entry.path}`}
						title="Unstage"
						onClick={() => onUnstage(entry)}
					>
						<Minus aria-hidden />
					</Button>
				) : (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="changes-panel__row-action-icon"
						aria-label={`Stage ${entry.path}`}
						title="Stage"
						onClick={() => onStage(entry)}
					>
						<Plus aria-hidden />
					</Button>
				)}
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="changes-panel__row-action-icon"
					aria-label={`Discard changes to ${entry.path}`}
					title="Discard"
					onClick={() => onDiscard(entry)}
				>
					<Undo2 aria-hidden />
				</Button>
			</span>
		</div>
	);
}

const selectionKey = (entry: GitStatusEntry) => `${entry.area}:${entry.path}`;

const AREA_DISCARD_LABELS = {
	staged: "staged",
	unstaged: "unstaged",
	untracked: "untracked",
} satisfies Record<GitStagingArea, string>;

const pluralize = (count: number, singular: string, plural = `${singular}s`) => (count === 1 ? singular : plural);

const joinList = (items: readonly string[]) => {
	if (items.length <= 1) {
		return items[0] ?? "";
	}
	if (items.length === 2) {
		return `${items[0]} and ${items[1]}`;
	}
	return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

const formatBulkDiscardAreaSummary = (entries: readonly GitStatusEntry[]) => {
	const counts = entries.reduce(
		(accumulator, entry) => {
			accumulator[entry.area] += 1;
			return accumulator;
		},
		{ staged: 0, unstaged: 0, untracked: 0 } satisfies Record<GitStagingArea, number>,
	);
	const parts = (Object.keys(counts) as GitStagingArea[])
		.filter((area) => counts[area] > 0)
		.map((area) => `${counts[area]} ${AREA_DISCARD_LABELS[area]} ${pluralize(counts[area], "change")}`);
	return joinList(parts);
};

const getDiscardConfirmation = (
	entries: readonly GitStatusEntry[],
): { title: string; description: string; actionLabel: string } => {
	if (entries.length !== 1) {
		return {
			title: `Discard ${entries.length} selected changes?`,
			description: `This affects ${formatBulkDiscardAreaSummary(entries)}.`,
			actionLabel: "Discard Changes",
		};
	}

	const entry = entries[0];
	if (!entry) {
		return {
			title: "Discard selected changes?",
			description: "This will discard the selected changes.",
			actionLabel: "Discard Changes",
		};
	}
	if (entry.area === "untracked") {
		return {
			title: `Delete untracked file ${entry.path}?`,
			description: "This file is not tracked by git. Deleting it cannot be undone by git.",
			actionLabel: "Delete File",
		};
	}
	if (entry.status === "added") {
		return {
			title: `Delete newly-added file ${entry.path}?`,
			description: "This file was added to git. Discarding it will remove it from the working tree.",
			actionLabel: "Delete File",
		};
	}
	if (entry.status === "deleted") {
		return {
			title: `Restore deleted file ${entry.path}?`,
			description: "This will restore the tracked file from git.",
			actionLabel: "Restore File",
		};
	}
	return {
		title: `Discard changes for ${entry.path}?`,
		description: "This will restore the tracked file to its previous state.",
		actionLabel: "Discard Changes",
	};
};

const conflictLabel = (operation: GitConflictOperation): string | null => {
	switch (operation) {
		case "merge":
			return "Merge in progress";
		case "rebase":
			return "Rebase in progress";
		case "cherry-pick":
			return "Cherry-pick in progress";
		case "unknown":
			return null;
		default:
			return null;
	}
};

const conflictButtonLabel = (operation: GitConflictOperation): string => {
	switch (operation) {
		case "merge":
			return "Abort merge";
		case "rebase":
			return "Abort rebase";
		case "cherry-pick":
			return "Abort cherry-pick";
		default:
			return "Abort operation";
	}
};

function CommitArea({ onCreatePullRequestRequested }: { onCreatePullRequestRequested: () => void }) {
	const { projectId, status, refresh, pullRequest } = useChangesPanel();
	const [message, setMessage] = useState("");
	const [feedback, setFeedback] = useState<string | null>(null);
	const [commitFailureMessage, setCommitFailureMessage] = useState<string | null>(null);
	const [recoveryError, setRecoveryError] = useState<string | null>(null);
	const [isCommitting, setIsCommitting] = useState(false);
	const [isRecovering, setIsRecovering] = useState(false);
	const stagedCount = status?.entries.filter((entry) => entry.area === "staged").length ?? 0;
	const canCommit = Boolean(projectId && message.trim() && stagedCount > 0 && !isCommitting);
	const commitFailurePresentation = commitFailureMessage ? summarizeCommitFailure(commitFailureMessage) : null;
	const commitGeneration = useSourceControlGeneration({
		run: (requestId) => {
			if (!projectId) {
				return Promise.resolve({
					ok: false as const,
					error: { code: "source_control.operation_failed", message: "Select a project first." },
				});
			}
			return window.piDesktop.sourceControl.generateCommitMessage({ projectId, requestId });
		},
		onSuccess: (data) => {
			setMessage(data.message);
			setCommitFailureMessage(null);
			setRecoveryError(null);
		},
	});

	const commit = async () => {
		if (!projectId || !canCommit) {
			return;
		}
		setIsCommitting(true);
		setCommitFailureMessage(null);
		setRecoveryError(null);
		setFeedback(null);
		const commitMessage = message.trim();
		const result = await window.piDesktop.sourceControl.commit({ projectId, message: commitMessage });
		setIsCommitting(false);
		if (!result.ok) {
			setCommitFailureMessage(result.error.message);
			return;
		}
		setFeedback(`Committed ${result.data.summary}`);
		setMessage("");
		await refresh();
	};

	const dismissCommitFailure = () => {
		if (isRecovering) {
			return;
		}
		setCommitFailureMessage(null);
		setRecoveryError(null);
	};

	const recoverFromCommitFailure = async () => {
		if (!projectId || !commitFailureMessage) {
			return;
		}
		setRecoveryError(null);
		setIsRecovering(true);
		const prompt = buildCommitFailureRecoveryPrompt({
			commitMessage: message.trim(),
			failureOutput: commitFailureMessage,
			changedFiles: stagedFilesForRecovery(status?.entries ?? []),
		});
		const started = await requestCommitRecoverySession({ projectId, prompt });
		setIsRecovering(false);
		if (!started) {
			setRecoveryError("Unable to start Pi recovery for this project.");
			return;
		}
		setCommitFailureMessage(null);
	};

	return (
		<>
			<CommitFailureRecoveryDialog
				open={Boolean(commitFailurePresentation)}
				presentation={commitFailurePresentation ?? { summary: "Commit failed.", details: "" }}
				isRecovering={isRecovering}
				recoveryError={recoveryError}
				onDismiss={dismissCommitFailure}
				onRecover={() => void recoverFromCommitFailure()}
			/>
			<form
				className="changes-panel__commit"
				onSubmit={(event) => {
					event.preventDefault();
					void commit();
				}}
			>
				<div className="changes-panel__commit-input-row">
					<textarea
						className="changes-panel__commit-input"
						aria-label="Commit message"
						placeholder="Commit message"
						value={message}
						onChange={(event) => setMessage(event.target.value)}
						rows={1}
					/>
					{commitGeneration.isGenerating ? (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="changes-panel__commit-generate"
							aria-label="Cancel commit message generation"
							onClick={() => void commitGeneration.cancel()}
						>
							<RotateCcw aria-hidden />
						</Button>
					) : (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="changes-panel__commit-generate"
							aria-label="Generate commit message"
							disabled={stagedCount === 0}
							title={stagedCount === 0 ? "Stage changes before generating a commit message." : undefined}
							onClick={() => void commitGeneration.generate()}
						>
							<WandSparkles aria-hidden />
						</Button>
					)}
				</div>
				{commitGeneration.isGenerating ? (
					<p className="changes-panel__feedback" aria-live="polite">
						Generating commit message…
					</p>
				) : null}
				{commitGeneration.successMessage ? (
					<p className="changes-panel__feedback">{commitGeneration.successMessage}</p>
				) : null}
				{commitGeneration.error ? <p className="changes-panel__error">{commitGeneration.error}</p> : null}
				{feedback ? <p className="changes-panel__feedback">{feedback}</p> : null}
				<SourceControlActions
					commitMessage={message}
					isCommitBusy={isCommitting}
					onCommit={() => void commit()}
					pullRequest={pullRequest}
					onCreatePullRequestRequested={onCreatePullRequestRequested}
				/>
			</form>
		</>
	);
}

function SourceControlActions({
	commitMessage,
	isCommitBusy,
	onCommit,
	pullRequest,
	onCreatePullRequestRequested,
}: {
	commitMessage: string;
	isCommitBusy: boolean;
	onCommit: () => void;
	pullRequest: SourceControlPullRequestInfo | null;
	onCreatePullRequestRequested: () => void;
}) {
	const { projectId, status, refresh, defaultBaseRef } = useChangesPanel();
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busyActionId, setBusyActionId] = useState<SourceControlPrimaryActionId | null>(null);
	const upstream = status?.upstreamStatus;
	const actions = resolveSourceControlActions({
		projectId,
		status,
		commitMessage,
		isBusy: Boolean(busyActionId) || isCommitBusy,
		pullRequest,
	});
	const divergedUpstreamName =
		upstream?.hasUpstream && upstream.ahead > 0 && upstream.behind > 0 ? upstream.upstreamName : undefined;

	const run = async (
		label: string,
		operation: () => Promise<{ ok: true; data: unknown } | { ok: false; error: { message: string } }>,
	) => {
		setMessage(null);
		setError(null);
		const result = await operation();
		if (!result.ok) {
			setError(result.error.message);
			return;
		}
		setMessage(`${label} complete`);
		await refresh();
	};

	if (!projectId) {
		return null;
	}

	const stageablePaths = () =>
		status?.entries.filter((entry) => entry.area !== "staged").map((entry) => entry.path) ?? [];

	const runAction = async (id: SourceControlPrimaryActionId) => {
		if (!projectId || busyActionId) {
			return;
		}
		if (id === "commit" || id === "commitStaged") {
			onCommit();
			return;
		}
		if (id === "createPullRequest") {
			onCreatePullRequestRequested();
			return;
		}
		if (id === "resolveConflicts") {
			setError("Resolve conflicts before source control actions.");
			return;
		}

		setBusyActionId(id);
		try {
			switch (id) {
				case "stageAll":
					await run("Stage all", () =>
						window.piDesktop.sourceControl.bulkStage({
							projectId,
							relativePaths: stageablePaths(),
						}),
					);
					break;
				case "fetch":
					await run("Fetch", () => window.piDesktop.sourceControl.fetch({ projectId }));
					break;
				case "pull":
					await run("Pull", () => window.piDesktop.sourceControl.pull({ projectId }));
					break;
				case "push":
					await run("Push", () => window.piDesktop.sourceControl.push({ projectId }));
					break;
				case "forcePushWithLease":
					await run("Force push with lease", () =>
						window.piDesktop.sourceControl.forcePushWithLease({ projectId }),
					);
					break;
				case "sync":
					await run("Sync", () => window.piDesktop.sourceControl.sync({ projectId }));
					break;
				case "publish":
					await run("Publish", () => window.piDesktop.sourceControl.publish({ projectId }));
					break;
				case "fastForward":
					await run("Fast-forward", () => window.piDesktop.sourceControl.fastForward({ projectId }));
					break;
				case "rebaseFromBase":
					await run("Rebase", () =>
						window.piDesktop.sourceControl.rebaseFromBase({
							projectId,
							baseRef: divergedUpstreamName ?? defaultBaseRef,
						}),
					);
					break;
				default:
					break;
			}
		} finally {
			setBusyActionId(null);
		}
	};

	const primaryLabel =
		isCommitBusy && (actions.primary.id === "commit" || actions.primary.id === "commitStaged")
			? "Committing…"
			: actions.primary.label;

	const upstreamSummary = formatUpstreamSummary(upstream);

	return (
		<div className="changes-panel__remote">
			<div className="changes-panel__remote-actions">
				<Button
					type="button"
					variant="secondary"
					size="sm"
					disabled={Boolean(actions.primary.disabledReason)}
					title={actions.primary.disabledReason}
					onClick={() => void runAction(actions.primary.id)}
				>
					{primaryLabel}
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button type="button" variant="ghost" size="icon" aria-label="More source control actions">
							<MoreHorizontal aria-hidden />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="changes-panel__action-dropdown">
						{actions.dropdown.map((action) => (
							<DropdownMenuItem
								key={action.id}
								disabled={Boolean(action.disabledReason)}
								title={action.disabledReason}
								onSelect={() => void runAction(action.id)}
							>
								<span className="changes-panel__action-menu-item">
									<span>{action.label}</span>
									{action.disabledReason ? (
										<span className="changes-panel__action-menu-reason">{action.disabledReason}</span>
									) : null}
								</span>
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<p className="changes-panel__remote-summary" title={upstreamSummary}>
				{upstreamSummary}
			</p>
			{message ? <p className="changes-panel__feedback">{message}</p> : null}
			{error ? <p className="changes-panel__error changes-panel__error--inline">{error}</p> : null}
		</div>
	);
}

function BranchCompareArea() {
	const { projectId, defaultBaseRef } = useChangesPanel();
	const fileWorkspace = useOptionalFileWorkspace();
	const [baseRef, setBaseRef] = useState(defaultBaseRef);
	const [headRef, setHeadRef] = useState("HEAD");
	const [compare, setCompare] = useState<GitBranchCompareResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setBaseRef(defaultBaseRef);
	}, [defaultBaseRef]);

	const runCompare = async () => {
		if (!projectId) {
			return;
		}
		setError(null);
		const result = await window.piDesktop.sourceControl.getBranchCompare({ projectId, baseRef, headRef });
		if (!result.ok) {
			setCompare(null);
			setError(result.error.message);
			return;
		}
		setCompare(result.data);
	};

	const openBranchDiff = async (relativePath: string) => {
		if (!projectId || !compare) {
			return;
		}
		const result = await window.piDesktop.sourceControl.getDiff({
			projectId,
			relativePath,
			kind: "branch",
			baseRef: compare.baseRef,
			headRef: compare.headRef,
		});
		if (!result.ok) {
			setError(result.error.message);
			return;
		}
		fileWorkspace?.openDiff({
			relativePath,
			kind: "branch",
			suffix: `${compare.baseRef}...${compare.headRef}`,
			diff: result.data,
			diffContext: { compareRefs: { base: compare.baseRef, head: compare.headRef } },
		});
	};

	if (!projectId) {
		return null;
	}

	return (
		<div className="changes-panel__compare">
			<div className="changes-panel__compare-controls">
				<label>
					Base
					<input value={baseRef} onChange={(event) => setBaseRef(event.target.value)} />
				</label>
				<label>
					Head
					<input value={headRef} onChange={(event) => setHeadRef(event.target.value)} />
				</label>
				<Button type="button" variant="secondary" size="sm" onClick={() => void runCompare()}>
					Compare
				</Button>
			</div>
			{compare ? (
				<div className="changes-panel__compare-result">
					<p>
						{compare.ahead} ahead, {compare.behind} behind
					</p>
					{compare.files.map((file) => (
						<button
							key={`${file.status}:${file.path}`}
							type="button"
							onClick={() => void openBranchDiff(file.path)}
						>
							{STATUS_LABELS[file.status]} {file.path}
						</button>
					))}
				</div>
			) : null}
			{error ? <p className="changes-panel__error">{error}</p> : null}
		</div>
	);
}

function PullRequestArea({ focusRequestCount }: { focusRequestCount: number }) {
	const { projectId, status, defaultBaseRef, pullRequest, ghAuthStatus, pullRequestLookupError, setPullRequest } =
		useChangesPanel();
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const titleInputRef = useRef<HTMLInputElement | null>(null);
	const handledFocusRequestCount = useRef(0);
	const compareRefs = resolvePullRequestCompareRefs(status, defaultBaseRef);
	const pullRequestGeneration = useSourceControlGeneration({
		run: (requestId) => {
			if (!projectId) {
				return Promise.resolve({
					ok: false as const,
					error: { code: "source_control.operation_failed", message: "Select a project first." },
				});
			}
			return window.piDesktop.sourceControl.generatePullRequestFields({
				projectId,
				requestId,
				baseRef: compareRefs.baseRef,
				headRef: compareRefs.headRef,
			});
		},
		onSuccess: (data) => {
			setTitle(data.title);
			setBody(data.body);
			setError(null);
		},
	});

	const create = useCallback(async () => {
		if (!projectId) {
			return;
		}
		setError(null);
		setMessage(null);
		const result = await window.piDesktop.sourceControl.createPullRequest({
			projectId,
			title: title.trim(),
			body,
		});
		if (!result.ok) {
			setError(result.error.message);
			return;
		}
		setPullRequest(result.data);
	}, [body, projectId, setPullRequest, title]);

	useEffect(() => {
		if (focusRequestCount <= handledFocusRequestCount.current) {
			return;
		}
		handledFocusRequestCount.current = focusRequestCount;
		if (title.trim()) {
			void create();
			return;
		}
		setError(null);
		titleInputRef.current?.focus();
	}, [create, focusRequestCount, title]);

	const copyPullRequestUrl = async () => {
		if (!pullRequest?.url) {
			return;
		}
		const result = await window.piDesktop.clipboard.writeText({ text: pullRequest.url });
		if (!result.ok) {
			setError(result.error.message);
			return;
		}
		setError(null);
		setMessage("PR link copied");
	};

	const openPullRequestInBrowser = async () => {
		if (!pullRequest?.url) {
			return;
		}
		const result = await window.piDesktop.app.openExternal({ url: pullRequest.url });
		if (!result.ok) {
			setError(result.error.message);
			return;
		}
		setError(null);
		setMessage("Opened pull request in browser");
	};

	const ghRemediation = ghAuthStatus?.remediation ?? pullRequestLookupError;

	if (!projectId) {
		return null;
	}

	return (
		<div className="changes-panel__pr">
			{ghRemediation ? (
				<p className="changes-panel__gh-auth-notice" role="status">
					{ghRemediation}
				</p>
			) : null}
			{pullRequest ? (
				<LinkedPullRequestSummary
					pullRequest={pullRequest}
					onOpenInBrowser={() => void openPullRequestInBrowser()}
					onCopyLink={() => void copyPullRequestUrl()}
				/>
			) : null}
			<label>
				PR title
				<input ref={titleInputRef} value={title} onChange={(event) => setTitle(event.target.value)} />
			</label>
			<label>
				PR body
				<textarea value={body} rows={3} onChange={(event) => setBody(event.target.value)} />
			</label>
			<div className="changes-panel__commit-actions">
				<Button type="button" variant="secondary" size="sm" disabled={!title.trim()} onClick={() => void create()}>
					Create PR
				</Button>
				{pullRequestGeneration.isGenerating ? (
					<Button type="button" variant="ghost" size="sm" onClick={() => void pullRequestGeneration.cancel()}>
						Cancel generation
					</Button>
				) : (
					<Button type="button" variant="ghost" size="sm" onClick={() => void pullRequestGeneration.generate()}>
						Generate with AI
					</Button>
				)}
			</div>
			{pullRequestGeneration.isGenerating ? (
				<p className="changes-panel__feedback" aria-live="polite">
					Generating PR title and body…
				</p>
			) : null}
			{pullRequestGeneration.successMessage ? (
				<p className="changes-panel__feedback">{pullRequestGeneration.successMessage}</p>
			) : null}
			{pullRequestGeneration.error ? <p className="changes-panel__error">{pullRequestGeneration.error}</p> : null}
			{message ? <p className="changes-panel__feedback">{message}</p> : null}
			{error ? <p className="changes-panel__error">{error}</p> : null}
		</div>
	);
}

function ChangesPanelBody() {
	const { projectId, status, statusError, isGitRepo, refresh, initializeRepository, pullRequest } = useChangesPanel();
	const fileWorkspace = useOptionalFileWorkspace();
	const [collapsedSections, setCollapsedSections] = useState<ReadonlySet<SourceControlSection>>(new Set());
	const [layout, setLayout] = useState<ChangesPanelLayout>(() => readChangesPanelLayout());
	const [collapsedTreeDirs, setCollapsedTreeDirs] = useState<ReadonlySet<string>>(new Set());
	const [operationError, setOperationError] = useState<string | null>(null);
	const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(new Set());
	const [pendingDiscardEntries, setPendingDiscardEntries] = useState<readonly GitStatusEntry[]>([]);
	const [createPullRequestRequestCount, setCreatePullRequestRequestCount] = useState(0);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	useEffect(() => {
		writeChangesPanelLayout(layout);
	}, [layout]);

	useEffect(() => {
		if (pullRequest) {
			setLayout((current) => ({
				...current,
				expanded: { ...current.expanded, pullRequest: true },
			}));
		}
	}, [pullRequest]);

	useEffect(() => {
		if (createPullRequestRequestCount > 0) {
			setLayout((current) => ({
				...current,
				expanded: { ...current.expanded, pullRequest: true },
			}));
		}
	}, [createPullRequestRequestCount]);

	const grouped = useMemo(() => groupEntriesByArea(status?.entries ?? []), [status?.entries]);
	const selectedEntries = useMemo(
		() => (status?.entries ?? []).filter((entry) => selectedKeys.has(selectionKey(entry))),
		[status?.entries, selectedKeys],
	);
	const selectedStageableEntries = useMemo(
		() => selectedEntries.filter((entry) => entry.area !== "staged"),
		[selectedEntries],
	);
	const selectedStagedEntries = useMemo(
		() => selectedEntries.filter((entry) => entry.area === "staged"),
		[selectedEntries],
	);

	const visibleSections = useMemo(
		() =>
			SECTION_ORDER.map((area) => {
				const entries = grouped[area];
				const treeRoots = compactSourceControlTree(buildGitStatusSourceControlTree(area, entries));
				const visibleRows = flattenSourceControlTree(treeRoots, collapsedTreeDirs);
				return { area, entries, treeRoots, visibleRows };
			}).filter((section) => section.entries.length > 0),
		[grouped, collapsedTreeDirs],
	);
	const setLayoutHeight = (key: keyof ChangesPanelLayout["heights"]) => (updater: (current: number) => number) => {
		setLayout((current) => ({
			...current,
			heights: {
				...current.heights,
				[key]: updater(current.heights[key]),
			},
		}));
	};
	const toggleWorkflowSection = (key: WorkflowSectionId) => {
		setLayout((current) => ({
			...current,
			expanded: {
				...current.expanded,
				[key]: !current.expanded[key],
			},
		}));
	};

	if (!projectId) {
		return (
			<div className="changes-panel__empty">
				<p>Select a project to inspect source control changes.</p>
			</div>
		);
	}

	if (isGitRepo === false) {
		return (
			<div className="changes-panel__empty">
				<p>This project is not a git repository.</p>
				<Button type="button" variant="secondary" size="sm" onClick={() => void initializeRepository()}>
					Initialize repository
				</Button>
			</div>
		);
	}

	if (statusError) {
		return (
			<div className="changes-panel__empty changes-panel__empty--error">
				<p>{statusError}</p>
				<Button type="button" variant="secondary" size="sm" onClick={() => void refresh()}>
					Retry
				</Button>
			</div>
		);
	}

	const runMutation = async (
		operation: () => Promise<{ ok: true; data: unknown } | { ok: false; error: { message: string } }>,
	) => {
		setOperationError(null);
		const result = await operation();
		if (!result.ok) {
			setOperationError(result.error.message);
			return;
		}
		setSelectedKeys(new Set());
		await refresh();
	};

	const openDiff = async (entry: GitStatusEntry) => {
		if (!projectId) {
			return;
		}
		setOperationError(null);
		const diffKind = entry.area;
		const result = await window.piDesktop.sourceControl.getDiff({
			projectId,
			relativePath: entry.path,
			kind: diffKind,
		});
		if (!result.ok) {
			setOperationError(result.error.message);
			return;
		}
		fileWorkspace?.openDiff({ relativePath: entry.path, kind: diffKind, diff: result.data });
	};

	const conflictOperation = status?.conflictOperation ?? "unknown";
	const conflict = conflictLabel(conflictOperation);
	const abortConflict = async () => {
		if (!projectId || !status || status.conflictOperation === "unknown") {
			return;
		}
		const operation = status.conflictOperation;
		await runMutation(() => window.piDesktop.sourceControl.abortConflict({ projectId, operation }));
	};
	const discardConfirmation = pendingDiscardEntries.length
		? getDiscardConfirmation(pendingDiscardEntries)
		: { title: "", description: "", actionLabel: "Discard Changes" };
	const discardPendingEntries = async () => {
		const entries = pendingDiscardEntries;
		setPendingDiscardEntries([]);
		if (entries.length === 0) {
			return;
		}
		await runMutation(() =>
			entries.length === 1
				? window.piDesktop.sourceControl.discard({
						projectId,
						relativePath: entries[0]?.path ?? "",
						area: entries[0]?.area ?? "unstaged",
					})
				: window.piDesktop.sourceControl.bulkDiscard({
						projectId,
						entries: entries.map((entry) => ({
							relativePath: entry.path,
							area: entry.area,
						})),
					}),
		);
	};

	return (
		<div className="changes-panel__content">
			<AlertDialog
				open={pendingDiscardEntries.length > 0}
				onOpenChange={(open) => {
					if (!open) {
						setPendingDiscardEntries([]);
					}
				}}
			>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>{discardConfirmation.title}</AlertDialogTitle>
						<AlertDialogDescription>{discardConfirmation.description}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={() => void discardPendingEntries()}>
							{discardConfirmation.actionLabel}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			{conflict ? (
				<div className="changes-panel__conflict">
					<span>{conflict}</span>
					<Button type="button" variant="secondary" size="sm" onClick={() => void abortConflict()}>
						<RotateCcw aria-hidden />
						{conflictButtonLabel(conflictOperation)}
					</Button>
				</div>
			) : null}
			<div className="changes-panel__sections">
				{status && status.entries.length === 0 && !conflict ? (
					<div className="changes-panel__empty changes-panel__empty--inline">
						<p>No uncommitted changes</p>
					</div>
				) : null}
				{selectedEntries.length > 0 ? (
					<div className="changes-panel__bulk">
						<span>{selectedEntries.length} selected</span>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onClick={() =>
								void runMutation(() =>
									window.piDesktop.sourceControl.bulkStage({
										projectId: projectId ?? "",
										relativePaths: selectedStageableEntries.map((entry) => entry.path),
									}),
								)
							}
							disabled={selectedStageableEntries.length === 0}
						>
							Stage Selected
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() =>
								void runMutation(() =>
									window.piDesktop.sourceControl.bulkUnstage({
										projectId: projectId ?? "",
										relativePaths: selectedStagedEntries.map((entry) => entry.path),
									}),
								)
							}
							disabled={selectedStagedEntries.length === 0}
						>
							Unstage Selected
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setPendingDiscardEntries(selectedEntries)}
						>
							Discard Selected
						</Button>
					</div>
				) : null}
				{operationError ? (
					<p className="changes-panel__error changes-panel__error--inline">{operationError}</p>
				) : null}
				{visibleSections.map((section) => {
					const collapsed = collapsedSections.has(section.area);
					return (
						<section key={section.area} className="changes-panel__section">
							<button
								type="button"
								className="changes-panel__section-header"
								onClick={() =>
									setCollapsedSections((current) => {
										const next = new Set(current);
										if (next.has(section.area)) {
											next.delete(section.area);
										} else {
											next.add(section.area);
										}
										return next;
									})
								}
							>
								{collapsed ? (
									<ChevronRight aria-hidden className="changes-panel__section-chevron-icon" />
								) : (
									<ChevronDown aria-hidden className="changes-panel__section-chevron-icon" />
								)}
								<span>{SECTION_LABELS[section.area]}</span>
								<span className="changes-panel__section-count">{section.entries.length}</span>
							</button>
							{!collapsed ? (
								<div className="changes-panel__tree">
									{section.visibleRows.map((node) => (
										<SourceControlTreeRow
											key={node.key}
											node={node}
											collapsedDirectoryKeys={collapsedTreeDirs}
											selected={node.type === "file" ? selectedKeys.has(selectionKey(node.entry)) : false}
											onOpenDiff={(entry) => void openDiff(entry)}
											onToggleSelected={(entry) =>
												setSelectedKeys((current) => {
													const next = new Set(current);
													const key = selectionKey(entry);
													if (next.has(key)) {
														next.delete(key);
													} else {
														next.add(key);
													}
													return next;
												})
											}
											onStage={(entry) =>
												void runMutation(() =>
													window.piDesktop.sourceControl.stage({
														projectId: projectId ?? "",
														relativePath: entry.path,
													}),
												)
											}
											onUnstage={(entry) =>
												void runMutation(() =>
													window.piDesktop.sourceControl.unstage({
														projectId: projectId ?? "",
														relativePath: entry.path,
													}),
												)
											}
											onDiscard={(entry) => setPendingDiscardEntries([entry])}
											onToggleDirectory={(key) =>
												setCollapsedTreeDirs((current) => {
													const next = new Set(current);
													if (next.has(key)) {
														next.delete(key);
													} else {
														next.add(key);
													}
													return next;
												})
											}
										/>
									))}
								</div>
							) : null}
						</section>
					);
				})}
			</div>
			<div
				className="changes-panel__commit-strip"
				data-testid="changes-panel-commit-strip"
				style={{ "--changes-panel-commit-height": `${layout.heights.commit}px` } as CSSProperties}
			>
				<SectionResizeHandle
					label="Resize Commit section"
					height={layout.heights.commit}
					setHeight={setLayoutHeight("commit")}
					minHeight={COMMIT_SECTION_MIN_HEIGHT}
					maxHeight={COMMIT_SECTION_MAX_HEIGHT}
					growDirection="up"
					className="changes-panel__section-resize-handle changes-panel__section-resize-handle--top"
				/>
				<div className="changes-panel__commit-strip-content">
					<CommitArea
						onCreatePullRequestRequested={() => setCreatePullRequestRequestCount((count) => count + 1)}
					/>
				</div>
			</div>
			<div className="changes-panel__secondary" data-testid="changes-panel-secondary">
				<WorkflowCollapsibleSection
					title="Branch compare"
					testId="changes-panel-branch-compare"
					expanded={layout.expanded.branchCompare}
					height={layout.heights.branchCompare}
					onToggle={() => toggleWorkflowSection("branchCompare")}
					setHeight={setLayoutHeight("branchCompare")}
				>
					<BranchCompareArea />
				</WorkflowCollapsibleSection>
				<WorkflowCollapsibleSection
					title="History"
					testId="changes-panel-history"
					expanded={layout.expanded.history}
					height={layout.heights.history}
					onToggle={() => toggleWorkflowSection("history")}
					setHeight={setLayoutHeight("history")}
				>
					<GitHistoryPanel embedded />
				</WorkflowCollapsibleSection>
				<WorkflowCollapsibleSection
					title="Pull request"
					testId="changes-panel-pull-request"
					expanded={layout.expanded.pullRequest}
					height={layout.heights.pullRequest}
					onToggle={() => toggleWorkflowSection("pullRequest")}
					setHeight={setLayoutHeight("pullRequest")}
				>
					<PullRequestArea focusRequestCount={createPullRequestRequestCount} />
				</WorkflowCollapsibleSection>
			</div>
		</div>
	);
}

function ChangesPanelChrome({ project, onProjectState }: ChangesPanelProps) {
	const { refresh, isRefreshing, pullRequest, status } = useChangesPanel();
	const [gitSettingsOpen, setGitSettingsOpen] = useState(false);
	const defaultBaseRef = resolveProjectDefaultBaseRef(project);
	const linkedPullRequestState = pullRequest ? getPullRequestStateDisplay(pullRequest.state) : null;
	const branchLabel = formatBranchLabel(status);

	return (
		<>
			<div className="changes-panel" data-testid="workspace-panel-changes">
				<header className="changes-panel__header">
					<div className="changes-panel__header-copy">
						<div className="changes-panel__title-row">
							<h2 className="changes-panel__title">Changes</h2>
							{branchLabel ? (
								<span className="changes-panel__branch" data-testid="changes-panel-branch" title={branchLabel}>
									{branchLabel}
								</span>
							) : null}
						</div>
						{pullRequest ? (
							<div className="changes-panel__header-pr" data-testid="changes-panel-linked-pr-header">
								<Badge variant={linkedPullRequestState?.variant ?? "outline"}>
									{linkedPullRequestState?.label ?? "PR"}
								</Badge>
								<span className="changes-panel__header-pr-title">{pullRequest.title}</span>
							</div>
						) : null}
					</div>
					<div className="changes-panel__header-actions">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label="Git settings"
							disabled={!project}
							onClick={() => setGitSettingsOpen(true)}
						>
							<Settings aria-hidden />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label="Refresh source control status"
							disabled={!project || isRefreshing}
							onClick={() => void refresh()}
						>
							<RefreshCw
								className={isRefreshing ? "changes-panel__refresh-icon--spinning" : undefined}
								aria-hidden
							/>
						</Button>
					</div>
				</header>
				<div className="changes-panel__body">
					<ChangesPanelBody />
				</div>
			</div>
			<GitSettingsDialog
				open={gitSettingsOpen}
				projectId={project?.id ?? null}
				initialDefaultBaseRef={defaultBaseRef}
				onOpenChange={setGitSettingsOpen}
				onSaved={onProjectState}
			/>
		</>
	);
}

export function ChangesPanel({ project, isActive, onProjectState }: ChangesPanelProps) {
	const defaultBaseRef = resolveProjectDefaultBaseRef(project);

	return (
		<ChangesPanelProvider projectId={project?.id ?? null} defaultBaseRef={defaultBaseRef} isActive={isActive}>
			<ChangesPanelChrome project={project} isActive={isActive} onProjectState={onProjectState} />
		</ChangesPanelProvider>
	);
}
