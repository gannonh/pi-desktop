import {
	resolveBrowserMock,
	resolveDiffsMock,
	resolveMarkdownMock,
	resolveTerminalMock,
} from "./right-panel-mock-data";
import type { RightPanelTab } from "./right-panel-types";
import { BrowserPanelMock } from "./browser-panel-mock";
import { DiffsPanelMock } from "./diffs-panel-mock";
import { MarkdownPanelMock } from "./markdown-panel-mock";
import { TerminalPanelMock } from "./terminal-panel-mock";

interface RightPanelBodyProps {
	tab: RightPanelTab | null;
}

export function RightPanelBody({ tab }: RightPanelBodyProps) {
	if (!tab) {
		return (
			<div className="right-panel__empty-body">
				<p>Open a panel to inspect terminal, browser, file, or PR work here.</p>
			</div>
		);
	}

	switch (tab.kind) {
		case "terminal":
			return <TerminalPanelMock data={resolveTerminalMock(tab)} />;
		case "browser":
			return <BrowserPanelMock data={resolveBrowserMock(tab)} />;
		case "markdown":
			return <MarkdownPanelMock data={resolveMarkdownMock(tab)} />;
		case "diffs":
			return <DiffsPanelMock data={resolveDiffsMock(tab)} />;
	}
}
