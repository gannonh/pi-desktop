import { MarkdownSourceEditor } from "./markdown-source-editor";
import { RichMarkdownEditor } from "./rich-markdown-editor";

export type MarkdownSurfaceMode = "preview" | "source" | "split";

export type MarkdownSurfaceEditorRole = "rich" | "source";

export type MarkdownSurfaceEditorActions = {
	getMarkdown: () => string;
	focus: () => void;
	replaceMarkdown: (markdown: string) => void;
};

export type MarkdownSurfaceProps = {
	value: string;
	mode: MarkdownSurfaceMode;
	readOnly: boolean;
	relativePath: string;
	onChange: (markdown: string) => void;
	onEditorReady?: (role: MarkdownSurfaceEditorRole, actions: MarkdownSurfaceEditorActions) => void;
	onError?: (message: string, source: string) => void;
};

export function MarkdownSurface({
	value,
	mode,
	readOnly,
	relativePath,
	onChange,
	onEditorReady,
	onError,
}: MarkdownSurfaceProps) {
	return (
		<section
			className={`markdown-surface markdown-surface--${mode}`}
			data-testid="markdown-surface"
			data-mode={mode}
			data-relative-path={relativePath}
		>
			{mode === "preview" ? (
				<RichMarkdownEditor
					value={value}
					readOnly={readOnly}
					relativePath={relativePath}
					onChange={onChange}
					onEditorReady={onEditorReady}
					onError={onError}
				/>
			) : null}
			{mode === "source" ? (
				<MarkdownSourceEditor
					value={value}
					readOnly={readOnly}
					relativePath={relativePath}
					onChange={onChange}
					onEditorReady={onEditorReady}
					onError={onError}
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
						onError={onError}
					/>
					<RichMarkdownEditor
						value={value}
						readOnly={readOnly}
						relativePath={relativePath}
						onChange={onChange}
						onEditorReady={onEditorReady}
						onError={onError}
					/>
				</div>
			) : null}
		</section>
	);
}
