import { MDXEditor } from "@mdxeditor/editor";
import { useMemo } from "react";
import { createMarkdownEditorAdapterConfig } from "./mdxeditor-adapter";
import type { MarkdownSurfaceEditorActions, MarkdownSurfaceEditorRole } from "./markdown-surface";
import { useMdxMarkdownEditorBridge } from "./use-mdx-markdown-editor-bridge";

type RichMarkdownEditorProps = {
	value: string;
	readOnly: boolean;
	relativePath: string;
	onChange: (markdown: string) => void;
	onEditorReady?: (role: MarkdownSurfaceEditorRole, actions: MarkdownSurfaceEditorActions) => void;
	onError?: (message: string, source: string) => void;
};

export function RichMarkdownEditor({
	value,
	readOnly,
	relativePath,
	onChange,
	onEditorReady,
	onError,
}: RichMarkdownEditorProps) {
	const config = useMemo(() => createMarkdownEditorAdapterConfig(), []);
	const { editorRef, handleChange } = useMdxMarkdownEditorBridge({
		value,
		readOnly,
		role: "rich",
		onChange,
		onEditorReady,
	});

	return (
		<div className="markdown-surface__rich" data-testid="markdown-rich-editor" data-readonly={readOnly}>
			<MDXEditor
				ref={editorRef}
				markdown={value}
				plugins={config.plugins}
				className={config.editorClassName}
				contentEditableClassName={config.contentClassName}
				readOnly={readOnly}
				trim={false}
				suppressHtmlProcessing={true}
				aria-label={`Markdown preview for ${relativePath}`}
				onError={(payload) => onError?.(payload.error, payload.source)}
				onChange={handleChange}
			/>
		</div>
	);
}
