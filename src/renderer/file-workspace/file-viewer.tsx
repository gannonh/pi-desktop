import { useEffect } from "react";
import { FileEditor } from "./file-editor";
import { useFileWorkspace } from "./file-workspace-context";

const isMarkdownTab = (relativePath: string) => /\.(?:md|markdown)$/i.test(relativePath);

export function FileViewer() {
	const { state, activeTab, updateBuffer, setViewMode, saveActiveFile } = useFileWorkspace();

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
				event.preventDefault();
				void saveActiveFile();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [saveActiveFile]);

	if (state.tabs.length === 0) {
		return (
			<section className="file-viewer file-viewer--empty" data-testid="file-viewer-empty">
				<p>Select a file from the explorer to open it.</p>
			</section>
		);
	}

	if (!activeTab) {
		return (
			<section className="file-viewer file-viewer--empty" data-testid="file-viewer-empty">
				<p>Select an open file tab to view it.</p>
			</section>
		);
	}

	return (
		<section className="file-viewer" data-testid="file-viewer">
			<header className="file-viewer__header">
				<div className="file-viewer__breadcrumbs" data-testid="file-viewer-breadcrumbs">
					{activeTab.relativePath.split("/").join(" › ")}
				</div>
				{isMarkdownTab(activeTab.relativePath) ? (
					<div className="file-viewer__mode-toggle" data-testid="file-viewer-mode-toggle">
						<button
							type="button"
							className={`file-viewer__mode${activeTab.viewMode === "preview" ? " file-viewer__mode--active" : ""}`}
							onClick={() => setViewMode(activeTab.id, "preview")}
						>
							Preview
						</button>
						<button
							type="button"
							className={`file-viewer__mode${activeTab.viewMode === "source" ? " file-viewer__mode--active" : ""}`}
							onClick={() => setViewMode(activeTab.id, "source")}
						>
							Markdown
						</button>
					</div>
				) : null}
				<div className="file-viewer__actions">
					<button
						type="button"
						className="file-viewer__save"
						disabled={!activeTab.dirty || activeTab.readOnly || state.saveStatus === "saving"}
						onClick={() => void saveActiveFile()}
					>
						{state.saveStatus === "saving" ? "Saving…" : "Save"}
					</button>
				</div>
			</header>
			{state.saveStatus === "error" && state.saveMessage ? (
				<p className="file-viewer__save-error">{state.saveMessage}</p>
			) : null}
			{state.saveStatus === "saved" && state.saveMessage ? (
				<p className="file-viewer__save-success">{state.saveMessage}</p>
			) : null}
			<FileEditor tab={activeTab} onChange={(value) => updateBuffer(activeTab.id, value)} />
		</section>
	);
}
