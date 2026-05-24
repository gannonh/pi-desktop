// @vitest-environment jsdom

import { MDXEditor, type MDXEditorMethods } from "@mdxeditor/editor";
import { act, render, screen, waitFor } from "@testing-library/react";
import { createElement, useEffect, useRef } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createMarkdownEditorAdapterConfig } from "../../src/renderer/markdown/mdxeditor-adapter";
import { MarkdownSurface, type MarkdownSurfaceEditorActions } from "../../src/renderer/markdown/markdown-surface";

const representativeMarkdownFixture = [
	"# World-class Markdown",
	"",
	"A [Pi Desktop](https://github.com/gannonh/pi-desktop) document with **strong** Markdown coverage.",
	"",
	"- [x] preserve task lists",
	"- [ ] keep unchecked tasks",
	"",
	"> Markdown remains inspectable and editable.",
	"",
	"| Area | Status |",
	"| --- | --- |",
	"| Tables | Covered |",
	"| Links | Covered |",
	"",
	"```ts",
	"const markdown = 'source of truth';",
	"```",
	"",
].join("\n");

const expectedSerializedMarkdownFixture = [
	"# World-class Markdown",
	"",
	"A [Pi Desktop](https://github.com/gannonh/pi-desktop) document with **strong** Markdown coverage.",
	"",
	"* [x] preserve task lists",
	"* [ ] keep unchecked tasks",
	"",
	"> Markdown remains inspectable and editable.",
	"",
	"| Area   | Status  |",
	"| ------ | ------- |",
	"| Tables | Covered |",
	"| Links  | Covered |",
	"",
	"```ts",
	"const markdown = 'source of truth';",
	"```",
].join("\n");

type ConsoleMessage = {
	method: "error" | "warn";
	input: unknown[];
};

const consoleMessages: ConsoleMessage[] = [];

const knownMdxEditorActWarningComponents = new Set([
	"ForwardRef(ContentEditableElementImpl)",
	"Placeholder",
	"Popper",
	"Portal",
	"Presence",
	"RichTextPlugin",
	"Select",
	"SelectContent",
	"SelectItem",
	"SelectItemText",
	"SourceEditor",
	"Tooltip",
	"UndoRedo",
]);

const formatConsoleMessage = ({ method, input }: ConsoleMessage) =>
	`${method}: ${input.map((entry) => (entry instanceof Error ? entry.stack ?? entry.message : String(entry))).join(" ")}`;

const isKnownMdxEditorActWarning = ({ method, input }: ConsoleMessage) =>
	method === "error" &&
	typeof input[0] === "string" &&
	input[0].startsWith("An update to %s inside a test was not wrapped in act(...).") &&
	typeof input[1] === "string" &&
	knownMdxEditorActWarningComponents.has(input[1]);

beforeEach(() => {
	consoleMessages.length = 0;
	vi.spyOn(console, "error").mockImplementation((...input) => {
		consoleMessages.push({ method: "error", input });
	});
	vi.spyOn(console, "warn").mockImplementation((...input) => {
		consoleMessages.push({ method: "warn", input });
	});
});

afterEach(() => {
	const unexpectedMessages = consoleMessages.filter((message) => !isKnownMdxEditorActWarning(message));
	vi.restoreAllMocks();

	// MDXEditor 4.0.1 emits React act warnings from Radix/Lexical internals after mount in jsdom.
	// The product code cannot wrap those internal updates, so this guard suppresses only that exact
	// known warning shape and still fails the test on any other console warning or error.
	expect(unexpectedMessages.map(formatConsoleMessage)).toEqual([]);
});

beforeAll(() => {
	if (!Range.prototype.getClientRects) {
		Range.prototype.getClientRects = () => ({
			length: 0,
			item: () => null,
			[Symbol.iterator]: function* iterator() {},
		} as DOMRectList);
	}
});

interface MarkdownEditorProbeProps {
	markdown: string;
	onReady: (markdown: string) => void;
}

