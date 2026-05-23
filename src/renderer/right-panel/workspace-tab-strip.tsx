import { Expand, Maximize2 } from "lucide-react";
import { SidebarRight01Icon } from "@hugeicons/core-free-icons";
import { Hugeicon } from "../components/hugeicon";
import { useOptionalFileWorkspace } from "../file-workspace/use-optional-file-workspace";
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
				<button type="button" className="workspace-tab-strip__action" aria-label="Expand panel" disabled>
					<Expand className="workspace-tab-strip__action-icon" aria-hidden strokeWidth={1.75} />
				</button>
				<button type="button" className="workspace-tab-strip__action" aria-label="Full screen panel" disabled>
					<Maximize2 className="workspace-tab-strip__action-icon" aria-hidden strokeWidth={1.75} />
				</button>
				<button
					type="button"
					className="workspace-tab-strip__action"
					aria-label={state.collapsed ? "Show workspace" : "Hide workspace"}
					aria-pressed={!state.collapsed}
					onClick={toggleCollapsed}
				>
					<Hugeicon icon={SidebarRight01Icon} className="workspace-tab-strip__action-icon" />
				</button>
			</div>
		</section>
	);
}
