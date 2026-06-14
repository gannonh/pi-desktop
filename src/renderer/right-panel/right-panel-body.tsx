import { resolveBrowserMock } from "./right-panel-mock-data";
import type { RightPanelTab } from "./right-panel-types";
import type { ProjectStateViewResult } from "../../shared/ipc";
import type { ProjectRecord } from "../../shared/project-state";
import { ChangesPanel } from "../changes-panel/ChangesPanel";
import { FileWorkspacePanel } from "../file-workspace/file-workspace-panel";
import { TerminalPanel } from "../terminal/terminal-panel";
import { BrowserPanelMock } from "./browser-panel-mock";

interface RightPanelBodyProps {
	tab: RightPanelTab | null;
	filesActive: boolean;
	selectedProject: ProjectRecord | null;
	changesActive: boolean;
	terminalActive: boolean;
	onProjectState?: (result: ProjectStateViewResult) => void;
}

export function RightPanelBody({
	tab,
	filesActive,
	selectedProject,
	changesActive,
	terminalActive,
	onProjectState,
}: RightPanelBodyProps) {
	if (filesActive) {
		return <FileWorkspacePanel project={selectedProject} />;
	}

	if (!tab) {
		return (
			<div className="right-panel__empty-body">
				<p>Open a panel to inspect terminal, browser, file, or PR work here.</p>
			</div>
		);
	}

	switch (tab.kind) {
		case "terminal":
			return <TerminalPanel project={selectedProject} isActive={terminalActive} />;
		case "browser":
			return <BrowserPanelMock data={resolveBrowserMock(tab)} />;
		case "changes":
			return <ChangesPanel project={selectedProject} isActive={changesActive} onProjectState={onProjectState} />;
		case "files":
			return <FileWorkspacePanel project={selectedProject} />;
	}
}
