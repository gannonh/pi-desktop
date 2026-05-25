import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching, defaultHighlightStyle, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { type Extension, EditorState } from "@codemirror/state";
import {
	drawSelection,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
	EditorView,
} from "@codemirror/view";

export function createCodeEditorBaseExtensions(options: { readOnly: boolean; ariaLabel: string }): Extension[] {
	return [
		lineNumbers(),
		history(),
		drawSelection(),
		indentOnInput(),
		bracketMatching(),
		highlightActiveLine(),
		highlightActiveLineGutter(),
		highlightSelectionMatches(),
		EditorState.tabSize.of(2),
		EditorState.allowMultipleSelections.of(true),
		EditorState.readOnly.of(options.readOnly),
		EditorView.editable.of(!options.readOnly),
		EditorView.lineWrapping,
		EditorView.contentAttributes.of({
			"aria-label": options.ariaLabel,
			spellcheck: "false",
		}),
		keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
		syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
		codeEditorTheme,
	];
}

export const codeEditorTheme = EditorView.theme(
	{
		"&": {
			height: "100%",
			backgroundColor: "var(--sidebar-background)",
			color: "var(--color-foreground)",
			fontSize: "0.8125rem",
		},
		"&.cm-focused": {
			outline: "none",
		},
		".cm-scroller": {
			fontFamily:
				'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
			lineHeight: "1.45",
		},
		".cm-content": {
			minHeight: "100%",
			padding: "0.75rem 0.75rem 0.75rem 0.25rem",
			caretColor: "var(--color-foreground)",
		},
		".cm-gutters": {
			borderRight: "1px solid color-mix(in oklch, var(--color-border) 70%, transparent)",
			backgroundColor: "color-mix(in oklch, var(--sidebar-background) 88%, var(--color-muted) 12%)",
			color: "var(--color-muted-foreground)",
		},
		".cm-activeLineGutter": {
			backgroundColor: "color-mix(in oklch, var(--color-muted) 22%, transparent)",
			color: "var(--color-foreground)",
		},
		".cm-activeLine": {
			backgroundColor: "color-mix(in oklch, var(--color-muted) 12%, transparent)",
		},
		".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
			backgroundColor: "color-mix(in oklch, var(--sidebar-accent-color) 30%, transparent)",
		},
		".cm-cursor": {
			borderLeftColor: "var(--color-foreground)",
		},
	},
	{ dark: true },
);
