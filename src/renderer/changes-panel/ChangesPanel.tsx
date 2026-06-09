import { RefreshCw, RotateCcw, WandSparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProjectRecord } from "../../shared/project-state";
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
import {
	resolveSourceControlActions,
	type SourceControlAction,
	type SourceControlPrimaryActionId,
} from "./source-control-primary-action-resolver";
import {
	buildGitStatusSourceControlTree,
	compactSourceControlTree,
	flattenSourceControlTree,
	type SourceControlTreeNode,
} from "./source-control-tree";
import { SECTION_LABELS, SECTION_ORDER, STATUS_LABELS, type SourceControlSection } from "./status-display";

type ChangesPanelProps = {
	project: ProjectRecord | null;
	isActive: boolean;
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
				<span className="changes-panel__tree-chevron" aria-hidden>
					{collapsed ? "▸" : "▾"}
				</span>
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
			<span className="changes-panel__status-badge">{STATUS_LABELS[entry.status]}</span>
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
					<Button type="button" variant="ghost" size="sm" onClick={() => onUnstage(entry)}>
						Unstage
					</Button>
				) : (
					<Button type="button" variant="ghost" size="sm" onClick={() => onStage(entry)}>
						Stage
					</Button>
				)}
				<Button type="button" variant="ghost" size="sm" onClick={() => onDiscard(entry)}>
					Discard
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

function CommitArea({
	pullRequest,
	onCreatePullRequestRequested,
}: {
	pullRequest: SourceControlPullRequestInfo | null;
	onCreatePullRequestRequested: () => void;
}) {
	const { projectId, status, refresh } = useChangesPanel();
	const [message, setMessage] = useState("");
	const [feedback, setFeedback] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isCommitting, setIsCommitting] = useState(false);
	const stagedCount = status?.entries.filter((entry) => entry.area === "staged").length ?? 0;
	const canCommit = Boolean(projectId && message.trim() && stagedCount > 0 && !isCommitting);

	const commit = async () => {
		if (!projectId || !canCommit) {
			return;
		}
		setIsCommitting(true);
		setError(null);
		setFeedback(null);
		const result = await window.piDesktop.sourceControl.commit({ projectId, message: message.trim() });
		setIsCommitting(false);
		if (!result.ok) {
			setError(result.error.message);
			return;
		}
		setFeedback(`Committed ${result.data.summary}`);
		setMessage("");
		await refresh();
	};

	return (
		<form
			className="changes-panel__commit"
			onSubmit={(event) => {
				event.preventDefault();
				void commit();
			}}
		>
			<label className="changes-panel__commit-label">
				<span>Commit message</span>
				<textarea
					className="changes-panel__commit-input"
					value={message}
					onChange={(event) => setMessage(event.target.value)}
					rows={3}
				/>
			</label>
			<div className="changes-panel__commit-actions">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => setError("Pi-backed commit message generation is not configured for this project yet.")}
				>
					<WandSparkles aria-hidden />
					Generate
				</Button>
			</div>
			{feedback ? <p className="changes-panel__feedback">{feedback}</p> : null}
			{error ? (
				<div className="changes-panel__error" role="dialog" aria-label="Commit failed">
					{error}
				</div>
			) : null}
			<SourceControlActions
				commitMessage={message}
				isCommitBusy={isCommitting}
				onCommit={() => void commit()}
				pullRequest={pullRequest}
				onCreatePullRequestRequested={onCreatePullRequestRequested}
			/>
		</form>
	);
}

function SourceControlActionButton({
	action,
	variant = "ghost",
	onRun,
}: {
	action: SourceControlAction;
	variant?: "default" | "secondary" | "ghost";
	onRun: (id: SourceControlPrimaryActionId) => void;
}) {
	return (
		<div className="changes-panel__action-row">
			<Button
				type="button"
				variant={variant}
				size="sm"
				disabled={Boolean(action.disabledReason)}
				title={action.disabledReason}
				onClick={() => onRun(action.id)}
			>
				{action.label}
			</Button>
			{action.disabledReason ? <span className="changes-panel__action-reason">{action.disabledReason}</span> : null}
		</div>
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
	const { projectId, status, refresh } = useChangesPanel();
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busyActionId, setBusyActionId] = useState<SourceControlPrimaryActionId | null>(null);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
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
			setIsMenuOpen(false);
			onCommit();
			return;
		}
		if (id === "createPullRequest") {
			setIsMenuOpen(false);
			onCreatePullRequestRequested();
			return;
		}
		if (id === "resolveConflicts") {
			setError("Resolve conflicts before source control actions.");
			return;
		}

		setIsMenuOpen(false);
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
							...(divergedUpstreamName ? { baseRef: divergedUpstreamName } : {}),
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

	return (
		<div className="changes-panel__remote">
			<div className="changes-panel__remote-summary">
				<span>{upstream?.hasUpstream ? upstream.upstreamName : "No upstream"}</span>
				<span>{upstream ? `${upstream.ahead} ahead, ${upstream.behind} behind` : "0 ahead, 0 behind"}</span>
			</div>
			<div className="changes-panel__remote-actions">
				<SourceControlActionButton
					action={actions.primary}
					variant="secondary"
					onRun={(id) => void runAction(id)}
				/>
				<div className="changes-panel__action-menu">
					<button
						type="button"
						className="changes-panel__action-menu-trigger"
						aria-haspopup="menu"
						aria-controls="changes-panel-source-control-actions-menu"
						aria-expanded={isMenuOpen}
						onClick={() => setIsMenuOpen((open) => !open)}
					>
						More source control actions
					</button>
					{isMenuOpen ? (
						<div
							id="changes-panel-source-control-actions-menu"
							className="changes-panel__action-menu-items"
							role="menu"
						>
							{actions.dropdown.map((action) => (
								<SourceControlActionButton key={action.id} action={action} onRun={(id) => void runAction(id)} />
							))}
						</div>
					) : null}
				</div>
			</div>
			{message ? <p className="changes-panel__feedback">{message}</p> : null}
			{error ? <p className="changes-panel__error">{error}</p> : null}
		</div>
	);
}

