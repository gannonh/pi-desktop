import type { ProjectRecord } from "../../shared/project-state";
import { RightPanelBody } from "./right-panel-body";
import { useRightPanel } from "./right-panel-context";
import { WORKSPACE_PANEL_ID } from "./workspace-panel-id";

interface RightPanelWorkspaceProps {
	selectedProject: ProjectRecord | null;
}

export function RightPanelWorkspace({ selectedProject }: RightPanelWorkspaceProps) {
	const { state, activeTab, filesActive } = useRightPanel();

	if (state.collapsed) {
		return null;
	}

	return (
		<aside className="workspace-panel" aria-label="Workspace panel">
			{state.tabs.length === 0 ? (
				<div className="workspace-panel__empty">
					<h2 className="workspace-panel__empty-title">Open a panel</h2>
					<p className="workspace-panel__empty-copy">
						Use + in the workspace tab bar to add Terminal, Browser, File, or Changes panels.
					</p>
				</div>
			) : (
				<div
					id={WORKSPACE_PANEL_ID}
					className="workspace-panel__body"
					role="tabpanel"
					aria-labelledby={activeTab ? `workspace-tab-${activeTab.id}` : undefined}
					data-testid="workspace-panel-body"
					data-active-kind={filesActive ? "files" : (activeTab?.kind ?? "none")}
				>
					<RightPanelBody
						key={filesActive ? "files" : (activeTab?.id ?? "empty")}
						tab={activeTab}
						filesActive={filesActive}
						selectedProject={selectedProject}
					/>
				</div>
			)}
		</aside>
	);
}
