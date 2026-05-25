// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { FileEditor } from "../../src/renderer/file-workspace/file-editor";
import type { FileEditorTab } from "../../src/renderer/file-workspace/file-workspace-types";
import { ensureRangeClientRects } from "./console-test-guard";

beforeAll(ensureRangeClientRects);

const loadedTab = (relativePath: string, buffer = "content\n"): FileEditorTab => ({
	id: `file:${relativePath}`,
	relativePath,
	title: relativePath.split("/").pop() ?? relativePath,
	dirty: false,
	savedContent: buffer,
	buffer,
	status: "loaded",
	viewMode: "preview",
	readOnly: false,
	loadKind: "text",
});

describe("FileEditor routing", () => {
	it("routes non-Markdown source files to the CodeMirror editor", async () => {
		render(<FileEditor tab={loadedTab("src/app.ts", "const app = true;\n")} onChange={vi.fn()} />);

		const editor = await screen.findByTestId("code-file-editor");
		expect(editor.getAttribute("data-editor-engine")).toBe("codemirror");
		expect(editor.getAttribute("data-language-id")).toBe("typescript");
		expect(screen.queryByTestId("file-editor-source")).toBeNull();
	});

	it("keeps Markdown files on the Markdown surface", async () => {
		render(<FileEditor tab={loadedTab("docs/spec.md", "# Spec\n")} onChange={vi.fn()} />);

		expect(await screen.findByTestId("markdown-surface")).toBeTruthy();
		expect(screen.queryByTestId("code-file-editor")).toBeNull();
	});
});
