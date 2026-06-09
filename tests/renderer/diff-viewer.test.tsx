// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiffViewer } from "../../src/renderer/file-workspace/diff-viewer";
import type { FileDiffTab } from "../../src/renderer/file-workspace/file-workspace-types";

const baseTab = (overrides: Partial<FileDiffTab> = {}): FileDiffTab => ({
	kind: "diff",
	id: "diff:unstaged:README.md",
	relativePath: "README.md",
	title: "README.md • Unstaged",
	dirty: false,
	savedContent: "",
	buffer: "",
	status: "loaded",
	viewMode: "source",
	readOnly: true,
	diffKind: "unstaged",
	diff: {
		kind: "text",
		path: "README.md",
		title: "README.md (unstaged)",
		diffKind: "unstaged",
		patch: "@@\n-old\n+new\n",
	},
	...overrides,
});

describe("DiffViewer", () => {
	it("renders text patches with metadata", () => {
		render(<DiffViewer tab={baseTab()} />);

		expect(screen.getByTestId("file-diff-meta").textContent).toContain("README.md");
		expect(screen.getByTestId("file-diff-meta").textContent).toContain("Unstaged");
		expect(screen.getByTestId("file-diff-viewer").textContent).toContain("+new");
	});

	it("shows an empty diff state", () => {
		render(
			<DiffViewer
				tab={baseTab({
					diff: {
						kind: "text",
						path: "README.md",
						title: "README.md (staged)",
						diffKind: "staged",
						patch: "   \n",
					},
				})}
			/>,
		);

		expect(screen.getByTestId("file-diff-state").textContent).toContain("No changes in this diff.");
	});

	it("shows unsupported diff states", () => {
		render(
			<DiffViewer
				tab={baseTab({
					diff: {
						kind: "binary",
						path: "logo.png",
						title: "logo.png (unstaged)",
						diffKind: "unstaged",
						message: "Binary file diffs are not displayed.",
					},
				})}
			/>,
		);

		expect(screen.getByTestId("file-diff-state").textContent).toContain("Binary file diffs are not displayed.");
	});
});
