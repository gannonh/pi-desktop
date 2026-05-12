import { describe, expect, it } from "vitest";
import { createDemoWorkspaceState } from "../../src/shared/demo-workspace";
import { WorkspaceStateSchema } from "../../src/shared/workspace-state";

describe("createDemoWorkspaceState", () => {
	it("returns valid demo data for the Milestone 0 shell", () => {
		const state = createDemoWorkspaceState();

		expect(WorkspaceStateSchema.parse(state)).toEqual(state);
		expect(state.activeWorkspace.name).toBe("pi-desktop");
		expect(state.sessions).toHaveLength(2);
		expect(state.panels.map((panel) => panel.kind)).toEqual(["files", "diffs", "terminal"]);
	});
});
