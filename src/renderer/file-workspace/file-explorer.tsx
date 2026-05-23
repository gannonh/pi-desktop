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

	return (
		<li className="file-explorer__node">
			<button
				type="button"
				className={`file-explorer__row${selected ? " file-explorer__row--selected" : ""}`}
				style={{ paddingLeft: `${12 + depth * 14}px` }}
				onClick={() => {
					if (kind === "directory") {
						toggleDirectory(relativePath);
						return;
					}
					selectExplorerItem(relativePath, kind);
				}}
			>
				<span className="file-explorer__chevron" aria-hidden="true">
					{kind === "directory" ? (expanded ? "▾" : "▸") : " "}
				</span>
				<span className={`file-explorer__icon file-explorer__icon--${kind}`} aria-hidden="true" />
				<span className="file-explorer__name">{name}</span>
			</button>
			{kind === "directory" && expanded ? (
				<ul className="file-explorer__children">
					{listing?.status === "loading" ? (
						<li className="file-explorer__status" style={{ paddingLeft: `${26 + depth * 14}px` }}>
							Loading…
						</li>
					) : null}
					{listing?.status === "error" ? (
						<li
							className="file-explorer__status file-explorer__status--error"
							style={{ paddingLeft: `${26 + depth * 14}px` }}
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
				</ul>
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
				<h2 className="file-explorer__title">{project.displayName}</h2>
			</header>
			<ul className="file-explorer__tree">
				{rootListing?.status === "loading" ? <li className="file-explorer__status">Loading…</li> : null}
				{rootListing?.status === "error" ? (
					<li className="file-explorer__status file-explorer__status--error">
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
			</ul>
		</section>
	);
}
