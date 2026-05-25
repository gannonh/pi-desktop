// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CodeFileEditor, type CodeFileEditorActions } from "../../src/renderer/code-editor/code-file-editor";
import { ensureRangeClientRects } from "./console-test-guard";

beforeAll(ensureRangeClientRects);

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
		const actionsRef: { current: CodeFileEditorActions | null } = { current: null };

		render(
			<CodeFileEditor
				value={'const answer = 42;\n'}
				relativePath="src/answer.ts"
				readOnly={false}
				onChange={onChange}
				onEditorReady={(nextActions) => {
					actionsRef.current = nextActions;
				}}
			/>,
		);

		await waitFor(() => expect(actionsRef.current).not.toBeNull());
		const editorActions = actionsRef.current;
		if (!editorActions) {
			throw new Error("Code editor actions were not registered.");
		}
		act(() => editorActions.replaceSource('const answer = 43;\n'));

		expect(onChange).toHaveBeenCalledWith('const answer = 43;\n');
		expect(editorActions.getSource()).toBe('const answer = 43;\n');
	});

	it("keeps read-only editor documents unchanged", async () => {
		const onChange = vi.fn();
		const actionsRef: { current: CodeFileEditorActions | null } = { current: null };

		render(
			<CodeFileEditor
				value={"readonly\n"}
				relativePath="README"
				readOnly={true}
				onChange={onChange}
				onEditorReady={(nextActions) => {
					actionsRef.current = nextActions;
				}}
			/>,
		);

		const editor = await screen.findByTestId("code-file-editor");
		expect(editor.getAttribute("data-readonly")).toBe("true");

		await waitFor(() => expect(actionsRef.current).not.toBeNull());
		const editorActions = actionsRef.current;
		if (!editorActions) {
			throw new Error("Code editor actions were not registered.");
		}
		act(() => editorActions.replaceSource("mutated\n"));

		expect(onChange).not.toHaveBeenCalled();
		expect(editorActions.getSource()).toBe("readonly\n");
	});
});
