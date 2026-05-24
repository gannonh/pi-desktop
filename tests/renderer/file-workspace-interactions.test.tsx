// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createUnavailablePiDesktopApi } from "../../src/renderer/app-api/unavailable-api";
import { useFileWorkspace } from "../../src/renderer/file-workspace/file-workspace-context";
import { FileWorkspacePanel } from "../../src/renderer/file-workspace/file-workspace-panel";
import { ShellTestProviders } from "./shell-test-providers";
import type { ProjectRecord } from "../../src/shared/project-state";

function TabCloseHarness() {
	const { closeTab } = useFileWorkspace();
	return (
		<button type="button" onClick={() => closeTab("file:notes.txt")}>
			Close notes.txt
		</button>
	);
}

beforeAll(() => {
	if (!Range.prototype.getClientRects) {
		Range.prototype.getClientRects = () => ({
			length: 0,
			item: () => null,
			[Symbol.iterator]: function* iterator() {},
		} as DOMRectList);
	}
});

type ConsoleMessage = {
	method: "error" | "warn";
	input: unknown[];
};

const consoleMessages: ConsoleMessage[] = [];

const formatConsoleMessage = ({ method, input }: ConsoleMessage) =>
	`${method}: ${input.map((entry) => (entry instanceof Error ? entry.stack ?? entry.message : String(entry))).join(" ")}`;

const isKnownFileWorkspaceSelectionWarning = ({ method, input }: ConsoleMessage) =>
	method === "error" &&
	typeof input[0] === "string" &&
	input[0].startsWith("Cannot update a component (`%s`) while rendering a different component (`%s`).") &&
	input[1] === "RightPanelProvider" &&
	input[2] === "FileWorkspaceProvider";

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
	const unexpectedMessages = consoleMessages.filter((message) => !isKnownFileWorkspaceSelectionWarning(message));
	vi.restoreAllMocks();

	expect(unexpectedMessages.map(formatConsoleMessage)).toEqual([]);
});

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
		const editor = await screen.findByTestId("file-editor-source");
		fireEvent.change(editor, { target: { value: "notes\nedited\n" } });

		fireEvent.click(screen.getByRole("button", { name: "Close notes.txt" }));

		expect(screen.getByTestId("file-editor-source")).toBeTruthy();
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

		const editor = await screen.findByTestId("file-editor-source");
		fireEvent.change(editor, { target: { value: "notes\nedited\n" } });
		fireEvent.keyDown(window, { key: "s", metaKey: true });

		await waitFor(() => {
			expect(writeFile).toHaveBeenCalledWith({
				projectId: project.id,
				relativePath: "notes.txt",
				content: "notes\nedited\n",
			});
		});
	});
});
