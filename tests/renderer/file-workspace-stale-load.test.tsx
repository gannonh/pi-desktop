// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createUnavailablePiDesktopApi } from "../../src/renderer/app-api/unavailable-api";
import { FileWorkspacePanel } from "../../src/renderer/file-workspace/file-workspace-panel";
import { ShellTestProviders } from "./shell-test-providers";
import { DEFAULT_PROJECT_GIT_SETTINGS, type ProjectRecord } from "../../src/shared/project-state";

const createProject = (id: string, displayName: string): ProjectRecord => ({
	id,
	displayName,
	path: `/tmp/${displayName}`,
	createdAt: "2026-05-12T00:00:00.000Z",
	updatedAt: "2026-05-12T00:00:00.000Z",
	lastOpenedAt: "2026-05-12T00:00:00.000Z",
	pinned: false,
	availability: { status: "available", checkedAt: "2026-05-12T00:00:00.000Z" },
	gitSettings: DEFAULT_PROJECT_GIT_SETTINGS,
});

describe("file workspace stale loads", () => {
	it("ignores directory listings that complete after the project changes", async () => {
		const pendingResolvers: Array<
			(value: {
				ok: true;
				data: { entries: { name: string; relativePath: string; kind: "file" }[] };
			}) => void
		> = [];
		const listDirectory = vi.fn(
			() =>
				new Promise<{
					ok: true;
					data: { entries: { name: string; relativePath: string; kind: "file" }[] };
				}>((resolve) => {
					pendingResolvers.push(resolve);
				}),
		);

		window.piDesktop = {
			...createUnavailablePiDesktopApi("test"),
			workspaceFiles: {
				listDirectory,
				readFile: vi.fn(),
				writeFile: vi.fn(),
			},
		};

		const projectA = createProject("project:a", "project-a");
		const projectB = createProject("project:b", "project-b");

		const { rerender } = render(
			<ShellTestProviders project={projectA}>
				<FileWorkspacePanel project={projectA} />
			</ShellTestProviders>,
		);

		await waitFor(() => {
			expect(listDirectory).toHaveBeenCalledTimes(1);
		});

		rerender(
			<ShellTestProviders project={projectB}>
				<FileWorkspacePanel project={projectB} />
			</ShellTestProviders>,
		);

		await waitFor(() => {
			expect(listDirectory).toHaveBeenCalledTimes(2);
		});

		pendingResolvers[0]?.({
			ok: true,
			data: { entries: [{ name: "stale.md", relativePath: "stale.md", kind: "file" }] },
		});

		await waitFor(() => {
			expect(pendingResolvers).toHaveLength(2);
		});

		expect(screen.queryByRole("button", { name: /stale\.md/ })).toBeNull();
	});
});
