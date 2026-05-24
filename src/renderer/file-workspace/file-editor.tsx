import { MarkdownSurface } from "../markdown/markdown-surface";
import { isMarkdownRelativePath } from "./file-workspace-paths";
import type { FileEditorTab } from "./file-workspace-types";

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

	if (isMarkdownRelativePath(tab.relativePath)) {
		return (
			<MarkdownSurface
				value={tab.buffer}
				mode={tab.viewMode}
				readOnly={tab.readOnly}
				relativePath={tab.relativePath}
				onChange={onChange}
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
