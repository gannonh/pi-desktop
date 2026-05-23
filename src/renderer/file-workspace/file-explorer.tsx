import { ChevronRight, Folder, FolderOpen, Loader2 } from "lucide-react";
import type { CSSProperties } from "react";
import { getExplorerFileIcon } from "./file-explorer-icons";
import { useFileWorkspace } from "./file-workspace-context";

interface ExplorerNodeProps {
	relativePath: string;
	name: string;
	kind: "file" | "directory";
	depth: number;
}

function ExplorerNode({ relativePath, name, kind, depth }: ExplorerNodeProps) {
	const { state, selectExplorerItem, toggleDirectory } = useFileWorkspace();
	const expanded = kind === "directory" && state.expandedPaths.includes(relativePath);
	const selected = state.selectedPath === relativePath;
	const listing = state.directoryEntries[relativePath];
	const FileIcon = kind === "file" ? getExplorerFileIcon(name) : expanded ? FolderOpen : Folder;

	const onSelect = () => {
		if (kind === "file") {
			selectExplorerItem(relativePath, kind);
			return;
		}
		selectExplorerItem(relativePath, kind);
	};

	return (
		<li className="file-explorer__node" data-depth={depth}>
			<div
				className={`file-explorer__row-wrap${selected ? " file-explorer__row-wrap--selected" : ""}`}
				style={{ "--file-explorer-depth": depth } as CSSProperties}
			>
				{kind === "directory" ? (
					<button
						type="button"
						className="file-explorer__disclosure"
						aria-label={expanded ? `Collapse ${name}` : `Expand ${name}`}
						aria-expanded={expanded}
						onClick={(event) => {
							event.stopPropagation();
							toggleDirectory(relativePath);
						}}
					>
						<ChevronRight
							className={`file-explorer__chevron${expanded ? " file-explorer__chevron--expanded" : ""}`}
							aria-hidden
						/>
					</button>
				) : (
					<span className="file-explorer__disclosure file-explorer__disclosure--spacer" aria-hidden />
				)}
				<button
					type="button"
					className="file-explorer__row"
					aria-current={selected ? "true" : undefined}
					onClick={onSelect}
				>
					<FileIcon
						className={`file-explorer__icon file-explorer__icon--${kind}`}
						aria-hidden
						strokeWidth={1.75}
					/>
					<span className="file-explorer__name">{name}</span>
				</button>
			</div>
			{kind === "directory" && expanded ? (
				<div className="file-explorer__children">
					{listing?.status === "loading" ? (
						<li className="file-explorer__status" style={{ "--file-explorer-depth": depth + 1 } as CSSProperties}>
							<Loader2 className="file-explorer__status-icon" aria-hidden />
							<span>Loading…</span>
						</li>
					) : null}
					{listing?.status === "error" ? (
						<li
							className="file-explorer__status file-explorer__status--error"
							style={{ "--file-explorer-depth": depth + 1 } as CSSProperties}
						>
							{listing.message}
						</li>
					) : null}
					{listing?.status === "loaded"
						? listing.entries.map((entry) => (
								<ExplorerNode
									key={entry.relativePath}
									relativePath={entry.relativePath}
									name={entry.name}
									kind={entry.kind}
									depth={depth + 1}
								/>
							))
						: null}
				</div>
			) : null}
		</li>
	);
}

export function FileExplorer() {
	const { project, state, retryLoadDirectory } = useFileWorkspace();
	const rootListing = state.directoryEntries[""];

	if (!project) {
		return null;
	}

	return (
		<section className="file-explorer" aria-label="Project files" data-testid="file-explorer">
			<header className="file-explorer__header">
				<h2 className="file-explorer__title" title={project.path}>
					{project.displayName}
				</h2>
			</header>
			<div className="file-explorer__tree" role="tree">
				{rootListing?.status === "loading" ? (
					<li className="file-explorer__status file-explorer__status--root">
						<Loader2 className="file-explorer__status-icon" aria-hidden />
						<span>Loading…</span>
					</li>
				) : null}
				{rootListing?.status === "error" ? (
					<li className="file-explorer__status file-explorer__status--error file-explorer__status--root">
						{rootListing.message}
						<button type="button" className="file-explorer__retry" onClick={() => retryLoadDirectory("")}>
							Retry
						</button>
					</li>
				) : null}
				{rootListing?.status === "loaded"
					? rootListing.entries.map((entry) => (
							<ExplorerNode
								key={entry.relativePath}
								relativePath={entry.relativePath}
								name={entry.name}
								kind={entry.kind}
								depth={0}
							/>
						))
					: null}
			</div>
		</section>
	);
}
