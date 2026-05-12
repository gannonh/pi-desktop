import { describe, expect, it } from "vitest";
import { createShellSections } from "../../src/renderer/shell/shell-state";
import { createDemoWorkspaceState } from "../../src/shared/demo-workspace";

describe("createShellSections", () => {
	it("creates stable labels for the static Milestone 0 shell", () => {
		const sections = createShellSections(createDemoWorkspaceState());

		expect(sections.workspaceLabel).toBe("pi-desktop");
		expect(sections.workspacePath).toBe("/Volumes/EVO/dev/pi-desktop");
		expect(sections.sessionLabels).toEqual(["Milestone 0 foundation", "Roadmap planning"]);
		expect(sections.panelLabels).toEqual(["Files", "Diffs", "Terminal"]);
	});
});
