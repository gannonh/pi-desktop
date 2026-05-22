import { describe, expect, it } from "vitest";
import {
	clampSidebarWidth,
	clampWorkspaceWidth,
	resolveDefaultWorkspaceWidth,
	SIDEBAR_WIDTH_DEFAULT,
	WORKSPACE_WIDTH_MAX,
	WORKSPACE_WIDTH_MIN,
} from "../../src/renderer/shell/shell-layout";

describe("shell layout widths", () => {
	it("keeps the project sidebar default at 298px", () => {
		expect(SIDEBAR_WIDTH_DEFAULT).toBe(298);
		expect(clampSidebarWidth(298)).toBe(298);
	});

	it("defaults workspace width to a wider viewport ratio", () => {
		expect(resolveDefaultWorkspaceWidth(1981)).toBe(753);
		expect(resolveDefaultWorkspaceWidth(1280)).toBe(486);
	});

	it("clamps workspace width to supported bounds", () => {
		expect(clampWorkspaceWidth(200)).toBe(WORKSPACE_WIDTH_MIN);
		expect(clampWorkspaceWidth(2000)).toBe(WORKSPACE_WIDTH_MAX);
	});
});
