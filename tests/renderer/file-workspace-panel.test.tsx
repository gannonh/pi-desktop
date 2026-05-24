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
		fireEvent.pointerMove(document, { clientX: 420, pointerId: 1 });
		fireEvent.pointerUp(document, { pointerId: 1 });

		expect(workspace.getAttribute("style")).toContain("--file-explorer-width: 420px");
		expect(divider.getAttribute("aria-valuenow")).toBe("420");
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

	it("keeps non-Markdown files on the existing source editor path without mode controls", async () => {
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

		await waitFor(() => expect(screen.getByTestId("file-editor-source")).toBeTruthy());
		expect(screen.queryByTestId("file-viewer-mode-toggle")).toBeNull();
		expect(screen.queryByTestId("markdown-surface")).toBeNull();
	});
});
