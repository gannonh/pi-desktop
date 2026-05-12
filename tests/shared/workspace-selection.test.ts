import { describe, expect, it } from "vitest";
import { createWorkspaceSummaryFromPath } from "../../src/renderer/shell/workspace-selection";

describe("createWorkspaceSummaryFromPath", () => {
	it("derives workspace identity and label from the selected path", () => {
		expect(createWorkspaceSummaryFromPath("/Users/gannonhall/dev/pi-desktop")).toEqual({
			id: "workspace:/Users/gannonhall/dev/pi-desktop",
			name: "pi-desktop",
			path: "/Users/gannonhall/dev/pi-desktop",
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
