import type { MDXEditorMethods } from "@mdxeditor/editor";
import { useEffect, useRef } from "react";
import type { MarkdownSurfaceEditorActions, MarkdownSurfaceEditorRole } from "./markdown-surface";

type MdxMarkdownEditorBridgeOptions = {
	value: string;
	readOnly: boolean;
	role: MarkdownSurfaceEditorRole;
	onChange: (markdown: string) => void;
	onEditorReady?: (role: MarkdownSurfaceEditorRole, actions: MarkdownSurfaceEditorActions) => void;
};

export const useMdxMarkdownEditorBridge = ({
	value,
	readOnly,
	role,
	onChange,
	onEditorReady,
}: MdxMarkdownEditorBridgeOptions) => {
	const editorRef = useRef<MDXEditorMethods>(null);
	const readOnlyRef = useRef(readOnly);
	const lastValueRef = useRef(value);
	const programmaticChangeRef = useRef<string | null>(null);

	useEffect(() => {
		readOnlyRef.current = readOnly;
	}, [readOnly]);

	useEffect(() => {
		const editor = editorRef.current;
		if (!editor || editor.getMarkdown() === value || lastValueRef.current === value) {
			lastValueRef.current = value;
			return;
		}

		lastValueRef.current = value;
		editor.setMarkdown(value);
	}, [value]);

	useEffect(() => {
		onEditorReady?.(role, {
			getMarkdown: () => editorRef.current?.getMarkdown() ?? lastValueRef.current,
			focus: () => editorRef.current?.focus(),
			replaceMarkdown: (markdown) => {
				if (readOnlyRef.current) {
					return;
				}

				programmaticChangeRef.current = markdown;
				lastValueRef.current = markdown;
				editorRef.current?.setMarkdown(markdown);
				onChange(markdown);
			},
		});
	}, [onChange, onEditorReady, role]);

	const handleChange = (markdown: string, initialMarkdownNormalize: boolean) => {
		if (initialMarkdownNormalize) {
			lastValueRef.current = markdown;
			return;
		}

		if (programmaticChangeRef.current === markdown) {
			programmaticChangeRef.current = null;
			return;
		}

		lastValueRef.current = markdown;
		onChange(markdown);
	};

	return { editorRef, handleChange };
};
