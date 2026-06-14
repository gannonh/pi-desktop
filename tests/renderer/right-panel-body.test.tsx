import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RightPanelBody } from "../../src/renderer/right-panel/right-panel-body";
import { createMockTab } from "../../src/renderer/right-panel/right-panel-mock-data";

const availableProject = {
	id: "project:/tmp/pi-desktop",
	displayName: "pi-desktop",
	path: "/tmp/pi-desktop",
	createdAt: "2026-05-12T09:00:00.000Z",
	updatedAt: "2026-05-12T10:00:00.000Z",
	lastOpenedAt: "2026-05-12T10:00:00.000Z",
	pinned: false,
	availability: { status: "available" as const },
	gitSettings: { defaultBaseRef: "main" },
};

describe("RightPanelBody terminal integration", () => {
	it("renders the real terminal panel instead of the mock", () => {
		const markup = renderToStaticMarkup(
			createElement(RightPanelBody, {
				tab: createMockTab("terminal"),
				filesActive: false,
				selectedProject: availableProject,
				changesActive: false,
				terminalActive: true,
			}),
		);

		expect(markup).toContain('data-testid="workspace-panel-terminal"');
		expect(markup).not.toContain("right-panel-mock--terminal");
		expect(markup).not.toContain("PASS  tests/renderer/right-panel-state.test.ts");
	});
});
