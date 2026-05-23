// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createUnavailablePiDesktopApi } from "../../src/renderer/app-api/unavailable-api";
import { FileWorkspaceProvider } from "../../src/renderer/file-workspace/file-workspace-context";
import {
	confirmDiscardUnsavedFileWorkspaceChanges,
	registerFileWorkspaceDiscardConfirm,
} from "../../src/renderer/file-workspace/file-workspace-guard";
import { confirmDiscardUnsavedChanges } from "../../src/renderer/file-workspace/confirm-discard";
import { RightPanelProvider } from "../../src/renderer/right-panel/right-panel-context";
import { ShellLayoutProvider } from "../../src/renderer/shell/shell-layout-context";
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

describe("file workspace guard", () => {
	it("confirmDiscardUnsavedChanges returns true when there are no titles", () => {
		const confirm = vi.spyOn(window, "confirm");
		expect(confirmDiscardUnsavedChanges([])).toBe(true);
		expect(confirm).not.toHaveBeenCalled();
	});

	it("confirmDiscardUnsavedFileWorkspaceChanges allows when no provider is mounted", () => {
		registerFileWorkspaceDiscardConfirm(null);
		expect(confirmDiscardUnsavedFileWorkspaceChanges()).toBe(true);
	});

	it("registers discard confirmation from FileWorkspaceProvider", () => {
		window.piDesktop = {
			...createUnavailablePiDesktopApi("test"),
			workspaceFiles: {
				listDirectory: vi.fn(async () => ({ ok: true as const, data: { entries: [] } })),
				readFile: vi.fn(),
				writeFile: vi.fn(),
			},
		};
		const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

		render(
			<ShellLayoutProvider>
				<RightPanelProvider>
					<FileWorkspaceProvider project={project}>
						<div />
					</FileWorkspaceProvider>
				</RightPanelProvider>
			</ShellLayoutProvider>,
		);

		expect(confirmDiscardUnsavedFileWorkspaceChanges()).toBe(true);
		expect(confirm).not.toHaveBeenCalled();

		confirm.mockRestore();
	});
});
