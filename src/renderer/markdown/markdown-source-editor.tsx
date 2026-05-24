import { MDXEditor } from "@mdxeditor/editor";
import { useMemo } from "react";
import type { MarkdownSurfaceEditorActions, MarkdownSurfaceEditorRole } from "./markdown-surface";
import { createMarkdownEditorAdapterConfig } from "./mdxeditor-adapter";
import { useMdxMarkdownEditorBridge } from "./use-mdx-markdown-editor-bridge";

type MarkdownSourceEditorProps = {
	value: string;
	readOnly: boolean;
	relativePath: string;
	onChange: (markdown: string) => void;
	onEditorReady?: (role: MarkdownSurfaceEditorRole, actions: MarkdownSurfaceEditorActions) => void;
	onError?: (message: string, source: string) => void;
};

export function MarkdownSourceEditor({
	value,
	readOnly,
	relativePath,
	onChange,
	onEditorReady,
	onError,
}: MarkdownSourceEditorProps) {
	const config = useMemo(
		() => createMarkdownEditorAdapterConfig({ viewMode: "source", readOnlySource: readOnly }),
		[readOnly],
	);
	const { editorRef, handleChange } = useMdxMarkdownEditorBridge({
		value,
		readOnly,
		role: "source",
		onChange,
		onEditorReady,
		onError,
	});

	return (
		<section
			className="markdown-surface__source"
			data-testid="markdown-source-editor"
			data-source-engine="codemirror"
			data-readonly={readOnly}
			aria-label={`Markdown source for ${relativePath}`}
		>
			<div className="markdown-surface__source-label" id={`markdown-source-${relativePath}`}>
				{`Markdown source for ${relativePath}`}
			</div>
			<MDXEditor
				ref={editorRef}
				markdown={value}
				plugins={config.plugins}
				iconComponentFor={config.iconComponentFor}
				className={config.editorClassName}
				contentEditableClassName={config.contentClassName}
				readOnly={readOnly}
				trim={false}
				suppressHtmlProcessing={true}
				aria-label={`Markdown source for ${relativePath}`}
				onError={(payload) => onError?.(payload.error, payload.source)}
				onChange={handleChange}
			/>
		</section>
	);
}
