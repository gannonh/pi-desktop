import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useEffect, useMemo, useRef } from "react";
import { createCodeEditorBaseExtensions } from "./code-editor-theme";
import { createCodeLanguageExtensions, getCodeLanguageForPath } from "./code-language";

type CodeFileEditorProps = {
	value: string;
	relativePath: string;
	readOnly: boolean;
	onChange: (value: string) => void;
};

export function CodeFileEditor({ value, relativePath, readOnly, onChange }: CodeFileEditorProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const onChangeRef = useRef(onChange);
	const suppressChangeRef = useRef<string | null>(null);
	const language = useMemo(() => getCodeLanguageForPath(relativePath), [relativePath]);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `value` seeds the editor; subsequent value changes sync through the effect below.
	useEffect(() => {
		const parent = containerRef.current;
		if (!parent) {
			return;
		}

		const view = new EditorView({
			parent,
			state: EditorState.create({
				doc: value,
				extensions: [
					...createCodeEditorBaseExtensions({ readOnly, ariaLabel: `Code editor for ${relativePath}` }),
					...createCodeLanguageExtensions(language, relativePath),
					EditorView.updateListener.of((update) => {
						if (!update.docChanged) {
							return;
						}

						const nextValue = update.state.doc.toString();
						if (suppressChangeRef.current === nextValue) {
							suppressChangeRef.current = null;
							return;
						}

						onChangeRef.current(nextValue);
					}),
				],
			}),
		});

		viewRef.current = view;

		return () => {
			view.destroy();
			viewRef.current = null;
			parent.textContent = "";
		};
	}, [language, readOnly, relativePath]);

	useEffect(() => {
		const view = viewRef.current;
		if (!view || view.state.doc.toString() === value) {
			return;
		}

		suppressChangeRef.current = value;
		view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
	}, [value]);

	return (
		<section
			className="file-editor code-file-editor"
			data-testid="code-file-editor"
			data-editor-engine="codemirror"
			data-language-id={language.id}
			data-language-label={language.label}
			data-readonly={readOnly}
		>
			<div className="code-file-editor__header" aria-hidden="true">
				<span className="code-file-editor__language">{language.label}</span>
			</div>
			<div ref={containerRef} className="code-file-editor__surface" />
		</section>
	);
}
