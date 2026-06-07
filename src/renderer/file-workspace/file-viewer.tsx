import { MoreHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { MenuAnchor, MenuItem, MenuSurface } from "../components/menu";
import { FileEditor } from "./file-editor";
import { useFileWorkspace } from "./file-workspace-context";
import { isMarkdownRelativePath } from "./file-workspace-paths";
import type { FileViewMode } from "./file-workspace-types";

const markdownModes: { mode: FileViewMode; label: string }[] = [
	{ mode: "preview", label: "Preview" },
	{ mode: "source", label: "Markdown" },
	{ mode: "split", label: "Split" },
];

export function FileViewer() {
	const { state, activeTab, updateBuffer, setViewMode, saveActiveFile } = useFileWorkspace();
	const [menuOpen, setMenuOpen] = useState(false);
	const menuId = useId();
	const menuAnchorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!menuOpen) {
			return;
		}

		const handlePointerDown = (event: PointerEvent) => {
			if (!menuAnchorRef.current?.contains(event.target as Node)) {
				setMenuOpen(false);
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setMenuOpen(false);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [menuOpen]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: close the overflow menu when the active file tab changes.
	useEffect(() => {
		setMenuOpen(false);
	}, [activeTab?.id]);

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

	if (activeTab.kind === "diff") {
		return (
			<section className="file-viewer file-viewer--diff" data-testid="file-viewer">
				<header className="file-viewer__header">
					<div className="file-viewer__breadcrumbs" data-testid="file-viewer-breadcrumbs">
						{activeTab.title}
					</div>
				</header>
				{activeTab.diff.kind === "text" ? (
					<pre className="file-viewer__diff" data-testid="file-diff-viewer">
						{activeTab.diff.patch}
					</pre>
				) : (
					<div className="file-viewer__diff-empty" data-testid="file-diff-state">
						<p>{activeTab.diff.message}</p>
					</div>
				)}
			</section>
		);
	}

	return (
		<section className="file-viewer" data-testid="file-viewer">
			<header className="file-viewer__header">
				<div className="file-viewer__breadcrumbs" data-testid="file-viewer-breadcrumbs">
					{activeTab.relativePath.split("/").join(" › ")}
				</div>
				{isMarkdownRelativePath(activeTab.relativePath) ? (
					<div className="file-viewer__mode-toggle" data-testid="file-viewer-mode-toggle">
						{markdownModes.map(({ mode, label }) => (
							<button
								key={mode}
								type="button"
								className={`file-viewer__mode${activeTab.viewMode === mode ? " file-viewer__mode--active" : ""}`}
								aria-pressed={activeTab.viewMode === mode}
								onClick={() => setViewMode(activeTab.id, mode)}
							>
								{label}
							</button>
						))}
					</div>
				) : null}
				<MenuAnchor ref={menuAnchorRef} className="file-viewer__actions">
					<button
						type="button"
						className="file-viewer__overflow"
						aria-label="File actions"
						aria-expanded={menuOpen}
						aria-haspopup="menu"
						aria-controls={menuId}
						onClick={() => setMenuOpen((current) => !current)}
					>
						<MoreHorizontal className="file-viewer__overflow-icon" aria-hidden strokeWidth={1.75} />
					</button>
					{menuOpen ? (
						<MenuSurface id={menuId} className="file-viewer__menu" variant="context" aria-label="File actions">
							<MenuItem
								disabled={!activeTab.dirty || activeTab.readOnly || state.saveStatus === "saving"}
								onClick={() => {
									void saveActiveFile();
									setMenuOpen(false);
								}}
							>
								{state.saveStatus === "saving" ? "Saving…" : "Save"}
							</MenuItem>
						</MenuSurface>
					) : null}
				</MenuAnchor>
			</header>
			{state.saveStatus === "error" && state.saveMessage ? (
				<p className="file-viewer__save-error">{state.saveMessage}</p>
			) : null}
			<FileEditor tab={activeTab} onChange={(value) => updateBuffer(activeTab.id, value)} />
		</section>
	);
}
