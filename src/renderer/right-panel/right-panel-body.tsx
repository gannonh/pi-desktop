import { resolveBrowserMock, resolveDiffsMock, resolveTerminalMock } from "./right-panel-mock-data";
import type { RightPanelTab } from "./right-panel-types";
import type { ProjectRecord } from "../../shared/project-state";
import { FileWorkspacePanel } from "../file-workspace/file-workspace-panel";
import { BrowserPanelMock } from "./browser-panel-mock";
import { DiffsPanelMock } from "./diffs-panel-mock";
import { TerminalPanelMock } from "./terminal-panel-mock";

interface RightPanelBodyProps {
	tab: RightPanelTab | null;
	selectedProject: ProjectRecord | null;
}

export function RightPanelBody({ tab, selectedProject }: RightPanelBodyProps) {
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
		case "files":
			return <FileWorkspacePanel project={selectedProject} />;
		case "diffs":
			return <DiffsPanelMock data={resolveDiffsMock(tab)} />;
	}
}
