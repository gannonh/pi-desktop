import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GitCommitFilesResult, GitHistoryEntry, GitHistoryResult } from "../../shared/source-control/types";
import { Button } from "../components/ui/button";
import { useOptionalFileWorkspace } from "../file-workspace/use-optional-file-workspace";
import { useChangesPanel } from "./changes-panel-context";
import { STATUS_LABELS } from "./status-display";

const formatAuthorDate = (authorDate: string): string => {
	const parsed = new Date(authorDate);
	if (Number.isNaN(parsed.getTime())) {
		return authorDate;
	}
	return parsed.toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
};

export function GitHistoryPanel() {
	const { projectId } = useChangesPanel();
	const fileWorkspace = useOptionalFileWorkspace();
	const [history, setHistory] = useState<GitHistoryResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedCommit, setSelectedCommit] = useState<GitHistoryEntry | null>(null);
	const [commitFiles, setCommitFiles] = useState<GitCommitFilesResult | null>(null);
	const [commitFilesLoading, setCommitFilesLoading] = useState(false);
	const [commitFilesError, setCommitFilesError] = useState<string | null>(null);
	const selectedCommitShaRef = useRef<string | null>(null);

	const refresh = useCallback(async () => {
		if (!projectId) {
			return;
		}
		setLoading(true);
		setError(null);
		const result = await window.piDesktop.sourceControl.getHistory({ projectId });
		setLoading(false);
		if (!result.ok) {
			setHistory(null);
			setError(result.error.message);
			return;
		}
		setHistory(result.data);
	}, [projectId]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const selectCommit = async (entry: GitHistoryEntry) => {
		if (!projectId) {
			return;
		}
		selectedCommitShaRef.current = entry.sha;
		setSelectedCommit(entry);
		setCommitFiles(null);
		setCommitFilesError(null);
		setCommitFilesLoading(true);
		const result = await window.piDesktop.sourceControl.getCommitFiles({
			projectId,
			commitRef: entry.sha,
		});
		if (selectedCommitShaRef.current !== entry.sha) {
			return;
		}
		setCommitFilesLoading(false);
		if (!result.ok) {
			setCommitFilesError(result.error.message);
			return;
		}
		setCommitFiles(result.data);
	};

	const openCommitDiff = async (relativePath: string, commitRef: string) => {
		if (!projectId) {
			return;
		}
		const result = await window.piDesktop.sourceControl.getDiff({
			projectId,
			relativePath,
			kind: "commit",
			commitRef,
		});
		if (!result.ok) {
			setCommitFilesError(result.error.message);
			return;
		}
		fileWorkspace?.openDiff({
			relativePath,
			kind: "commit",
			suffix: commitRef,
			diff: result.data,
			diffContext: { commitRef },
		});
	};

	if (!projectId) {
		return null;
	}

	let outgoingBoundaryShown = false;

	return (
		<div className="changes-panel__history" data-testid="changes-panel-history">
			<div className="changes-panel__history-header">
				<span className="changes-panel__history-title">History</span>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					disabled={loading}
					onClick={() => void refresh()}
					aria-label="Refresh history"
				>
					<RefreshCw aria-hidden className={loading ? "changes-panel__spin" : undefined} />
				</Button>
			</div>
			{loading && !history ? <p className="changes-panel__history-status">Loading history…</p> : null}
			{error ? <p className="changes-panel__error">{error}</p> : null}
			{history ? (
				<div className="changes-panel__history-list">
					{history.incomingCount > 0 ? (
						<div className="changes-panel__history-boundary" data-testid="history-incoming-boundary">
							↓ {history.incomingCount} incoming
							{history.upstreamName ? ` from ${history.upstreamName}` : ""}
						</div>
					) : null}
					{history.entries.map((entry) => {
						const showOutgoingBoundary = !outgoingBoundaryShown && entry.isOutgoing && history.outgoingCount > 0;
						if (showOutgoingBoundary) {
							outgoingBoundaryShown = true;
						}
						const selected = selectedCommit?.sha === entry.sha;
						return (
							<div key={entry.sha}>
								{showOutgoingBoundary ? (
									<div className="changes-panel__history-boundary" data-testid="history-outgoing-boundary">
										↑ {history.outgoingCount} outgoing
									</div>
								) : null}
								<button
									type="button"
									className={`changes-panel__history-row${selected ? " changes-panel__history-row--selected" : ""}`}
									onClick={() => void selectCommit(entry)}
								>
									<span className="changes-panel__history-sha">{entry.shortSha}</span>
									<span className="changes-panel__history-subject">{entry.subject}</span>
									<span className="changes-panel__history-meta">
										{entry.author} • {formatAuthorDate(entry.authorDate)}
									</span>
									{entry.refs.length > 0 ? (
										<span className="changes-panel__history-refs">{entry.refs.join(", ")}</span>
									) : null}
								</button>
							</div>
						);
					})}
				</div>
			) : null}
			{selectedCommit ? (
				<div className="changes-panel__history-commit" data-testid="history-commit-files">
					<p className="changes-panel__history-commit-title">
						{selectedCommit.shortSha} {selectedCommit.subject}
					</p>
					{commitFilesLoading ? <p className="changes-panel__history-status">Loading changed files…</p> : null}
					{commitFilesError ? <p className="changes-panel__error">{commitFilesError}</p> : null}
					{commitFiles?.files.map((file) => (
						<button
							key={`${file.status}:${file.path}`}
							type="button"
							className="changes-panel__history-file"
							onClick={() => void openCommitDiff(file.path, commitFiles.commitRef)}
						>
							{STATUS_LABELS[file.status]} {file.path}
						</button>
					))}
					{commitFiles && commitFiles.files.length === 0 ? (
						<p className="changes-panel__history-status">No file changes in this commit.</p>
					) : null}
				</div>
			) : null}
		</div>
	);
}
