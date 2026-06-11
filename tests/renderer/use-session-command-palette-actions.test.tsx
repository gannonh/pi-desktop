// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectStateViewResult } from "../../src/shared/ipc";
import type { ChatMetadata } from "../../src/shared/project-state";
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

const createSelectedChat = (overrides: Partial<ChatMetadata> = {}): ChatMetadata => ({
	id: "chat-1",
	projectId: "project-1",
	source: "pi-session",
	sessionId: "session-1",
	sessionPath: "/tmp/session.jsonl",
	cwd: "/tmp/project",
	title: "Wave 5",
	status: "idle",
	attention: false,
	createdAt: "2026-06-10T11:00:00.000Z",
	updatedAt: "2026-06-10T12:00:00.000Z",
	lastOpenedAt: "2026-06-10T12:00:00.000Z",
	...overrides,
});

function renderActions(overrides: Partial<Parameters<typeof useSessionCommandPaletteActions>[0]> = {}) {
	const applyProjectStateViewResult = vi.fn();
	const notifyProjectStatus = vi.fn();
	const sidebarActionsRef = { current: null as { startChatRename: (projectId: string, chatId: string) => "started" | "chat-not-found" } | null };
	const hook = renderHook(() =>
		useSessionCommandPaletteActions({
			selectedProjectId: "project-1",
			selectedChatId: "chat-1",
			selectedChat: createSelectedChat(),
			applyProjectStateViewResult,
			notifyProjectStatus,
			sidebarActionsRef,
			...overrides,
		}),
	);

	return { ...hook, applyProjectStateViewResult, notifyProjectStatus, sidebarActionsRef };
}

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

	it("creates a standalone session when no project is selected", async () => {
		const result = okProjectState(null, "chat-standalone");
		const createStandalone = vi.fn().mockResolvedValue(result);
		vi.stubGlobal("window", {
			piDesktop: {
				chat: {
					create: vi.fn(),
					createStandalone,
					fork: vi.fn(),
					clone: vi.fn(),
				},
			},
		});
		const { result: hook, applyProjectStateViewResult, notifyProjectStatus } = renderActions({
			selectedProjectId: null,
			selectedChatId: null,
			selectedChat: null,
		});

		act(() => {
			hook.current.onNewSession();
		});

		await vi.waitFor(() => {
			expect(createStandalone).toHaveBeenCalledWith({});
			expect(applyProjectStateViewResult).toHaveBeenCalledWith(result);
			expect(notifyProjectStatus).toHaveBeenCalledWith("Started new session.", "success", {
				projectId: null,
				chatId: "chat-standalone",
			});
		});
	});

	it("notifies when starting a session fails", async () => {
		const create = vi.fn().mockRejectedValue(new Error("bridge unavailable"));
		vi.stubGlobal("window", {
			piDesktop: {
				chat: {
					create,
					createStandalone: vi.fn(),
					fork: vi.fn(),
					clone: vi.fn(),
				},
			},
		});
		const { result: hook, notifyProjectStatus } = renderActions();

		act(() => {
			hook.current.onNewSession();
		});

		await vi.waitFor(() => {
			expect(notifyProjectStatus).toHaveBeenCalledWith("bridge unavailable", "error", {
				projectId: "project-1",
				chatId: "chat-1",
			});
		});
	});

	it("requires a selected chat before renaming", () => {
		const { result: hook, notifyProjectStatus } = renderActions({ selectedChatId: null });

		act(() => {
			hook.current.onRenameSession();
		});

		expect(notifyProjectStatus).toHaveBeenCalledWith("Select a chat before renaming the session.");
	});

	it("blocks quick-start chat rename without a project", () => {
		const { result: hook, notifyProjectStatus } = renderActions({ selectedProjectId: null });

		act(() => {
			hook.current.onRenameSession();
		});

		expect(notifyProjectStatus).toHaveBeenCalledWith(
			"Quick-start chat rename from the command palette is not available yet. Select a project chat to rename from the sidebar.",
		);
	});

	it("reports when sidebar rename actions are unavailable", () => {
		const { result: hook, notifyProjectStatus } = renderActions();

		act(() => {
			hook.current.onRenameSession();
		});

		expect(notifyProjectStatus).toHaveBeenCalledWith("Rename is temporarily unavailable. Try again in a moment.");
	});

	it("opens rename when sidebar actions are ready", () => {
		const startChatRename = vi.fn().mockReturnValue("started" as const);
		const { result: hook, notifyProjectStatus, sidebarActionsRef } = renderActions();
		sidebarActionsRef.current = { startChatRename };

		act(() => {
			hook.current.onRenameSession();
		});

		expect(startChatRename).toHaveBeenCalledWith("project-1", "chat-1");
		expect(notifyProjectStatus).toHaveBeenCalledWith("Rename editor opened.", "success");
	});

	it("reports when the selected chat cannot be found for rename", () => {
		const startChatRename = vi.fn().mockReturnValue("chat-not-found" as const);
		const { result: hook, notifyProjectStatus, sidebarActionsRef } = renderActions();
		sidebarActionsRef.current = { startChatRename };

		act(() => {
			hook.current.onRenameSession();
		});

		expect(notifyProjectStatus).toHaveBeenCalledWith("Could not find the selected chat in the project sidebar.");
	});

	it("requires a selected chat before showing session info", () => {
		const { result: hook, notifyProjectStatus } = renderActions({ selectedChat: null });

		act(() => {
			hook.current.onShowSessionInfo();
		});

		expect(notifyProjectStatus).toHaveBeenCalledWith("Select a chat to view session info.");
	});

	it("shows session info including the session file path", () => {
		const { result: hook, notifyProjectStatus } = renderActions();

		act(() => {
			hook.current.onShowSessionInfo();
		});

		expect(notifyProjectStatus).toHaveBeenCalledWith(
			"Title: Wave 5 · Status: idle · Workspace: /tmp/project · Session file: /tmp/session.jsonl · Updated: 2026-06-10T12:00:00.000Z",
		);
	});

	it("shows session info when the session file is not created yet", () => {
		const { result: hook, notifyProjectStatus } = renderActions({
			selectedChat: createSelectedChat({ sessionPath: null }),
		});

		act(() => {
			hook.current.onShowSessionInfo();
		});

		expect(notifyProjectStatus).toHaveBeenCalledWith(
			"Title: Wave 5 · Status: idle · Workspace: /tmp/project · Session file: not created yet · Updated: 2026-06-10T12:00:00.000Z",
		);
	});

	it("does not delegate fork and clone when sessionPath is null", () => {
		const fork = vi.fn();
		const clone = vi.fn();
		vi.stubGlobal("window", {
			piDesktop: {
				chat: {
					create: vi.fn(),
					createStandalone: vi.fn(),
					fork,
					clone,
				},
			},
		});
		const { result: hook, notifyProjectStatus } = renderActions({
			selectedChat: createSelectedChat({ sessionPath: null }),
		});

		act(() => {
			hook.current.onForkSession();
			hook.current.onCloneSession();
		});

		expect(fork).not.toHaveBeenCalled();
		expect(clone).not.toHaveBeenCalled();
		expect(notifyProjectStatus).toHaveBeenCalledWith(
			"Fork is available after the chat has a Pi session file. Send a message to start the session, then try again.",
			"info",
			{ projectId: "project-1", chatId: "chat-1" },
		);
		expect(notifyProjectStatus).toHaveBeenCalledWith(
			"Clone is available after the chat has a Pi session file. Send a message to start the session, then try again.",
			"info",
			{ projectId: "project-1", chatId: "chat-1" },
		);
	});
});
