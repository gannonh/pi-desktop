import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ProjectRecord } from "../../shared/project-state";
import type { GitStagingArea, GitStatusEntry } from "../../shared/source-control/types";
import { Button } from "../components/ui/button";
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
}: {
	node: SourceControlTreeNode;
	collapsedDirectoryKeys: ReadonlySet<string>;
	onToggleDirectory: (key: string) => void;
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
			<span className="changes-panel__status-badge">{STATUS_LABELS[entry.status]}</span>
			<span className="changes-panel__tree-name">{node.name}</span>
			{entry.added !== undefined || entry.removed !== undefined ? (
				<span className="changes-panel__line-stats">
					{entry.added ? `+${entry.added}` : null}
					{entry.removed ? `−${entry.removed}` : null}
				</span>
			) : null}
		</div>
	);
}

function ChangesPanelBody() {
	const { projectId, status, statusError, isRefreshing, isGitRepo, refresh, initializeRepository } =
		useChangesPanel();
	const [collapsedSections, setCollapsedSections] = useState<ReadonlySet<SourceControlSection>>(new Set());
	const [collapsedTreeDirs, setCollapsedTreeDirs] = useState<ReadonlySet<string>>(new Set());

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const grouped = useMemo(() => groupEntriesByArea(status?.entries ?? []), [status?.entries]);

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

	if (!status || status.entries.length === 0) {
		return (
			<div className="changes-panel__empty">
				<p>No uncommitted changes</p>
			</div>
		);
	}

	return (
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
	);
}

function ChangesPanelChrome({ project, isActive }: ChangesPanelProps) {
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
