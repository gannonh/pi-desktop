import {
	BlockTypeSelect,
	BoldItalicUnderlineToggles,
	CodeToggle,
	CreateLink,
	InsertCodeBlock,
	InsertImage,
	InsertTable,
	InsertThematicBreak,
	ListsToggle,
	Separator,
	StrikeThroughSupSubToggles,
	UndoRedo,
	codeBlockPlugin,
	codeMirrorPlugin,
	diffSourcePlugin,
	headingsPlugin,
	imagePlugin,
	linkDialogPlugin,
	linkPlugin,
	listsPlugin,
	markdownShortcutPlugin,
	quotePlugin,
	tablePlugin,
	thematicBreakPlugin,
	toolbarPlugin,
	type RealmPlugin,
	type ViewMode,
} from "@mdxeditor/editor";
import { Fragment, createElement } from "react";

export const mdxEditorPackage = {
	name: "@mdxeditor/editor",
	version: "4.0.1",
	peerDependencies: {
		react: ">= 18 || >= 19",
		"react-dom": ">= 18 || >= 19",
	},
} as const;

export const mdxEditorClassNames = {
	wrapper: "markdown-surface markdown-surface--mdxeditor",
	editor: "markdown-surface__editor",
	content: "markdown-surface__content",
	toolbar: "markdown-surface__toolbar",
} as const;

export type MarkdownEditorPluginFeature =
	| "headings"
	| "lists"
	| "task-lists"
	| "links"
	| "link-dialog"
	| "images"
	| "quotes"
	| "thematic-breaks"
	| "tables"
	| "code-blocks"
	| "markdown-shortcuts"
	| "source-codemirror"
	| "toolbar";

export type MarkdownEditorAdapterConfig = {
	packageName: typeof mdxEditorPackage.name;
	packageVersion: typeof mdxEditorPackage.version;
	wrapperClassName: typeof mdxEditorClassNames.wrapper;
	editorClassName: typeof mdxEditorClassNames.editor;
	contentClassName: typeof mdxEditorClassNames.content;
	toolbarClassName: typeof mdxEditorClassNames.toolbar;
	pluginFeatures: MarkdownEditorPluginFeature[];
	plugins: RealmPlugin[];
};

export type MarkdownEditorAdapterOptions = {
	viewMode?: Extract<ViewMode, "rich-text" | "source">;
	readOnlySource?: boolean;
};

const markdownPluginFeatures: MarkdownEditorPluginFeature[] = [
	"headings",
	"lists",
	"task-lists",
	"links",
	"link-dialog",
	"images",
	"quotes",
	"thematic-breaks",
	"tables",
	"code-blocks",
	"markdown-shortcuts",
	"source-codemirror",
	"toolbar",
];

const toolbarSeparator = (key: string) => createElement(Separator, { key });

const renderToolbarContents = () =>
	createElement(
		"div",
		{
			className: "markdown-surface__toolbar-contents",
			"data-testid": "markdown-rich-toolbar",
			"aria-label": "Markdown editing toolbar",
		},
		createElement(
			Fragment,
			null,
			createElement(UndoRedo, { key: "undo-redo" }),
			toolbarSeparator("history-separator"),
			createElement(BlockTypeSelect, { key: "block-type" }),
			toolbarSeparator("block-separator"),
			createElement(BoldItalicUnderlineToggles, { key: "bold-italic", options: ["Bold", "Italic"] }),
			createElement(StrikeThroughSupSubToggles, { key: "strike", options: ["Strikethrough"] }),
			createElement(CodeToggle, { key: "inline-code" }),
			toolbarSeparator("inline-separator"),
			createElement(ListsToggle, { key: "lists", options: ["bullet", "number", "check"] }),
			toolbarSeparator("list-separator"),
			createElement(CreateLink, { key: "link" }),
			createElement(Fragment, { key: "image" }, createElement(InsertImage)),
			createElement(InsertTable, { key: "table" }),
			createElement(InsertThematicBreak, { key: "thematic-break" }),
			createElement(InsertCodeBlock, { key: "code-block" }),
		),
	);

const createBaseMarkdownPlugins = (): RealmPlugin[] => [
	headingsPlugin(),
	listsPlugin(),
	quotePlugin(),
	linkPlugin(),
	linkDialogPlugin(),
	imagePlugin(),
	tablePlugin(),
	thematicBreakPlugin(),
	codeBlockPlugin({ defaultCodeBlockLanguage: "ts" }),
	codeMirrorPlugin({
		codeBlockLanguages: { markdown: "Markdown", ts: "TypeScript", js: "JavaScript", bash: "Shell" },
		autoLoadLanguageSupport: false,
	}),
	markdownShortcutPlugin(),
	toolbarPlugin({
		toolbarClassName: mdxEditorClassNames.toolbar,
		toolbarContents: renderToolbarContents,
	}),
];

export const createMarkdownEditorAdapterConfig = (
	options: MarkdownEditorAdapterOptions = {},
): MarkdownEditorAdapterConfig => ({
	packageName: mdxEditorPackage.name,
	packageVersion: mdxEditorPackage.version,
	wrapperClassName: mdxEditorClassNames.wrapper,
	editorClassName: mdxEditorClassNames.editor,
	contentClassName: mdxEditorClassNames.content,
	toolbarClassName: mdxEditorClassNames.toolbar,
	pluginFeatures: markdownPluginFeatures,
	plugins: [
		...createBaseMarkdownPlugins(),
		...(options.viewMode === "source"
			? [diffSourcePlugin({ viewMode: "source", readOnlyDiff: options.readOnlySource ?? false })]
			: []),
	],
});
