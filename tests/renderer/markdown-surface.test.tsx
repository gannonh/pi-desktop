// @vitest-environment jsdom

import { MDXEditor, type MDXEditorMethods } from "@mdxeditor/editor";
import { render, waitFor } from "@testing-library/react";
import { createElement, useEffect, useRef } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { createMarkdownEditorAdapterConfig } from "../../src/renderer/markdown/mdxeditor-adapter";

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

describe("Markdown editor dependency spike", () => {
	it("creates an MDXEditor plugin set inside a Pi Desktop wrapper scope", () => {
		const config = createMarkdownEditorAdapterConfig();

		expect(config.wrapperClassName).toBe("markdown-surface markdown-surface--mdxeditor");
		expect(config.editorClassName).toBe("markdown-surface__editor");
		expect(config.contentClassName).toBe("markdown-surface__content");
		expect(config.plugins.length).toBeGreaterThanOrEqual(7);
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
