// @vitest-environment jsdom

import { MDXEditor, type MDXEditorMethods } from "@mdxeditor/editor";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement, isValidElement, useEffect, useRef } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createUnavailablePiDesktopApi } from "../../src/renderer/app-api/unavailable-api";
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

const codeBlockFixture = ["```ts", "const markdown = 'source of truth';", "```"].join("\n");

const relativeImageFixture = "![Architecture diagram](./images/architecture.png)";

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
	Reflect.deleteProperty(window, "piDesktop");
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

	it("provides lucide-backed icons for MDXEditor toolbar controls", () => {
		const config = createMarkdownEditorAdapterConfig();

		expect(config.iconComponentFor).toBeTypeOf("function");
		const undoIcon = config.iconComponentFor("undo");
		const tableIcon = config.iconComponentFor("table");

		expect(isValidElement(undoIcon)).toBe(true);
		expect(isValidElement(tableIcon)).toBe(true);
		const undoIconProps = undoIcon.props as Record<string, unknown>;
		const tableIconProps = tableIcon.props as Record<string, unknown>;
		expect(undoIconProps["aria-hidden"]).toBe(true);
		expect(tableIconProps["data-mdxeditor-icon"]).toBe("table");
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
		const toolbar = await screen.findByTestId("markdown-rich-toolbar");
		expect(toolbar).not.toBeNull();
		expect(toolbar.querySelector('[data-mdxeditor-icon="undo"]')).not.toBeNull();
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

		const sourceEditor = await screen.findByTestId("markdown-source-editor");
		expect(sourceEditor.getAttribute("data-source-engine")).toBe("codemirror");
		expect(await screen.findByLabelText("Markdown source for docs/README.md")).not.toBeNull();

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

		expect(await screen.findByTestId("markdown-split-editor")).not.toBeNull();
		expect(await screen.findByTestId("markdown-source-editor")).not.toBeNull();
		expect(await screen.findByTestId("markdown-rich-editor")).not.toBeNull();

		await waitFor(() => {
			expect(sourceActions).not.toBeNull();
			expect(richActions).not.toBeNull();
		});
		act(() => sourceActions?.replaceMarkdown("# Split source edit"));
		act(() => richActions?.replaceMarkdown("# Split rich edit"));

		expect(onChange).toHaveBeenCalledWith("# Split source edit");
		expect(onChange).toHaveBeenCalledWith("# Split rich edit");
	});

	it("copies rich code block contents and shows success feedback", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

		render(
			<MarkdownSurface
				value={codeBlockFixture}
				mode="preview"
				readOnly={false}
				relativePath="docs/README.md"
				onChange={vi.fn()}
			/>,
		);

		const copyButton = await screen.findByRole("button", { name: "Copy ts code block" });
		expect(screen.getByText("ts")).not.toBeNull();
		fireEvent.click(copyButton);

		await waitFor(() => expect(writeText).toHaveBeenCalledWith("const markdown = 'source of truth';"));
		expect(await screen.findByText("Copied code block.")).not.toBeNull();
	});

	it("copies rich code block contents through the desktop clipboard bridge", async () => {
		const writeText = vi.fn().mockResolvedValue({ ok: true, data: { written: true } });
		window.piDesktop = {
			...createUnavailablePiDesktopApi("test"),
			clipboard: { writeText },
		};
		Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });

		render(
			<MarkdownSurface
				value={codeBlockFixture}
				mode="preview"
				readOnly={false}
				relativePath="docs/README.md"
				onChange={vi.fn()}
			/>,
		);

		fireEvent.click(await screen.findByRole("button", { name: "Copy ts code block" }));

		await waitFor(() => expect(writeText).toHaveBeenCalledWith({ text: "const markdown = 'source of truth';" }));
		expect(await screen.findByText("Copied code block.")).not.toBeNull();
	});

	it("shows failure feedback when rich code block copy fails", async () => {
		const writeText = vi.fn().mockRejectedValue(new Error("clipboard unavailable"));
		Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

		render(
			<MarkdownSurface
				value={codeBlockFixture}
				mode="preview"
				readOnly={false}
				relativePath="docs/README.md"
				onChange={vi.fn()}
			/>,
		);

		fireEvent.click(await screen.findByRole("button", { name: "Copy ts code block" }));

		expect(await screen.findByText("Copy failed. Use Markdown mode to copy source.")).not.toBeNull();
	});

	it("shows clear unsupported messaging for relative image previews", async () => {
		render(
			<MarkdownSurface
				value={relativeImageFixture}
				mode="preview"
				readOnly={false}
				relativePath="docs/README.md"
				onChange={vi.fn()}
			/>,
		);

		const notice = await screen.findByTestId("markdown-image-notice");
		expect(notice.textContent).toContain("Local image previews are not available yet.");
		expect(notice.textContent).toContain("./images/architecture.png");
		expect(notice.textContent).toContain("Markdown mode keeps the image source editable.");
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

	it("falls back to editable source mode after a rich editor parse error", async () => {
		const onChange = vi.fn();
		const onError = vi.fn();
		let richActions: MarkdownSurfaceEditorActions | null = null;
		let sourceActions: MarkdownSurfaceEditorActions | null = null;

		render(
			<MarkdownSurface
				value={representativeMarkdownFixture}
				mode="preview"
				readOnly={false}
				relativePath="docs/README.md"
				onChange={onChange}
				onError={onError}
				onEditorReady={(role, actions) => {
					if (role === "rich") {
						richActions = actions;
					}
					if (role === "source") {
						sourceActions = actions;
					}
				}}
			/>,
		);

		await waitFor(() => expect(richActions).not.toBeNull());
		act(() => richActions?.reportParseError("Unsupported Markdown construct", "<custom-block />"));

		const alert = screen.getByRole("alert");
		expect(alert.textContent).toContain("Unsupported Markdown construct");
		expect(alert.textContent).toContain("Editing source mode keeps the current Markdown saveable.");
		expect(screen.queryByTestId("markdown-rich-editor")).toBeNull();
		expect(screen.getByTestId("markdown-source-editor")).not.toBeNull();
		await waitFor(() => expect(sourceActions).not.toBeNull());

		act(() => sourceActions?.replaceMarkdown("# Recovered source edit"));

		expect(onChange).toHaveBeenCalledWith("# Recovered source edit");
		expect(onError).toHaveBeenCalledWith("Unsupported Markdown construct", "<custom-block />");
	});

	it("clears stale parse errors when the Markdown file path changes", async () => {
		let richActions: MarkdownSurfaceEditorActions | null = null;
		const { rerender } = render(
			<MarkdownSurface
				value={representativeMarkdownFixture}
				mode="preview"
				readOnly={false}
				relativePath="docs/README.md"
				onChange={vi.fn()}
				onEditorReady={(role, actions) => {
					if (role === "rich") {
						richActions = actions;
					}
				}}
			/>,
		);

		await waitFor(() => expect(richActions).not.toBeNull());
		act(() => richActions?.reportParseError("Unsupported Markdown construct", "<custom-block />"));
		expect(screen.getByRole("alert").textContent).toContain("Unsupported Markdown construct");
		expect(screen.queryByTestId("markdown-rich-editor")).toBeNull();

		rerender(
			<MarkdownSurface
				value="# New file"
				mode="preview"
				readOnly={false}
				relativePath="docs/NEXT.md"
				onChange={vi.fn()}
			/>,
		);

		await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
		expect(screen.getByTestId("markdown-rich-editor")).not.toBeNull();
		expect(screen.queryByTestId("markdown-source-editor")).toBeNull();
	});

	it("clears stale parse errors after fallback source edits are emitted", async () => {
		const onChange = vi.fn();
		let richActions: MarkdownSurfaceEditorActions | null = null;
		let sourceActions: MarkdownSurfaceEditorActions | null = null;

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
					if (role === "source") {
						sourceActions = actions;
					}
				}}
			/>,
		);

		await waitFor(() => expect(richActions).not.toBeNull());
		act(() => richActions?.reportParseError("Unsupported Markdown construct", "<custom-block />"));
		await waitFor(() => expect(sourceActions).not.toBeNull());

		act(() => sourceActions?.replaceMarkdown("# Recovered source edit"));

		expect(onChange).toHaveBeenCalledWith("# Recovered source edit");
		await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
		expect(screen.getByTestId("markdown-rich-editor")).not.toBeNull();
		expect(screen.queryByTestId("markdown-source-editor")).toBeNull();
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