function BranchCompareArea() {
	const { projectId } = useChangesPanel();
	const fileWorkspace = useOptionalFileWorkspace();
	const [baseRef, setBaseRef] = useState("main");
	const [headRef, setHeadRef] = useState("HEAD");
	const [compare, setCompare] = useState<GitBranchCompareResult | null>(null);
	const [error, setError] = useState<string | null>(null);

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

function PullRequestArea({
	pullRequest,
	onPullRequestChange,
	focusRequestCount,
}: {
	pullRequest: SourceControlPullRequestInfo | null;
	onPullRequestChange: (pullRequest: SourceControlPullRequestInfo | null) => void;
	focusRequestCount: number;
}) {
	const { projectId } = useChangesPanel();
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const titleInputRef = useRef<HTMLInputElement | null>(null);
	const handledFocusRequestCount = useRef(0);

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
		onPullRequestChange(result.data);
	}, [body, onPullRequestChange, projectId, title]);

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

	if (!projectId) {
		return null;
	}

	return (
		<div className="changes-panel__pr">
			{pullRequest ? (
				<div className="changes-panel__pr-result">
					<span>{pullRequest.title}</span>
					<Button type="button" variant="secondary" size="sm" onClick={() => void copyPullRequestUrl()}>
						Copy PR Link
					</Button>
				</div>
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
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => setError("Pi-backed PR field generation is not configured for this project yet.")}
				>
					Generate with AI
				</Button>
			</div>
			{message ? <p className="changes-panel__feedback">{message}</p> : null}
			{error ? <p className="changes-panel__error">{error}</p> : null}
		</div>
	);
}

function ChangesPanelBody() {
	const { projectId, status, statusError, isGitRepo, refresh, initializeRepository } = useChangesPanel();
	const fileWorkspace = useOptionalFileWorkspace();
	const [collapsedSections, setCollapsedSections] = useState<ReadonlySet<SourceControlSection>>(new Set());
	const [collapsedTreeDirs, setCollapsedTreeDirs] = useState<ReadonlySet<string>>(new Set());
	const [operationError, setOperationError] = useState<string | null>(null);
	const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(new Set());
	const [pendingDiscardEntries, setPendingDiscardEntries] = useState<readonly GitStatusEntry[]>([]);
	const [pullRequest, setPullRequest] = useState<SourceControlPullRequestInfo | null>(null);
	const [createPullRequestRequestCount, setCreatePullRequestRequestCount] = useState(0);
	const hasStatus = Boolean(status);
	const pullRequestBranchKey = status?.branch ?? status?.head ?? null;
	const pullRequestLookupKey = projectId && hasStatus ? `${projectId}:${pullRequestBranchKey ?? ""}` : null;

	useEffect(() => {
		void refresh();
	}, [refresh]);

	useEffect(() => {
		if (!projectId || !pullRequestLookupKey) {
			setPullRequest(null);
			return;
		}
		let cancelled = false;
		setPullRequest(null);
		void window.piDesktop.sourceControl.getPullRequestInfo({ projectId }).then((result) => {
			if (cancelled) {
				return;
			}
			setPullRequest(result.ok ? result.data : null);
		});
		return () => {
			cancelled = true;
		};
	}, [projectId, pullRequestLookupKey]);

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
			<CommitArea
				pullRequest={pullRequest}
				onCreatePullRequestRequested={() => setCreatePullRequestRequestCount((count) => count + 1)}
			/>
			<BranchCompareArea />
			<PullRequestArea
				pullRequest={pullRequest}
				onPullRequestChange={setPullRequest}
				focusRequestCount={createPullRequestRequestCount}
			/>
			{status && status.entries.length === 0 && !conflict ? (
				<div className="changes-panel__empty">
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
			{operationError ? <p className="changes-panel__error">{operationError}</p> : null}
			<div className="changes-panel__sections">
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
								<span className="changes-panel__section-chevron" aria-hidden>
									{collapsed ? "▸" : "▾"}
								</span>
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
		</div>
	);
}

function ChangesPanelChrome({ project }: ChangesPanelProps) {
	const { refresh, isRefreshing } = useChangesPanel();

	return (
		<div className="changes-panel" data-testid="workspace-panel-changes">
			<header className="changes-panel__header">
				<h2 className="changes-panel__title">Changes</h2>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label="Refresh source control status"
					disabled={!project || isRefreshing}
					onClick={() => void refresh()}
				>
					<RefreshCw className={isRefreshing ? "changes-panel__refresh-icon--spinning" : undefined} aria-hidden />
				</Button>
			</header>
			<div className="changes-panel__body">
				<ChangesPanelBody />
			</div>
		</div>
	);
}

export function ChangesPanel({ project, isActive }: ChangesPanelProps) {
	return (
		<ChangesPanelProvider projectId={project?.id ?? null} isActive={isActive}>
			<ChangesPanelChrome project={project} isActive={isActive} />
		</ChangesPanelProvider>
	);
}
