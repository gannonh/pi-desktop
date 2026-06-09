import type { FileDiffTab } from "./file-workspace-types";
import { formatDiffMetadata } from "./diff-tab-label";

type DiffViewerProps = {
	tab: FileDiffTab;
};

export function DiffViewer({ tab }: DiffViewerProps) {
	const metadata = formatDiffMetadata({
		relativePath: tab.relativePath,
		diffKind: tab.diffKind,
		diffContext: tab.diffContext,
	});

	return (
		<section className="file-viewer file-viewer--diff" data-testid="file-viewer">
			<header className="file-viewer__header file-viewer__header--diff">
				<div className="file-viewer__diff-meta" data-testid="file-diff-meta">
					<div className="file-viewer__breadcrumbs" data-testid="file-viewer-breadcrumbs">
						{metadata.title}
					</div>
					<p className="file-viewer__diff-subtitle">{metadata.subtitle}</p>
				</div>
			</header>
			{tab.diff.kind === "text" ? (
				tab.diff.patch.trim().length > 0 ? (
					<pre className="file-viewer__diff" data-testid="file-diff-viewer">
						{tab.diff.patch}
					</pre>
				) : (
					<div className="file-viewer__diff-empty" data-testid="file-diff-state">
						<p>No changes in this diff.</p>
					</div>
				)
			) : (
				<div className="file-viewer__diff-empty" data-testid="file-diff-state">
					<p>{tab.diff.message}</p>
				</div>
			)}
		</section>
	);
}
