import { describe, expect, it } from "vitest";
import { createWorkspaceSummaryFromPath } from "../../src/renderer/shell/workspace-selection";

describe("createWorkspaceSummaryFromPath", () => {
	it("derives workspace identity and label from the selected path", () => {
		expect(createWorkspaceSummaryFromPath("/Users/example/dev/pi-desktop")).toEqual({
			id: "workspace:/Users/example/dev/pi-desktop",
			name: "pi-desktop",
			path: "/Users/example/dev/pi-desktop",
		});
	});

	it("uses the full selected path as the label when no folder segment exists", () => {
		expect(createWorkspaceSummaryFromPath("/")).toEqual({
			id: "workspace:/",
			name: "/",
			path: "/",
		});
	});
});
