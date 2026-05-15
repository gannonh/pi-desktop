import { describe, expect, it } from "vitest";
import {
	AppVersionResultSchema,
	ChatCreateInputSchema,
	ChatSelectionInputSchema,
	IpcChannels,
	PiSessionAbortInputSchema,
	PiSessionActionResultSchema,
	PiSessionDisposeInputSchema,
	PiSessionEventSchema,
	PiSessionOperationFailedCode,
	PiSessionStartInputSchema,
	PiSessionStartResultSchema,
	PiSessionSubmitInputSchema,
	ProjectIdInputSchema,
	ProjectPinnedInputSchema,
	ProjectRenameInputSchema,
	ProjectStateViewResultSchema,
} from "../../src/shared/ipc";
import { createIpcError, err } from "../../src/shared/result";

const projectStateView = {
	projects: [
		{
			id: "project:/tmp/pi-desktop",
			displayName: "pi-desktop",
			path: "/tmp/pi-desktop",
			createdAt: "2026-05-12T09:00:00.000Z",
			updatedAt: "2026-05-12T10:00:00.000Z",
			lastOpenedAt: "2026-05-12T10:00:00.000Z",
			pinned: false,
			availability: { status: "available" as const },
			chats: [
				{
					id: "chat:2026-05-12T10:00:00.000Z",
					projectId: "project:/tmp/pi-desktop",
					title: "New chat",
					status: "idle" as const,
					updatedAt: "2026-05-12T10:00:00.000Z",
				},
			],
		},
	],
	selectedProjectId: "project:/tmp/pi-desktop",
	selectedChatId: "chat:2026-05-12T10:00:00.000Z",
	selectedProject: null,
	selectedChat: null,
};

