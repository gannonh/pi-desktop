// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createUnavailablePiDesktopApi } from "../../src/renderer/app-api/unavailable-api";
import { FileWorkspacePanel } from "../../src/renderer/file-workspace/file-workspace-panel";
import type { ProjectRecord } from "../../src/shared/project-state";
import {
	captureConsoleMessages,
	ensureRangeClientRects,
	expectNoUnexpectedConsoleMessages,
	isKnownFileWorkspaceSelectionWarning,
	isKnownMdxEditorActWarning,
	type ConsoleMessage,
} from "./console-test-guard";
import { ShellTestProviders } from "./shell-test-providers";

beforeAll(ensureRangeClientRects);

let consoleMessages: ConsoleMessage[];

const knownMdxEditorActWarningComponents = new Set([
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
]);

beforeEach(() => {
	consoleMessages = captureConsoleMessages();
});

afterEach(() => {
	expectNoUnexpectedConsoleMessages(
		consoleMessages,
		(message) =>
			isKnownMdxEditorActWarning(knownMdxEditorActWarningComponents, message) ||
			isKnownFileWorkspaceSelectionWarning(message),
	);
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

const contextMenuItems = () => screen.getAllByRole("menuitem") as HTMLButtonElement[];
const contextMenuLabels = () => contextMenuItems().map((item) => item.textContent);
const contextMenuIconIds = () =>
	contextMenuItems().map((item) => item.querySelector(".menu__item-icon")?.getAttribute("data-action-icon"));

function getExplorerRowWrap(name: RegExp): HTMLElement {
	const row = screen.getByRole("button", { name });
	const rowWrap = row.closest(".file-explorer__row-wrap");
	if (!(rowWrap instanceof HTMLElement)) {
		throw new Error(`Explorer row wrapper for ${name} was not found.`);
	}
	return rowWrap;
}

const renderExplorerWithEntries = async () => {
	const clipboardWriteText = vi.fn(async () => ({ ok: true as const, data: { written: true as const } }));
	window.piDesktop = {
		...createUnavailablePiDesktopApi("test"),
		workspaceFiles: {
			listDirectory: vi.fn(async () => ({
				ok: true as const,
				data: {
					entries: [
						{ name: "src", relativePath: "src", kind: "directory" as const },
						{ name: "index.ts", relativePath: "index.ts", kind: "file" as const },
					],
				},
			})),
			readFile: vi.fn(async () => ({ ok: true as const, data: { kind: "text" as const, content: "", size: 0 } })),
			writeFile: vi.fn(async () => ({ ok: true as const, data: { relativePath: "index.ts", size: 0 } })),
		},
		clipboard: { writeText: clipboardWriteText },
	};

	render(
		<ShellTestProviders project={project}>
			<FileWorkspacePanel project={project} />
		</ShellTestProviders>,
	);

	return { explorer: await screen.findByTestId("file-explorer"), clipboardWriteText };
};

describe("FileWorkspacePanel", () => {
	it("renders explorer and viewer chrome for an available project", () => {
		window.piDesktop = {
			...createUnavailablePiDesktopApi("test"),
			workspaceFiles: {
				listDirectory: vi.fn(async () => ({
					ok: true as const,
					data: {
						entries: [{ name: "AGENTS.md", relativePath: "AGENTS.md", kind: "file" as const }],
					},
				})),
				readFile: vi.fn(async () => ({ ok: true as const, data: { kind: "text" as const, content: "", size: 0 } })),
				writeFile: vi.fn(async () => ({ ok: true as const, data: { relativePath: "AGENTS.md", size: 0 } })),
			},
		};

		const markup = renderToStaticMarkup(
			createElement(
				ShellTestProviders,
				{ project, children: createElement(FileWorkspacePanel, { project }) },
			),
		);

		expect(markup).toContain('data-testid="workspace-panel-files"');
		expect(markup).toContain('data-testid="file-explorer"');
		expect(markup).toContain('data-testid="file-viewer-empty"');
		expect(markup).toContain("pi-desktop");
	});

	it("renders a no-project empty state", () => {
		const markup = renderToStaticMarkup(createElement(FileWorkspacePanel, { project: null }));
		expect(markup).toContain('data-testid="file-workspace-no-project"');
	});

	it("lets users drag the divider between the file explorer and editor", async () => {
		window.piDesktop = {
			...createUnavailablePiDesktopApi("test"),
			workspaceFiles: {
				listDirectory: vi.fn(async () => ({
					ok: true as const,
					data: {
						entries: [{ name: "AGENTS.md", relativePath: "AGENTS.md", kind: "file" as const }],
					},
				})),
				readFile: vi.fn(async () => ({ ok: true as const, data: { kind: "text" as const, content: "", size: 0 } })),
				writeFile: vi.fn(async () => ({ ok: true as const, data: { relativePath: "AGENTS.md", size: 0 } })),
			},
		};

		render(
			<ShellTestProviders project={project}>
				<FileWorkspacePanel project={project} />
			</ShellTestProviders>,
		);

		const workspace = screen.getByTestId("workspace-panel-files");
		const explorer = await screen.findByTestId("file-explorer");
		const divider = screen.getByRole("separator", { name: "Resize file explorer" });

		vi.spyOn(workspace, "getBoundingClientRect").mockReturnValue({
			x: 0,
			y: 0,
			width: 900,
			height: 600,
			top: 0,
			right: 900,
			bottom: 600,
			left: 0,
			toJSON: () => ({}),
		} as DOMRect);
		vi.spyOn(explorer, "getBoundingClientRect").mockReturnValue({
			x: 0,
			y: 0,
			width: 300,
			height: 600,
			top: 0,
			right: 300,
			bottom: 600,
			left: 0,
			toJSON: () => ({}),
		} as DOMRect);

		fireEvent.pointerDown(divider, { clientX: 300, pointerId: 1 });
		expect(divider.getAttribute("aria-valuemax")).toBe("620");
		expect(document.body.classList.contains("file-workspace--resizing")).toBe(true);
		fireEvent.pointerMove(document, { clientX: 420, pointerId: 1 });
		fireEvent.pointerCancel(document, { pointerId: 1 });

		expect(workspace.getAttribute("style")).toContain("--file-explorer-width: 420px");
		expect(divider.getAttribute("aria-valuenow")).toBe("420");
		expect(document.body.classList.contains("file-workspace--resizing")).toBe(false);
	});

	it("shows folder context menu actions on folder right click", async () => {
		await renderExplorerWithEntries();

		fireEvent.contextMenu(screen.getByRole("button", { name: /^src$/ }), { clientX: 80, clientY: 120 });

		expect(contextMenuLabels()).toEqual([
			"New File",
			"New Folder",
			"Copy Path",
			"Copy Relative Path",
			"Reveal in Finder",
			"Rename",
			"Delete",
		]);
	});

	it("shows file context menu actions when right clicking across the file row", async () => {
		await renderExplorerWithEntries();

		fireEvent.contextMenu(getExplorerRowWrap(/index\.ts/), { clientX: 80, clientY: 146 });

		expect(contextMenuLabels()).toEqual([
			"New File",
			"New Folder",
			"Copy Path",
			"Copy Relative Path",
			"Duplicate",
			"Reveal in Finder",
			"Rename",
			"Delete",
		]);
	});

	it("renders item context menus outside the scrolling explorer pane", async () => {
		const { explorer } = await renderExplorerWithEntries();

		fireEvent.contextMenu(getExplorerRowWrap(/index\.ts/), { clientX: 80, clientY: 146 });

		const menu = screen.getByRole("menu", { name: "File explorer actions" });
		expect(menu.parentElement).toBe(document.body);
		expect(menu.getAttribute("style")).toContain("position: fixed");
		expect(explorer.contains(menu)).toBe(false);
	});

	it("shows icons for file context menu actions", async () => {
		await renderExplorerWithEntries();

		fireEvent.contextMenu(getExplorerRowWrap(/index\.ts/), { clientX: 80, clientY: 146 });

		expect(contextMenuIconIds()).toEqual([
			"new-file",
			"new-folder",
			"copy-path",
			"copy-relative-path",
			"duplicate",
			"reveal",
			"rename",
			"delete",
		]);
	});

	it("copies the clicked file relative path through the desktop clipboard", async () => {
		const { clipboardWriteText } = await renderExplorerWithEntries();

		fireEvent.contextMenu(getExplorerRowWrap(/index\.ts/), { clientX: 80, clientY: 146 });
		fireEvent.click(screen.getByRole("menuitem", { name: "Copy Relative Path" }));

		await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledWith({ text: "index.ts" }));
		expect(screen.queryByRole("menu", { name: "File explorer actions" })).toBeNull();
		expect(screen.getByRole("status").textContent).toBe("Copied relative path.");
	});

	it("copies the clicked folder absolute path through the desktop clipboard", async () => {
		const { clipboardWriteText } = await renderExplorerWithEntries();

		fireEvent.contextMenu(screen.getByRole("button", { name: /^src$/ }), { clientX: 80, clientY: 120 });
		fireEvent.click(screen.getByRole("menuitem", { name: "Copy Path" }));

		await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledWith({ text: "/tmp/pi-desktop/src" }));
		expect(screen.getByRole("status").textContent).toBe("Copied path.");
	});

	it("disables file actions that are not implemented yet", async () => {
		await renderExplorerWithEntries();

		fireEvent.contextMenu(getExplorerRowWrap(/index\.ts/), { clientX: 80, clientY: 146 });

		expect((screen.getByRole("menuitem", { name: "Copy Path" }) as HTMLButtonElement).disabled).toBe(false);
		expect((screen.getByRole("menuitem", { name: "Copy Relative Path" }) as HTMLButtonElement).disabled).toBe(false);
		expect((screen.getByRole("menuitem", { name: "New File" }) as HTMLButtonElement).disabled).toBe(true);
		expect((screen.getByRole("menuitem", { name: "New Folder" }) as HTMLButtonElement).disabled).toBe(true);
		expect((screen.getByRole("menuitem", { name: "Duplicate" }) as HTMLButtonElement).disabled).toBe(true);
		expect((screen.getByRole("menuitem", { name: "Reveal in Finder" }) as HTMLButtonElement).disabled).toBe(true);
		expect((screen.getByRole("menuitem", { name: "Rename" }) as HTMLButtonElement).disabled).toBe(true);
		expect((screen.getByRole("menuitem", { name: "Delete" }) as HTMLButtonElement).disabled).toBe(true);
	});

	it("dismisses the context menu from Escape and outside clicks", async () => {
		const { explorer } = await renderExplorerWithEntries();

		fireEvent.contextMenu(explorer, { clientX: 40, clientY: 240 });
		expect(screen.getByRole("menu", { name: "File explorer actions" })).toBeTruthy();
		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByRole("menu", { name: "File explorer actions" })).toBeNull();

		fireEvent.contextMenu(explorer, { clientX: 40, clientY: 240 });
		expect(screen.getByRole("menu", { name: "File explorer actions" })).toBeTruthy();
		fireEvent.pointerDown(document.body);
		expect(screen.queryByRole("menu", { name: "File explorer actions" })).toBeNull();
	});

	it("shows creation actions on file explorer background right click", async () => {
		const { explorer } = await renderExplorerWithEntries();

		fireEvent.contextMenu(explorer, { clientX: 40, clientY: 240 });

		expect(contextMenuLabels()).toEqual(["New File", "New Folder"]);
		expect(contextMenuItems().every((item) => item.disabled)).toBe(true);
	});

	it("opens Markdown files with preview, source, and split modes backed by the Markdown surface", async () => {
		window.piDesktop = {
			...createUnavailablePiDesktopApi("test"),
			workspaceFiles: {
				listDirectory: vi.fn(async () => ({
					ok: true as const,
					data: {
						entries: [{ name: "AGENTS.md", relativePath: "AGENTS.md", kind: "file" as const }],
					},
				})),
				readFile: vi.fn(async () => ({
					ok: true as const,
					data: { kind: "text" as const, content: "# Agent\n", size: 8 },
				})),
				writeFile: vi.fn(async () => ({ ok: true as const, data: { relativePath: "AGENTS.md", size: 8 } })),
			},
		};

		render(
			<ShellTestProviders project={project}>
				<FileWorkspacePanel project={project} />
			</ShellTestProviders>,
		);

		await waitFor(() => expect(screen.getByRole("button", { name: /AGENTS\.md/ })).toBeTruthy());
		fireEvent.click(screen.getByRole("button", { name: /AGENTS\.md/ }));

		await waitFor(() => expect(screen.getByTestId("markdown-surface").getAttribute("data-mode")).toBe("preview"));
		expect(screen.getByRole("button", { name: "Preview" }).getAttribute("aria-pressed")).toBe("true");
		expect(screen.getByRole("button", { name: "Markdown" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Split" })).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Split" }));
		expect(screen.getByTestId("markdown-surface").getAttribute("data-mode")).toBe("split");
		expect(screen.queryByText("Saved")).toBeNull();
	});

	it("opens non-Markdown files in the code editor without mode controls", async () => {
		window.piDesktop = {
			...createUnavailablePiDesktopApi("test"),
			workspaceFiles: {
				listDirectory: vi.fn(async () => ({
					ok: true as const,
					data: {
						entries: [{ name: "index.ts", relativePath: "src/index.ts", kind: "file" as const }],
					},
				})),
				readFile: vi.fn(async () => ({
					ok: true as const,
					data: { kind: "text" as const, content: "export {};\n", size: 11 },
				})),
				writeFile: vi.fn(async () => ({ ok: true as const, data: { relativePath: "src/index.ts", size: 11 } })),
			},
		};

		render(
			<ShellTestProviders project={project}>
				<FileWorkspacePanel project={project} />
			</ShellTestProviders>,
		);

		await waitFor(() => expect(screen.getByRole("button", { name: /index\.ts/ })).toBeTruthy());
		fireEvent.click(screen.getByRole("button", { name: /index\.ts/ }));

		await waitFor(() => expect(screen.getByTestId("code-file-editor")).toBeTruthy());
		expect(screen.getByTestId("code-file-editor").getAttribute("data-language-id")).toBe("typescript");
		expect(screen.queryByTestId("file-viewer-mode-toggle")).toBeNull();
		expect(screen.queryByTestId("markdown-surface")).toBeNull();
	});
});
