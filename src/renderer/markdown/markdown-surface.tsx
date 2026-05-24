import { useState } from "react";
import { MarkdownSourceEditor } from "./markdown-source-editor";
import { RichMarkdownEditor } from "./rich-markdown-editor";

export type MarkdownSurfaceMode = "preview" | "source" | "split";

export type MarkdownSurfaceEditorRole = "rich" | "source";

export type MarkdownSurfaceEditorActions = {
	getMarkdown: () => string;
	focus: () => void;
	replaceMarkdown: (markdown: string) => void;
	reportParseError: (message: string, source: string) => void;
};

type MarkdownParseErrorState = {
	message: string;
	source: string;
};

export type MarkdownSurfaceProps = {
	value: string;
	mode: MarkdownSurfaceMode;
	readOnly: boolean;
	relativePath: string;
	onChange: (markdown: string) => void;
	onEditorReady?: (role: MarkdownSurfaceEditorRole, actions: MarkdownSurfaceEditorActions) => void;
	onError?: (message: string, source: string) => void;
	onLinkClick?: (href: string) => void;
};

export function MarkdownSurface({
	value,
	mode,
	readOnly,
	relativePath,
	onChange,
	onEditorReady,
	onError,
	onLinkClick,
}: MarkdownSurfaceProps) {
	const [parseError, setParseError] = useState<MarkdownParseErrorState | null>(null);

	const handleEditorError = (message: string, source: string) => {
		setParseError({ message, source });
		onError?.(message, source);
	};

	return (
		<section
			className={`markdown-surface markdown-surface--${mode}`}
			data-testid="markdown-surface"
			data-mode={mode}
			data-relative-path={relativePath}
		>
			{parseError ? (
				<div className="markdown-surface__error" role="alert" data-testid="markdown-surface-error">
					<p className="markdown-surface__error-title">Markdown preview error</p>
					<p>{parseError.message}</p>
					<p>Switch to Markdown or Split mode to recover the source.</p>
				</div>
			) : null}
			{mode === "preview" ? (
				<RichMarkdownEditor
					value={value}
					readOnly={readOnly}
					relativePath={relativePath}
					onChange={onChange}
					onEditorReady={onEditorReady}
					onError={handleEditorError}
					onLinkClick={onLinkClick}
				/>
			) : null}
			{mode === "source" ? (
				<MarkdownSourceEditor
					value={value}
					readOnly={readOnly}
					relativePath={relativePath}
					onChange={onChange}
					onEditorReady={onEditorReady}
					onError={handleEditorError}
				/>
			) : null}
			{mode === "split" ? (
				<div className="markdown-surface__split" data-testid="markdown-split-editor">
					<MarkdownSourceEditor
						value={value}
						readOnly={readOnly}
						relativePath={relativePath}
						onChange={onChange}
						onEditorReady={onEditorReady}
						onError={handleEditorError}
					/>
					<RichMarkdownEditor
						value={value}
						readOnly={readOnly}
						relativePath={relativePath}
						onChange={onChange}
						onEditorReady={onEditorReady}
						onError={handleEditorError}
						onLinkClick={onLinkClick}
					/>
				</div>
			) : null}
		</section>
	);
}
