import { describe, expect, it } from "vitest";
import {
	AppVersionResultSchema,
	IpcChannels,
	SelectFolderResultSchema,
	WorkspaceStateResultSchema,
} from "../../src/shared/ipc";

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
