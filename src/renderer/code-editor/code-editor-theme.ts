import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching, HighlightStyle, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { type Extension, EditorState, Prec } from "@codemirror/state";
import { tags } from "@lezer/highlight";
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
		...createCodeEditorAppearanceExtensions(),
	];
}

const editorBackground = "oklch(0.16 0.006 255)";
const editorForeground = "oklch(0.86 0.014 255)";
const editorMuted = "oklch(0.62 0.018 255)";
const editorSubtle = "oklch(0.46 0.014 255)";

export const codeEditorHighlightStyle = HighlightStyle.define([
	{ tag: [tags.keyword, tags.modifier, tags.controlKeyword], color: "oklch(0.75 0.09 292)", fontWeight: "500" },
	{ tag: [tags.name, tags.variableName], color: editorForeground },
	{ tag: [tags.definition(tags.variableName), tags.function(tags.variableName)], color: "oklch(0.78 0.062 236)" },
	{ tag: [tags.propertyName, tags.function(tags.propertyName), tags.attributeName], color: "oklch(0.77 0.052 250)" },
	{ tag: [tags.typeName, tags.className, tags.namespace], color: "oklch(0.79 0.056 178)" },
	{ tag: [tags.string, tags.docString, tags.character, tags.attributeValue], color: "oklch(0.78 0.074 96)" },
	{ tag: [tags.number, tags.integer, tags.float, tags.bool, tags.null, tags.atom], color: "oklch(0.76 0.07 39)" },
	{ tag: [tags.comment, tags.lineComment, tags.blockComment], color: editorSubtle, fontStyle: "italic" },
	{ tag: [tags.regexp, tags.escape], color: "oklch(0.77 0.072 342)" },
	{ tag: [tags.operator, tags.punctuation, tags.separator], color: "oklch(0.69 0.018 255)" },
	{ tag: [tags.bracket, tags.angleBracket, tags.squareBracket, tags.paren], color: "oklch(0.72 0.018 255)" },
	{ tag: [tags.heading, tags.link], color: "oklch(0.8 0.058 236)", fontWeight: "500" },
	{ tag: tags.invalid, color: "oklch(0.82 0.12 24)", textDecoration: "underline" },
]);

export const createCodeEditorAppearanceExtensions = (): Extension[] => [
	Prec.highest(syntaxHighlighting(codeEditorHighlightStyle, { fallback: true })),
	Prec.highest(codeEditorTheme),
];

export const codeEditorTheme = EditorView.theme(
	{
		"&": {
			height: "100%",
			backgroundColor: editorBackground,
			color: editorForeground,
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
			caretColor: "oklch(0.9 0.02 255)",
		},
		".cm-gutters": {
			borderRight: "1px solid oklch(0.25 0.012 255)",
			backgroundColor: "oklch(0.145 0.005 255)",
			color: editorMuted,
		},
		".cm-lineNumbers .cm-gutterElement": {
			padding: "0 0.75rem 0 0.625rem",
		},
		".cm-activeLineGutter": {
			backgroundColor: "oklch(0.205 0.01 255)",
			color: "oklch(0.82 0.014 255)",
		},
		".cm-activeLine": {
			backgroundColor: "oklch(0.2 0.008 255)",
		},
		".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
			backgroundColor: "oklch(0.48 0.07 252 / 0.44)",
		},
		".cm-matchingBracket, .cm-nonmatchingBracket": {
			backgroundColor: "oklch(0.3 0.035 252)",
			outline: "1px solid oklch(0.5 0.055 252)",
		},
		".cm-cursor": {
			borderLeftColor: "oklch(0.9 0.02 255)",
		},
	},
	{ dark: true },
);
