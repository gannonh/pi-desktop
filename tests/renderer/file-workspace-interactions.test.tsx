// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

describe("file workspace interactions", () => {
	it("loads the root listing and opens a file from the explorer", async () => {
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

		render(<FileWorkspacePanel project={project} />);

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

		expect(screen.getByTestId("file-editor-preview")).toBeTruthy();
	});
});
