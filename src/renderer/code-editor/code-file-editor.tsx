import { css } from "@codemirror/lang-css";
import { go } from "@codemirror/lang-go";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { type Extension, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useEffect, useMemo, useRef } from "react";
import { createCodeEditorBaseExtensions } from "./code-editor-theme";
import { type CodeLanguage, getCodeLanguageForPath } from "./code-language";

export type CodeFileEditorActions = {
	getSource: () => string;
	focus: () => void;
	replaceSource: (source: string) => void;
};

type CodeFileEditorProps = {
	value: string;
	relativePath: string;
	readOnly: boolean;
	onChange: (value: string) => void;
	onEditorReady?: (actions: CodeFileEditorActions) => void;
};

const languageExtension = (language: CodeLanguage, relativePath: string): Extension[] => {
	const lowerPath = relativePath.toLowerCase();

	switch (language.id) {
		case "typescript":
			return [javascript({ typescript: true, jsx: lowerPath.endsWith(".tsx") })];
		case "javascript":
			return [javascript({ jsx: lowerPath.endsWith(".jsx") })];
		case "html":
			return [html()];
		case "css":
			return [css()];
		case "json":
			return [json()];
		case "yaml":
			return [yaml()];
		case "rust":
			return [rust()];
		case "python":
			return [python()];
		case "go":
			return [go()];
		case "shell":
			return [StreamLanguage.define(shell)];
		case "sql":
			return [sql()];
		case "xml":
			return [xml()];
		case "plain-text":
			return [];
	}
};

export function CodeFileEditor({ value, relativePath, readOnly, onChange, onEditorReady }: CodeFileEditorProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const onChangeRef = useRef(onChange);
	const readOnlyRef = useRef(readOnly);
	const suppressChangeRef = useRef<string | null>(null);
	const language = useMemo(() => getCodeLanguageForPath(relativePath), [relativePath]);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		readOnlyRef.current = readOnly;
	}, [readOnly]);

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
					...languageExtension(language, relativePath),
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

	useEffect(() => {
		onEditorReady?.({
			getSource: () => viewRef.current?.state.doc.toString() ?? value,
			focus: () => viewRef.current?.focus(),
			replaceSource: (source) => {
				const view = viewRef.current;
				if (!view || readOnlyRef.current || view.state.doc.toString() === source) {
					return;
				}

				view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: source } });
			},
		});
	}, [onEditorReady, value]);

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
