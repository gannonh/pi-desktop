import "./prism-global";

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
	type IconKey,
	type RealmPlugin,
	type ViewMode,
} from "@mdxeditor/editor";
import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Check,
	ChevronDown,
	Code2,
	Columns3,
	Copy,
	ExternalLink,
	FileCode2,
	FileText,
	GitCompare,
	Highlighter,
	ImagePlus,
	Italic,
	Link,
	List,
	ListChecks,
	ListOrdered,
	MessageSquareWarning,
	Minus,
	MoreHorizontal,
	MoreVertical,
	PanelLeft,
	PanelTop,
	Pencil,
	Redo2,
	Rows3,
	Settings,
	Strikethrough,
	Subscript,
	Superscript,
	Table2,
	Text,
	Trash,
	Trash2,
	Underline,
	Undo2,
	Unlink,
	X,
	type LucideIcon,
} from "lucide-react";
import { Fragment, createElement, type ComponentProps, type ReactElement } from "react";
import { MarkdownCodeBlockEditor } from "./markdown-code-block";
import { markdownImagePreviewHandler } from "./markdown-image-policy";

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
	iconComponentFor: (name: IconKey) => ReactElement;
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

const mdxEditorIconMap: Record<IconKey, LucideIcon> = {
	undo: Undo2,
	redo: Redo2,
	format_bold: Bold,
	format_italic: Italic,
	format_underlined: Underline,
	code: Code2,
	strikeThrough: Strikethrough,
	superscript: Superscript,
	subscript: Subscript,
	format_list_bulleted: List,
	format_list_numbered: ListOrdered,
	format_list_checked: ListChecks,
	format_highlight: Highlighter,
	link: Link,
	add_photo: ImagePlus,
	table: Table2,
	horizontal_rule: Minus,
	frontmatter: FileText,
	frame_source: FileCode2,
	arrow_drop_down: ChevronDown,
	admonition: MessageSquareWarning,
	rich_text: Text,
	difference: GitCompare,
	markdown: FileText,
	open_in_new: ExternalLink,
	link_off: Unlink,
	edit: Pencil,
	content_copy: Copy,
	more_horiz: MoreHorizontal,
	more_vert: MoreVertical,
	close: X,
	settings: Settings,
	delete_big: Trash2,
	delete_small: Trash,
	format_align_center: AlignCenter,
	format_align_left: AlignLeft,
	format_align_right: AlignRight,
	add_row: Rows3,
	add_column: Columns3,
	insert_col_left: PanelLeft,
	insert_row_above: PanelTop,
	insert_row_below: PanelTop,
	insert_col_right: PanelLeft,
	check: Check,
};

type MdxEditorLucideIconProps = ComponentProps<LucideIcon> & { "data-mdxeditor-icon": IconKey };

export const iconComponentFor = (name: IconKey): ReactElement => {
	const Icon = mdxEditorIconMap[name];
	const props: MdxEditorLucideIconProps = {
		"aria-hidden": true,
		className: "markdown-surface__icon",
		"data-mdxeditor-icon": name,
		strokeWidth: 1.75,
	};
	return createElement(Icon, props);
};

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
	imagePlugin({
		disableImageResize: true,
		disableImageSettingsButton: true,
		imagePreviewHandler: markdownImagePreviewHandler,
	}),
	tablePlugin(),
	thematicBreakPlugin(),
	codeBlockPlugin({
		defaultCodeBlockLanguage: "ts",
		codeBlockEditorDescriptors: [
			{
				priority: 100,
				match: () => true,
				Editor: MarkdownCodeBlockEditor,
			},
		],
	}),
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
	iconComponentFor,
	plugins: [
		...createBaseMarkdownPlugins(),
		...(options.viewMode === "source"
			? [diffSourcePlugin({ viewMode: "source", readOnlyDiff: options.readOnlySource ?? false })]
			: []),
	],
});
