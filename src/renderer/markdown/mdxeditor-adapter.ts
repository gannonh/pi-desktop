import {
	codeBlockPlugin,
	codeMirrorPlugin,
	headingsPlugin,
	linkPlugin,
	listsPlugin,
	markdownShortcutPlugin,
	quotePlugin,
	tablePlugin,
	thematicBreakPlugin,
	type RealmPlugin,
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

export const createMarkdownEditorAdapterConfig = (): MarkdownEditorAdapterConfig => ({
	packageName: mdxEditorPackage.name,
	packageVersion: mdxEditorPackage.version,
	wrapperClassName: mdxEditorClassNames.wrapper,
	editorClassName: mdxEditorClassNames.editor,
	contentClassName: mdxEditorClassNames.content,
	plugins: [
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
	],
});
