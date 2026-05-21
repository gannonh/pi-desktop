// @vitest-environment jsdom

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RightPanelWorkspace } from "../../src/renderer/right-panel/right-panel-workspace";
import { createDefaultRightPanelState } from "../../src/renderer/right-panel/right-panel-state";

describe("RightPanelWorkspace", () => {
	it("renders default mock tabs and the active panel body", () => {
		const markup = renderToStaticMarkup(
			createElement(RightPanelWorkspace, { initialState: createDefaultRightPanelState() }),
		);

		expect(markup).toContain('aria-label="Right panel workspace"');
		expect(markup).toContain("PR #11");
		expect(markup).toContain("Terminal");
		expect(markup).toContain("README.md");
		expect(markup).toContain("Browser");
		expect(markup).toContain("M07A.2 right panel tab shell");
		expect(markup).not.toContain("Tool timeline");
	});

	it("renders an empty workspace state with the add-tab menu", () => {
		const markup = renderToStaticMarkup(
			createElement(RightPanelWorkspace, {
				initialState: { tabs: [], activeTabId: null, collapsed: false },
			}),
		);

		expect(markup).toContain("Open a panel");
		expect(markup).toContain("Add panel");
		expect(markup).toContain("Changes");
		expect(markup).toContain("Markdown");
	});

	it("shows terminal mock content when the terminal tab is active", () => {
		const state = createDefaultRightPanelState();
		const terminalTab = state.tabs.find((tab) => tab.kind === "terminal");
		expect(terminalTab).toBeTruthy();
		if (!terminalTab) {
			return;
		}

		const markup = renderToStaticMarkup(
			createElement(RightPanelWorkspace, {
				initialState: { ...state, activeTabId: terminalTab.id },
			}),
		);

		expect(markup).toContain("pnpm test");
		expect(markup).toContain("vitest run");
	});
});
