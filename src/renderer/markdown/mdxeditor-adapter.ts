import {
	codeBlockPlugin,
	codeMirrorPlugin,
	diffSourcePlugin,
	headingsPlugin,
	linkPlugin,
	listsPlugin,
	markdownShortcutPlugin,
	quotePlugin,
	tablePlugin,
	thematicBreakPlugin,
	type RealmPlugin,
	type ViewMode,
} from "@mdxeditor/editor";

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
} as const;

export type MarkdownEditorAdapterConfig = {
	packageName: typeof mdxEditorPackage.name;
	packageVersion: typeof mdxEditorPackage.version;
	wrapperClassName: typeof mdxEditorClassNames.wrapper;
	editorClassName: typeof mdxEditorClassNames.editor;
	contentClassName: typeof mdxEditorClassNames.content;
	plugins: RealmPlugin[];
};

export type MarkdownEditorAdapterOptions = {
	viewMode?: Extract<ViewMode, "rich-text" | "source">;
	readOnlySource?: boolean;
};

const createBaseMarkdownPlugins = (): RealmPlugin[] => [
	headingsPlugin(),
	listsPlugin(),
	quotePlugin(),
	linkPlugin(),
	tablePlugin(),
	thematicBreakPlugin(),
	codeBlockPlugin({ defaultCodeBlockLanguage: "ts" }),
	codeMirrorPlugin({
		codeBlockLanguages: { markdown: "Markdown", ts: "TypeScript", js: "JavaScript", bash: "Shell" },
		autoLoadLanguageSupport: false,
	}),
	markdownShortcutPlugin(),
];

export const createMarkdownEditorAdapterConfig = (
	options: MarkdownEditorAdapterOptions = {},
): MarkdownEditorAdapterConfig => ({
	packageName: mdxEditorPackage.name,
	packageVersion: mdxEditorPackage.version,
	wrapperClassName: mdxEditorClassNames.wrapper,
	editorClassName: mdxEditorClassNames.editor,
	contentClassName: mdxEditorClassNames.content,
	plugins: [
		...createBaseMarkdownPlugins(),
		...(options.viewMode === "source"
			? [diffSourcePlugin({ viewMode: "source", readOnlyDiff: options.readOnlySource ?? false })]
			: []),
	],
});
