// @vitest-environment jsdom

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { act, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CodeFileEditor } from "../../src/renderer/code-editor/code-file-editor";
import { ensureRangeClientRects } from "./console-test-guard";

beforeAll(ensureRangeClientRects);

function getCodeMirrorView(): EditorView {
	const editor = screen.getByTestId("code-file-editor");
	const view = EditorView.findFromDOM(editor);
	if (!view) {
		throw new Error("CodeMirror editor view was not mounted.");
	}
	return view;
}

describe("CodeFileEditor", () => {
	it("renders a CodeMirror editor with stable language metadata", async () => {
		render(<CodeFileEditor value={'const answer: number = 42;\n'} relativePath="src/answer.ts" readOnly={false} onChange={vi.fn()} />);

		const editor = await screen.findByTestId("code-file-editor");
		expect(editor.getAttribute("data-editor-engine")).toBe("codemirror");
		expect(editor.getAttribute("data-language-id")).toBe("typescript");
		expect(editor.getAttribute("data-language-label")).toBe("TypeScript");
		expect(screen.getByText("TypeScript")).toBeTruthy();
		expect(screen.getByLabelText("Code editor for src/answer.ts")).toBeTruthy();
	});

	it("emits source changes from the editor document", async () => {
		const onChange = vi.fn();

		render(
			<CodeFileEditor
				value={'const answer = 42;\n'}
				relativePath="src/answer.ts"
				readOnly={false}
				onChange={onChange}
			/>,
		);

		await screen.findByTestId("code-file-editor");
		const view = getCodeMirrorView();
		act(() => {
			view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: 'const answer = 43;\n' } });
		});

		expect(onChange).toHaveBeenCalledWith('const answer = 43;\n');
		expect(view.state.doc.toString()).toBe('const answer = 43;\n');
	});

	it("syncs parent-driven value updates without emitting editor changes", async () => {
		const onChange = vi.fn();
		const { rerender } = render(
			<CodeFileEditor value={"first\n"} relativePath="src/first.ts" readOnly={false} onChange={onChange} />,
		);

		await screen.findByTestId("code-file-editor");
		let view = getCodeMirrorView();
		expect(view.state.doc.toString()).toBe("first\n");

		rerender(<CodeFileEditor value={"second\n"} relativePath="src/second.ts" readOnly={false} onChange={onChange} />);

		view = getCodeMirrorView();
		expect(view.state.doc.toString()).toBe("second\n");
		expect(screen.getByTestId("code-file-editor").getAttribute("data-language-id")).toBe("typescript");
		expect(onChange).not.toHaveBeenCalled();
	});

	it("marks read-only editor documents as non-editable", async () => {
		const onChange = vi.fn();

		render(<CodeFileEditor value={"readonly\n"} relativePath="README" readOnly={true} onChange={onChange} />);

		const editor = await screen.findByTestId("code-file-editor");
		const view = getCodeMirrorView();

		expect(editor.getAttribute("data-readonly")).toBe("true");
		expect(view.state.facet(EditorState.readOnly)).toBe(true);
		expect(view.state.facet(EditorView.editable)).toBe(false);
		expect(onChange).not.toHaveBeenCalled();
	});
});
