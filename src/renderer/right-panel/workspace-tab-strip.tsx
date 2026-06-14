import { Expand, Maximize2, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useOptionalFileWorkspace } from "../file-workspace/use-optional-file-workspace";
import { PlannedAffordanceButton } from "../components/planned-affordance";
import { RightPanelAddMenu } from "./right-panel-add-menu";
import { useRightPanel } from "./right-panel-context";
import { getWorkspaceToolTabs, isWorkspaceFilesActive } from "./right-panel-state";
import { WorkspaceFileTabs } from "./workspace-file-tabs";
import { WorkspaceToolTabs } from "./workspace-tool-tabs";

export function WorkspaceTabStrip() {
	const { state, selectTab, addTabFromMenu, toggleCollapsed } = useRightPanel();
	const fileWorkspace = useOptionalFileWorkspace();
	const toolTabs = getWorkspaceToolTabs(state);
	const filesActive = isWorkspaceFilesActive(state);

	const handleSelectTab = (tabId: string) => {
		selectTab(tabId);
		if (tabId.startsWith("file:")) {
			fileWorkspace?.setActiveTab(tabId);
		}
	};

	return (
		<section className="workspace-tab-strip" aria-label="Workspace tabs">
			<div className="workspace-tab-strip__main">
				<WorkspaceToolTabs
					tabs={toolTabs}
					activeTabId={state.activeTabId}
					filesActive={filesActive}
					onSelect={handleSelectTab}
				/>
				{fileWorkspace && fileWorkspace.state.tabs.length > 0 ? (
					<div className="workspace-tab-strip__divider" aria-hidden />
				) : null}
				<WorkspaceFileTabs activeTabId={state.activeTabId} onSelect={handleSelectTab} />
			</div>
			<div className="workspace-tab-strip__actions">
				<RightPanelAddMenu onAdd={addTabFromMenu} />
				<PlannedAffordanceButton
					id="workspace.expand"
					className="workspace-tab-strip__action"
					aria-label="Expand panel"
				>
					<Expand className="workspace-tab-strip__action-icon" aria-hidden strokeWidth={1.75} />
				</PlannedAffordanceButton>
				<PlannedAffordanceButton
					id="workspace.fullscreen"
					className="workspace-tab-strip__action"
					aria-label="Full screen panel"
				>
					<Maximize2 className="workspace-tab-strip__action-icon" aria-hidden strokeWidth={1.75} />
				</PlannedAffordanceButton>
				<button
					type="button"
					className="workspace-tab-strip__action"
					aria-label={state.collapsed ? "Show workspace" : "Hide workspace"}
					aria-pressed={!state.collapsed}
					onClick={toggleCollapsed}
				>
					{state.collapsed ? (
						<PanelRightOpen className="workspace-tab-strip__action-icon" aria-hidden />
					) : (
						<PanelRightClose className="workspace-tab-strip__action-icon" aria-hidden />
					)}
				</button>
			</div>
		</section>
	);
}
