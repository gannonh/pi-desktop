// @vitest-environment jsdom

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createUnavailablePiDesktopApi } from "../../src/renderer/app-api/unavailable-api";
import { FileWorkspacePanel } from "../../src/renderer/file-workspace/file-workspace-panel";
import type { ProjectRecord } from "../../src/shared/project-state";

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

		const markup = renderToStaticMarkup(createElement(FileWorkspacePanel, { project }));

		expect(markup).toContain('data-testid="workspace-panel-files"');
		expect(markup).toContain('data-testid="file-explorer"');
		expect(markup).toContain('data-testid="file-viewer-empty"');
		expect(markup).toContain("pi-desktop");
	});

	it("renders a no-project empty state", () => {
		const markup = renderToStaticMarkup(createElement(FileWorkspacePanel, { project: null }));
		expect(markup).toContain('data-testid="file-workspace-no-project"');
	});
});