describe("IPC contracts", () => {
	it("uses stable project and chat channel names", () => {
		expect(IpcChannels).toEqual({
			appGetVersion: "app:getVersion",
			projectGetState: "project:getState",
			projectCreateFromScratch: "project:createFromScratch",
			projectAddExistingFolder: "project:addExistingFolder",
			projectSelect: "project:select",
			projectRename: "project:rename",
			projectRemove: "project:remove",
			projectOpenInFinder: "project:openInFinder",
			projectLocateFolder: "project:locateFolder",
			projectSetPinned: "project:setPinned",
			projectCheckAvailability: "project:checkAvailability",
			chatCreate: "chat:create",
			chatSelect: "chat:select",
			piSessionStart: "pi-session:start",
			piSessionSubmit: "pi-session:submit",
			piSessionAbort: "pi-session:abort",
			piSessionDispose: "pi-session:dispose",
			piSessionEvent: "pi-session:event",
		});
	});

	it("validates successful app version results", () => {
		const result = AppVersionResultSchema.parse({
			ok: true,
			data: {
				name: "pi-desktop",
				version: "0.0.0",
			},
		});

		expect(result.ok).toBe(true);
	});

	it("validates successful project state view results", () => {
		const result = ProjectStateViewResultSchema.parse({
			ok: true,
			data: projectStateView,
		});

		expect(result.ok).toBe(true);
	});

	it("validates project and chat input schemas", () => {
		expect(ProjectIdInputSchema.parse({ projectId: "project:/tmp/pi-desktop" })).toEqual({
			projectId: "project:/tmp/pi-desktop",
		});
		expect(ProjectRenameInputSchema.parse({ projectId: "project:/tmp/pi-desktop", displayName: "Pi" })).toEqual({
			projectId: "project:/tmp/pi-desktop",
			displayName: "Pi",
		});
		expect(ProjectPinnedInputSchema.parse({ projectId: "project:/tmp/pi-desktop", pinned: true })).toEqual({
			projectId: "project:/tmp/pi-desktop",
			pinned: true,
		});
		expect(ChatCreateInputSchema.parse({ projectId: "project:/tmp/pi-desktop" })).toEqual({
			projectId: "project:/tmp/pi-desktop",
		});
		expect(ChatSelectionInputSchema.parse({ projectId: "project:/tmp/pi-desktop", chatId: "chat:one" })).toEqual({
			projectId: "project:/tmp/pi-desktop",
			chatId: "chat:one",
		});
	});

	it("exports Pi session schemas from the IPC contract boundary", () => {
		expect(PiSessionOperationFailedCode).toBe("pi_session.operation_failed");
		expect(PiSessionStartInputSchema.parse({ projectId: "project:/tmp/pi-desktop", prompt: "Start" })).toEqual({
			projectId: "project:/tmp/pi-desktop",
			prompt: "Start",
		});
		expect(PiSessionSubmitInputSchema.parse({ sessionId: "pi-session:one", prompt: "Continue" })).toEqual({
			sessionId: "pi-session:one",
			prompt: "Continue",
		});
		expect(PiSessionAbortInputSchema.parse({ sessionId: "pi-session:one" })).toEqual({
			sessionId: "pi-session:one",
		});
		expect(PiSessionDisposeInputSchema.parse({ sessionId: "pi-session:one" })).toEqual({
			sessionId: "pi-session:one",
		});
		expect(
			PiSessionStartResultSchema.parse({
				ok: true,
				data: {
					sessionId: "pi-session:one",
					projectId: "project:/tmp/pi-desktop",
					workspacePath: "/tmp/pi-desktop",
					status: "running",
				},
			}),
		).toEqual({
			ok: true,
			data: {
				sessionId: "pi-session:one",
				projectId: "project:/tmp/pi-desktop",
				workspacePath: "/tmp/pi-desktop",
				status: "running",
			},
		});
		expect(
			PiSessionActionResultSchema.parse({
				ok: false,
				error: {
					code: PiSessionOperationFailedCode,
					message: "Pi session not found.",
				},
			}),
		).toEqual({
			ok: false,
			error: {
				code: PiSessionOperationFailedCode,
				message: "Pi session not found.",
			},
		});
		expect(
			PiSessionActionResultSchema.parse({
				ok: true,
				data: {
					sessionId: "pi-session:one",
					status: "idle",
				},
			}),
		).toEqual({
			ok: true,
			data: {
				sessionId: "pi-session:one",
				status: "idle",
			},
		});
		expect(
			PiSessionEventSchema.parse({
				type: "status",
				sessionId: "pi-session:one",
				status: "running",
				label: "Running",
				receivedAt: "2026-05-12T10:00:00.000Z",
			}),
		).toEqual({
			type: "status",
			sessionId: "pi-session:one",
			status: "running",
			label: "Running",
			receivedAt: "2026-05-12T10:00:00.000Z",
		});
	});

	it("validates error results", () => {
		const result = ProjectStateViewResultSchema.parse({
			ok: false,
			error: {
				code: "project.operation_failed",
				message: "Project not found.",
			},
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("Expected project state view result to be an error");
		}
		expect(result.error.code).toBe("project.operation_failed");
	});

	it("validates helper-created error results", () => {
		const result = ProjectStateViewResultSchema.parse(err("project.operation_failed", "Project not found."));

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("Expected helper-created project state view result to be an error");
		}
		expect(result.error.message).toBe("Project not found.");
	});

	it("strictly rejects unexpected fields in IPC payloads", () => {
		expect(() =>
			ProjectIdInputSchema.parse({
				projectId: "project:/tmp/pi-desktop",
				extra: "unexpected",
			}),
		).toThrow();

		expect(() =>
			ProjectStateViewResultSchema.parse({
				ok: true,
				data: {
					...projectStateView,
					extra: "unexpected",
				},
			}),
		).toThrow();
	});

	it("rejects empty helper-created error fields", () => {
		expect(() => createIpcError("", "")).toThrow();
	});

	it("rejects result shapes that mix data and error fields", () => {
		expect(() =>
			ProjectStateViewResultSchema.parse({
				ok: true,
				data: projectStateView,
				error: {
					code: "project.operation_failed",
					message: "Project not found.",
				},
			}),
		).toThrow();
	});
});
