import { GitCommit, RefreshCw, RotateCcw, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ProjectRecord } from "../../shared/project-state";
import type {
	GitBranchCompareResult,
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

const getDiscardConfirmation = (entries: readonly GitStatusEntry[]): { title: string; description: string } => {
	const includesUntracked = entries.some((entry) => entry.area === "untracked");
	const fileText = entries.length === 1 ? entries[0]?.path : `${entries.length} selected files`;
	const description = includesUntracked
		? "This will permanently delete untracked files."
		: "This will restore tracked files to their previous state.";
	return { title: `Discard changes for ${fileText}?`, description };
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

function CommitArea() {
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
				<Button type="submit" size="sm" disabled={!canCommit}>
					<GitCommit aria-hidden />
					{isCommitting ? "Committing..." : "Commit"}
				</Button>
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
		</form>
	);
}

function RemoteActions() {
	const { projectId, status, refresh } = useChangesPanel();
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const upstream = status?.upstreamStatus;
	const unstagedCount = status?.entries.filter((entry) => entry.area !== "staged").length ?? 0;

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

	return (
		<div className="changes-panel__remote">
			<div className="changes-panel__remote-summary">
				<span>{upstream?.hasUpstream ? upstream.upstreamName : "No upstream"}</span>
				<span>{upstream ? `${upstream.ahead} ahead, ${upstream.behind} behind` : "0 ahead, 0 behind"}</span>
			</div>
			<div className="changes-panel__remote-actions">
				<Button
					type="button"
					variant="secondary"
					size="sm"
					disabled={unstagedCount === 0}
					onClick={() =>
						void run("Stage all", () =>
							window.piDesktop.sourceControl.bulkStage({
								projectId,
								relativePaths:
									status?.entries.filter((entry) => entry.area !== "staged").map((entry) => entry.path) ?? [],
							}),
						)
					}
				>
					Stage All
				</Button>
				<details className="changes-panel__action-menu">
					<summary>More source control actions</summary>
					<div className="changes-panel__action-menu-items">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => void run("Fetch", () => window.piDesktop.sourceControl.fetch({ projectId }))}
						>
							Fetch
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={!upstream?.hasUpstream || upstream.behind === 0}
							onClick={() => void run("Pull", () => window.piDesktop.sourceControl.pull({ projectId }))}
						>
							Pull
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={!upstream?.hasUpstream || upstream.ahead === 0}
							onClick={() => void run("Push", () => window.piDesktop.sourceControl.push({ projectId }))}
						>
							Push
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={!upstream?.hasUpstream || (upstream.ahead === 0 && upstream.behind === 0)}
							onClick={() => void run("Sync", () => window.piDesktop.sourceControl.sync({ projectId }))}
						>
							Sync
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={upstream === undefined || upstream.hasUpstream}
							onClick={() => void run("Publish", () => window.piDesktop.sourceControl.publish({ projectId }))}
						>
							Publish
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={!upstream?.hasUpstream || upstream.behind === 0}
							onClick={() =>
								void run("Fast-forward", () => window.piDesktop.sourceControl.fastForward({ projectId }))
							}
						>
							Fast-forward
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() =>
								void run("Rebase", () => window.piDesktop.sourceControl.rebaseFromBase({ projectId }))
							}
						>
							Rebase
						</Button>
					</div>
				</details>
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

function PullRequestArea() {
	const { projectId } = useChangesPanel();
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [pullRequest, setPullRequest] = useState<SourceControlPullRequestInfo | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	const create = async () => {
		if (!projectId) {
			return;
		}
		setError(null);
		setMessage(null);
		const result = await window.piDesktop.sourceControl.createPullRequest({ projectId, title, body });
		if (!result.ok) {
			setError(result.error.message);
			return;
		}
		setPullRequest(result.data);
	};

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
				<input value={title} onChange={(event) => setTitle(event.target.value)} />
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

	useEffect(() => {
		void refresh();
	}, [refresh]);

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
		: { title: "", description: "" };
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
							Discard Changes
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
			<CommitArea />
			<RemoteActions />
			<BranchCompareArea />
			<PullRequestArea />
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
