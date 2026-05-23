import type { FileEditorTab } from "./file-workspace-types";
import { renderMarkdownHtml } from "../markdown/render-markdown-html";

interface FileEditorProps {
	tab: FileEditorTab;
	onChange: (value: string) => void;
}

const loadStateMessage = (tab: FileEditorTab): string | null => {
	if (tab.status === "loading") {
		return "Loading file…";
	}
	if (tab.status === "error") {
		return tab.errorMessage ?? "Failed to load file.";
	}
	if (tab.loadKind === "binary") {
		return "Binary file cannot be opened in the editor.";
	}
	if (tab.loadKind === "too_large") {
		return "File is too large to open.";
	}
	if (tab.loadKind === "not_found") {
		return "File was not found.";
	}
	if (tab.loadKind === "unsupported") {
		return "This file type is not supported.";
	}
	return null;
};

export function FileEditor({ tab, onChange }: FileEditorProps) {
	const blocked = loadStateMessage(tab);
	if (blocked) {
		return (
			<div className="file-editor file-editor--blocked" data-testid="file-editor-blocked">
				<p>{blocked}</p>
			</div>
		);
	}

	if (tab.viewMode === "preview") {
		return (
			<div
				className="file-editor file-editor--preview"
				data-testid="file-editor-preview"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized markdown HTML.
				dangerouslySetInnerHTML={{ __html: renderMarkdownHtml(tab.buffer) }}
			/>
		);
	}

	return (
		<textarea
			className="file-editor file-editor--source"
			data-testid="file-editor-source"
			value={tab.buffer}
			readOnly={tab.readOnly}
			onChange={(event) => onChange(event.target.value)}
			spellCheck={false}
		/>
	);
}
