// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectStateViewResult } from "../../src/shared/ipc";
import { useSessionCommandPaletteActions } from "../../src/renderer/chat/use-session-command-palette-actions";

const okProjectState = (selectedProjectId: string | null, selectedChatId: string | null): ProjectStateViewResult =>
	({
		ok: true,
		data: {
			projects: [],
			standaloneChats: [],
			selectedProjectId,
			selectedChatId,
			selectedProject: null,
			selectedChat: null,
		},
	}) as ProjectStateViewResult;

describe("session command palette actions", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("shows pending feedback before a project session is created", async () => {
		const result = okProjectState("project-1", "chat-new");
		let resolveCreate!: (result: ProjectStateViewResult) => void;
		const create = vi.fn(
			() =>
				new Promise<ProjectStateViewResult>((resolve) => {
					resolveCreate = resolve;
				}),
		);
		vi.stubGlobal("window", {
			piDesktop: {
				chat: {
					create,
					createStandalone: vi.fn(),
				},
			},
		});
		const applyProjectStateViewResult = vi.fn();
		const notifyProjectStatus = vi.fn();
		const { result: hook } = renderHook(() =>
			useSessionCommandPaletteActions({
				selectedProjectId: "project-1",
				selectedChatId: "chat-1",
				selectedChat: null,
				applyProjectStateViewResult,
				notifyProjectStatus,
				sidebarActionsRef: { current: null },
			}),
		);

		act(() => {
			hook.current.onNewSession();
		});

		expect(create).toHaveBeenCalledWith({ projectId: "project-1" });
		expect(notifyProjectStatus).toHaveBeenCalledWith("Starting new session…", "pending", {
			projectId: "project-1",
			chatId: "chat-1",
		});
		expect(applyProjectStateViewResult).not.toHaveBeenCalled();

		resolveCreate(result);

		await vi.waitFor(() => {
			expect(applyProjectStateViewResult).toHaveBeenCalledWith(result);
			expect(notifyProjectStatus).toHaveBeenCalledWith("Started new session.", "success", {
				projectId: "project-1",
				chatId: "chat-new",
			});
		});
	});
});
