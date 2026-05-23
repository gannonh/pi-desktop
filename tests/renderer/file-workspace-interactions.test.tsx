// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createUnavailablePiDesktopApi } from "../../src/renderer/app-api/unavailable-api";
import { useFileWorkspace } from "../../src/renderer/file-workspace/file-workspace-context";
import { FileWorkspacePanel } from "../../src/renderer/file-workspace/file-workspace-panel";
import { ShellTestProviders } from "./shell-test-providers";
import type { ProjectRecord } from "../../src/shared/project-state";

function TabCloseHarness() {
	const { closeTab } = useFileWorkspace();
	return (
		<button type="button" onClick={() => closeTab("file:AGENTS.md")}>
			Close AGENTS.md
		</button>
	);
}

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

		expect(screen.getByTestId("file-editor-preview")).toBeTruthy();
	});

	it("does not close a dirty tab when discard is cancelled", async () => {
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
			expect(screen.getByRole("button", { name: /AGENTS\.md/ })).toBeTruthy();
		});

		const explorer = screen.getByTestId("file-explorer");
		fireEvent.click(within(explorer).getByRole("button", { name: /AGENTS\.md/ }));
		await waitFor(() => {
			expect(screen.getByTestId("file-editor-preview")).toBeTruthy();
		});

		fireEvent.click(screen.getByRole("button", { name: "Markdown" }));
		const editor = await screen.findByTestId("file-editor-source");
		fireEvent.change(editor, { target: { value: "# Agent\nedited\n" } });

		fireEvent.click(screen.getByRole("button", { name: "Close AGENTS.md" }));

		expect(screen.getByTestId("file-editor-source")).toBeTruthy();
		expect(confirm).toHaveBeenCalled();
		confirm.mockRestore();
	});

	it("saves the active file on Cmd+S", async () => {
		const writeFile = vi.fn(async () => ({
			ok: true as const,
			data: { relativePath: "AGENTS.md", size: 12 },
		}));
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
			workspaceFiles: { listDirectory, readFile, writeFile },
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
			expect(screen.getByTestId("file-editor-preview")).toBeTruthy();
		});

		fireEvent.click(screen.getByRole("button", { name: "Markdown" }));

		const editor = await screen.findByTestId("file-editor-source");
		fireEvent.change(editor, { target: { value: "# Agent\nedited\n" } });
		fireEvent.keyDown(window, { key: "s", metaKey: true });

		await waitFor(() => {
			expect(writeFile).toHaveBeenCalledWith({
				projectId: project.id,
				relativePath: "AGENTS.md",
				content: "# Agent\nedited\n",
			});
		});
	});
});
