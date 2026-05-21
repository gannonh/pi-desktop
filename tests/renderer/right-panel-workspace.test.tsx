// @vitest-environment jsdom

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RightPanelProvider } from "../../src/renderer/right-panel/right-panel-context";
import { createDefaultRightPanelState } from "../../src/renderer/right-panel/right-panel-state";
import { RightPanelWorkspace } from "../../src/renderer/right-panel/right-panel-workspace";

describe("RightPanelWorkspace", () => {
	it("renders only the workspace panel body without an internal tab strip", () => {
		const markup = renderToStaticMarkup(
			createElement(
				RightPanelProvider,
				{ initialState: createDefaultRightPanelState(), children: createElement(RightPanelWorkspace) },
			),
		);

		expect(markup).toContain('aria-label="Workspace panel"');
		expect(markup).toContain("M07A.2 right panel tab shell");
		expect(markup).not.toContain("workspace-tab-strip");
		expect(markup).not.toContain("Tool timeline");
	});

	it("renders nothing when the workspace is collapsed", () => {
		const state = createDefaultRightPanelState();
		const markup = renderToStaticMarkup(
			createElement(RightPanelProvider, {
				initialState: { ...state, collapsed: true },
				children: createElement(RightPanelWorkspace),
			}),
		);

		expect(markup).toBe("");
	});
});
