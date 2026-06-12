// @vitest-environment jsdom

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createDefaultRightPanelState } from "../../src/renderer/right-panel/right-panel-state";
import { ShellTestProviders } from "./shell-test-providers";
import { WorkspaceTabStrip } from "../../src/renderer/right-panel/workspace-tab-strip";

describe("WorkspaceTabStrip", () => {
	it("renders horizontal workspace tabs and add control in the shell tab strip", () => {
		const markup = renderToStaticMarkup(
			createElement(ShellTestProviders, {
				initialRightPanelState: createDefaultRightPanelState(),
				children: createElement(WorkspaceTabStrip),
			}),
		);

		expect(markup).toContain('class="workspace-tab-strip"');
		expect(markup).toContain("workspace-tabs--tools");
		expect(markup).toContain('role="tab"');
		expect(markup).toContain('aria-label="Changes"');
		expect(markup).toContain('aria-label="Terminal"');
		expect(markup).toContain('aria-label="File explorer"');
		expect(markup).toContain('aria-label="Add panel"');
		expect(markup).toContain('aria-label="Show workspace"');
		expect(markup).toContain("workspace-tab-strip__action");
		expect(markup).not.toContain("right-panel__tabs");
	});
});
