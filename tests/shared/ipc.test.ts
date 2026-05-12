import { describe, expect, it } from "vitest";
import {
	AppVersionResultSchema,
	IpcChannels,
	SelectFolderResultSchema,
	WorkspaceStateResultSchema,
} from "../../src/shared/ipc";
import { createIpcError, err } from "../../src/shared/result";

describe("IPC contracts", () => {
	it("uses stable channel names", () => {
		expect(IpcChannels).toEqual({
			appGetVersion: "app:getVersion",
			workspaceGetInitialState: "workspace:getInitialState",
			workspaceSelectFolder: "workspace:selectFolder",
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

	it("validates cancelled folder selection results", () => {
		const result = SelectFolderResultSchema.parse({
			ok: true,
			data: {
				status: "cancelled",
			},
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw new Error("Expected cancelled folder selection result to be ok");
		}
		expect(result.data.status).toBe("cancelled");
	});

	it("validates selected folder results", () => {
		const result = SelectFolderResultSchema.parse({
			ok: true,
			data: {
				status: "selected",
				path: "/path/to/pi-desktop",
			},
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw new Error("Expected selected folder result to be ok");
		}
		expect(result.data.status).toBe("selected");
		if (result.data.status !== "selected") {
			throw new Error("Expected selected folder result to include a selected path");
		}
		expect(result.data.path).toBe("/path/to/pi-desktop");
	});

	it("rejects unexpected fields in IPC payloads so contract drift is visible", () => {
		expect(() =>
			AppVersionResultSchema.parse({
				ok: true,
				data: {
					name: "pi-desktop",
					version: "0.0.0",
					extra: "unexpected",
				},
			}),
		).toThrow();

		expect(() =>
			SelectFolderResultSchema.parse({
				ok: true,
				data: {
					status: "cancelled",
					extra: "unexpected",
				},
			}),
		).toThrow();
	});

	it("validates error results", () => {
		const result = SelectFolderResultSchema.parse({
			ok: false,
			error: {
				code: "workspace.no_selection",
				message: "Folder picker returned no selected path.",
			},
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("Expected folder selection result to be an error");
		}
		expect(result.error.code).toBe("workspace.no_selection");
	});

	it("validates helper-created error results", () => {
		const result = SelectFolderResultSchema.parse(
			err("workspace.no_selection", "Folder picker returned no selected path."),
		);

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("Expected helper-created folder selection result to be an error");
		}
		expect(result.error.message).toBe("Folder picker returned no selected path.");
	});

	it("rejects empty helper-created error fields", () => {
		expect(() => createIpcError("", "")).toThrow();
	});

	it("rejects result shapes that mix data and error fields", () => {
		expect(() =>
			SelectFolderResultSchema.parse({
				ok: true,
				data: {
					status: "cancelled",
				},
				error: {
					code: "workspace.no_selection",
					message: "Folder picker returned no selected path.",
				},
			}),
		).toThrow();
	});

	it("rejects malformed workspace state results", () => {
		expect(() =>
			WorkspaceStateResultSchema.parse({
				ok: true,
				data: {
					activeWorkspace: null,
				},
			}),
		).toThrow();
	});
});