function MarkdownEditorProbe({ markdown, onReady }: MarkdownEditorProbeProps) {
	const config = createMarkdownEditorAdapterConfig();
	const editorRef = useRef<MDXEditorMethods>(null);

	useEffect(() => {
		onReady(editorRef.current?.getMarkdown() ?? "");
	}, [onReady]);

	return createElement(
		"div",
		{ className: config.wrapperClassName, "data-testid": "markdown-editor-spike" },
		createElement(MDXEditor, {
			ref: editorRef,
			markdown,
			plugins: config.plugins,
			className: config.editorClassName,
			contentEditableClassName: config.contentClassName,
			readOnly: true,
			trim: false,
			suppressHtmlProcessing: true,
		}),
	);
}

describe("MarkdownSurface", () => {
	it("configures rich authoring plugins for common Markdown operations", () => {
		const config = createMarkdownEditorAdapterConfig();

		expect(config.pluginFeatures).toEqual(
			expect.arrayContaining([
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
			]),
		);
	});

	it("renders preview mode through the rich editor and emits rich editor changes", async () => {
		const onChange = vi.fn();
		let richActions: MarkdownSurfaceEditorActions | null = null;

		render(
			<MarkdownSurface
				value={representativeMarkdownFixture}
				mode="preview"
				readOnly={false}
				relativePath="docs/README.md"
				onChange={onChange}
				onEditorReady={(role, actions) => {
					if (role === "rich") {
						richActions = actions;
					}
				}}
			/>,
		);

		const surface = screen.getByTestId("markdown-surface");
		expect(surface.getAttribute("data-mode")).toBe("preview");
		expect(surface.getAttribute("data-relative-path")).toBe("docs/README.md");
		expect(await screen.findByTestId("markdown-rich-editor")).not.toBeNull();
		expect(await screen.findByTestId("markdown-rich-toolbar")).not.toBeNull();
		expect(screen.getByLabelText("Markdown editing toolbar")).not.toBeNull();

		await waitFor(() => expect(richActions).not.toBeNull());
		act(() => richActions?.replaceMarkdown("## Updated from rich editor"));

		expect(onChange).toHaveBeenCalledWith("## Updated from rich editor");
	});

	it("renders source mode through a CodeMirror-backed editor and emits source changes", async () => {
		const onChange = vi.fn();
		let sourceActions: MarkdownSurfaceEditorActions | null = null;

		render(
			<MarkdownSurface
				value={representativeMarkdownFixture}
				mode="source"
				readOnly={false}
				relativePath="docs/README.md"
				onChange={onChange}
				onEditorReady={(role, actions) => {
					if (role === "source") {
						sourceActions = actions;
					}
				}}
			/>,
		);

		const sourceEditor = screen.getByTestId("markdown-source-editor");
		expect(sourceEditor.getAttribute("data-source-engine")).toBe("codemirror");
		expect(screen.getByLabelText("Markdown source for docs/README.md")).not.toBeNull();

		await waitFor(() => expect(sourceActions).not.toBeNull());
		act(() => sourceActions?.replaceMarkdown("# Updated source"));

		expect(onChange).toHaveBeenCalledWith("# Updated source");
	});

	it("renders split mode with source and rich editors sharing the same value callback", async () => {
		const onChange = vi.fn();
		let sourceActions: MarkdownSurfaceEditorActions | null = null;
		let richActions: MarkdownSurfaceEditorActions | null = null;

		render(
			<MarkdownSurface
				value={representativeMarkdownFixture}
				mode="split"
				readOnly={false}
				relativePath="docs/README.md"
				onChange={onChange}
				onEditorReady={(role, actions) => {
					if (role === "source") {
						sourceActions = actions;
					}
					if (role === "rich") {
						richActions = actions;
					}
				}}
			/>,
		);

		expect(screen.getByTestId("markdown-split-editor")).not.toBeNull();
		expect(screen.getByTestId("markdown-source-editor")).not.toBeNull();
		expect(screen.getByTestId("markdown-rich-editor")).not.toBeNull();

		await waitFor(() => {
			expect(sourceActions).not.toBeNull();
			expect(richActions).not.toBeNull();
		});
		act(() => sourceActions?.replaceMarkdown("# Split source edit"));
		act(() => richActions?.replaceMarkdown("# Split rich edit"));

		expect(onChange).toHaveBeenCalledWith("# Split source edit");
		expect(onChange).toHaveBeenCalledWith("# Split rich edit");
	});

	it("prevents preview links from navigating the renderer and reports the href", async () => {
		const onLinkClick = vi.fn();

		render(
			<MarkdownSurface
				value={representativeMarkdownFixture}
				mode="preview"
				readOnly={false}
				relativePath="docs/README.md"
				onChange={vi.fn()}
				onLinkClick={onLinkClick}
			/>,
		);

		const link = await screen.findByRole("link", { name: "Pi Desktop" });
		const click = new MouseEvent("click", { bubbles: true, cancelable: true });
		const dispatched = link.dispatchEvent(click);

		expect(dispatched).toBe(false);
		expect(click.defaultPrevented).toBe(true);
		expect(onLinkClick).toHaveBeenCalledWith("https://github.com/gannonh/pi-desktop");
	});

	it("surfaces rich editor parse errors and preserves source recovery guidance", async () => {
		const onError = vi.fn();
		let richActions: MarkdownSurfaceEditorActions | null = null;

		render(
			<MarkdownSurface
				value={representativeMarkdownFixture}
				mode="preview"
				readOnly={false}
				relativePath="docs/README.md"
				onChange={vi.fn()}
				onError={onError}
				onEditorReady={(role, actions) => {
					if (role === "rich") {
						richActions = actions;
					}
				}}
			/>,
		);

		await waitFor(() => expect(richActions).not.toBeNull());
		act(() => richActions?.reportParseError("Unsupported Markdown construct", "<custom-block />"));

		const alert = screen.getByRole("alert");
		expect(alert.textContent).toContain("Unsupported Markdown construct");
		expect(alert.textContent).toContain("Switch to Markdown or Split mode to recover the source.");
		expect(onError).toHaveBeenCalledWith("Unsupported Markdown construct", "<custom-block />");
	});

	it("disables editor changes in read-only split mode", async () => {
		const onChange = vi.fn();
		let sourceActions: MarkdownSurfaceEditorActions | null = null;
		let richActions: MarkdownSurfaceEditorActions | null = null;

		render(
			<MarkdownSurface
				value={representativeMarkdownFixture}
				mode="split"
				readOnly={true}
				relativePath="docs/README.md"
				onChange={onChange}
				onEditorReady={(role, actions) => {
					if (role === "source") {
						sourceActions = actions;
					}
					if (role === "rich") {
						richActions = actions;
					}
				}}
			/>,
		);

		expect(screen.getByTestId("markdown-source-editor").getAttribute("data-readonly")).toBe("true");
		expect(screen.getByTestId("markdown-rich-editor").getAttribute("data-readonly")).toBe("true");

		await waitFor(() => {
			expect(sourceActions).not.toBeNull();
			expect(richActions).not.toBeNull();
		});
		act(() => sourceActions?.replaceMarkdown("# Blocked source edit"));
		act(() => richActions?.replaceMarkdown("# Blocked rich edit"));

		expect(onChange).not.toHaveBeenCalled();
	});
});

describe("Markdown editor dependency spike", () => {
	it("creates an MDXEditor plugin set inside a Pi Desktop wrapper scope", () => {
		const config = createMarkdownEditorAdapterConfig();

		expect(config.wrapperClassName).toBe("markdown-surface markdown-surface--mdxeditor");
		expect(config.editorClassName).toBe("markdown-surface__editor");
		expect(config.contentClassName).toBe("markdown-surface__content");
		expect(config.plugins.length).toBeGreaterThanOrEqual(10);
		expect(config.packageName).toBe("@mdxeditor/editor");
		expect(config.packageVersion).toBe("4.0.1");
	});

	it("round-trips the representative Markdown fixture through the selected editor package", async () => {
		let serialized = "";

		render(
			createElement(MarkdownEditorProbe, {
				markdown: representativeMarkdownFixture,
				onReady: (value) => {
					serialized = value;
				},
			}),
		);

		await waitFor(() => expect(serialized).toContain("# World-class Markdown"));
		expect(serialized).toBe(expectedSerializedMarkdownFixture);
	});
});
