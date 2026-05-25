// @vitest-environment jsdom

import { EditorView } from "@codemirror/view";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createUnavailablePiDesktopApi } from "../../src/renderer/app-api/unavailable-api";
import { useFileWorkspace } from "../../src/renderer/file-workspace/file-workspace-context";
import { FileWorkspacePanel } from "../../src/renderer/file-workspace/file-workspace-panel";
import type { ProjectRecord } from "../../src/shared/project-state";
import {
	captureConsoleMessages,
	ensureRangeClientRects,
	expectNoUnexpectedConsoleMessages,
	isKnownFileWorkspaceSelectionWarning,
	type ConsoleMessage,
} from "./console-test-guard";
import { ShellTestProviders } from "./shell-test-providers";

function TabCloseHarness() {
	const { closeTab } = useFileWorkspace();
	return (
		<button type="button" onClick={() => closeTab("file:notes.txt")}>
			Close notes.txt
		</button>
	);
}

beforeAll(ensureRangeClientRects);

let consoleMessages: ConsoleMessage[];

beforeEach(() => {
	consoleMessages = captureConsoleMessages();
});

afterEach(() => {
	expectNoUnexpectedConsoleMessages(consoleMessages, isKnownFileWorkspaceSelectionWarning);
});

const replaceCodeEditorSource = async (source: string) => {
	const editor = await screen.findByTestId("code-file-editor");
	const view = EditorView.findFromDOM(editor);
	if (!view) {
		throw new Error("CodeMirror editor view was not mounted.");
	}

	act(() => {
		view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: source } });
	});
};

const project: ProjectRecord = {
	id: "project:/tmp/pi-desktop",
	displayName: "pi-desktop",
	path: "/tmp/pi-desktop",
	createdAt: "2026-05-12T00:00:00.000Z",
	updatedAt: "2026-05-12T00:00:00.000Z",
	lastOpenedAt: "2026-05-12T00:00:00.000Z",
	pinned: false,
	availability: { status: "available", checkedAt: "2026-05-12T00:00:00.000Z" },
};

describe("file workspace interactions", () => {
	it("loads the root listing and opens a Markdown file from the explorer", async () => {
		const readFile = vi.fn(async () => ({
			ok: true as const,
			data: { kind: "text" as const, content: "# Agent\n", size: 8 },
		}));
		const listDirectory = vi.fn(async ({ relativePath }: { relativePath: string }) => ({
			ok: true as const,
			data: {
				entries:
					relativePath === ""
						? [{ name: "AGENTS.md", relativePath: "AGENTS.md", kind: "file" as const }]
						: [],
			},
		}));

		window.piDesktop = {
			...createUnavailablePiDesktopApi("test"),
			workspaceFiles: { listDirectory, readFile, writeFile: vi.fn() },
		};

		render(
			<ShellTestProviders project={project}>
				<FileWorkspacePanel project={project} />
			</ShellTestProviders>,
		);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: /AGENTS\.md/ })).toBeTruthy();
		});

		fireEvent.click(screen.getByRole("button", { name: /AGENTS\.md/ }));

		await waitFor(() => {
			expect(readFile).toHaveBeenCalledWith({
				projectId: project.id,
				relativePath: "AGENTS.md",
			});
		});

		expect(screen.getByTestId("markdown-surface").getAttribute("data-mode")).toBe("preview");
	});

	it("does not close a dirty non-Markdown tab when discard is cancelled", async () => {
		const readFile = vi.fn(async () => ({
			ok: true as const,
			data: { kind: "text" as const, content: "notes\n", size: 6 },
		}));
		const listDirectory = vi.fn(async ({ relativePath }: { relativePath: string }) => ({
			ok: true as const,
			data: {
				entries:
					relativePath === ""
						? [{ name: "notes.txt", relativePath: "notes.txt", kind: "file" as const }]
						: [],
			},
		}));
		const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

		window.piDesktop = {
			...createUnavailablePiDesktopApi("test"),
			workspaceFiles: { listDirectory, readFile, writeFile: vi.fn() },
		};

		render(
			<ShellTestProviders project={project}>
				<FileWorkspacePanel project={project} />
				<TabCloseHarness />
			</ShellTestProviders>,
		);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: /notes\.txt/ })).toBeTruthy();
		});

		const explorer = screen.getByTestId("file-explorer");
		fireEvent.click(within(explorer).getByRole("button", { name: /notes\.txt/ }));
		await replaceCodeEditorSource("notes\nedited\n");

		fireEvent.click(screen.getByRole("button", { name: "Close notes.txt" }));

		expect(screen.getByTestId("code-file-editor")).toBeTruthy();
		expect(confirm).toHaveBeenCalled();
		confirm.mockRestore();
	});

	it("saves the active non-Markdown file on Cmd+S", async () => {
		const writeFile = vi.fn(async () => ({
			ok: true as const,
			data: { relativePath: "notes.txt", size: 13 },
		}));
		const readFile = vi.fn(async () => ({
			ok: true as const,
			data: { kind: "text" as const, content: "notes\n", size: 6 },
		}));
		const listDirectory = vi.fn(async ({ relativePath }: { relativePath: string }) => ({
			ok: true as const,
			data: {
				entries:
					relativePath === ""
						? [{ name: "notes.txt", relativePath: "notes.txt", kind: "file" as const }]
						: [],
			},
		}));

		window.piDesktop = {
			...createUnavailablePiDesktopApi("test"),
			workspaceFiles: { listDirectory, readFile, writeFile },
		};

		render(
			<ShellTestProviders project={project}>
				<FileWorkspacePanel project={project} />
			</ShellTestProviders>,
		);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: /notes\.txt/ })).toBeTruthy();
		});

		fireEvent.click(screen.getByRole("button", { name: /notes\.txt/ }));

		await replaceCodeEditorSource("notes\nedited\n");
		fireEvent.keyDown(window, { key: "s", metaKey: true });

		await waitFor(() => {
			expect(writeFile).toHaveBeenCalledWith({
				projectId: project.id,
				relativePath: "notes.txt",
				content: "notes\nedited\n",
			});
		});
		expect(screen.queryByText("Saved")).toBeNull();
	});
});
