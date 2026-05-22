import { SidebarRight01Icon } from "@hugeicons/core-free-icons";
import { Hugeicon } from "../components/hugeicon";
import { RightPanelAddMenu } from "./right-panel-add-menu";
import { useRightPanel } from "./right-panel-context";
import { RightPanelTabs } from "./right-panel-tabs";

export function WorkspaceTabStrip() {
	const { state, selectTab, addTabFromMenu, removeTab, toggleCollapsed } = useRightPanel();

	return (
		<section className="workspace-tab-strip" aria-label="Workspace tabs">
			<RightPanelTabs
				tabs={state.tabs}
				activeTabId={state.activeTabId}
				onSelect={selectTab}
				onRemove={state.tabs.length > 1 ? removeTab : undefined}
			/>
			<div className="workspace-tab-strip__actions">
				<RightPanelAddMenu onAdd={addTabFromMenu} />
				<button
					type="button"
					className="workspace-tab-strip__toggle"
					aria-label={state.collapsed ? "Show workspace" : "Hide workspace"}
					aria-pressed={!state.collapsed}
					onClick={toggleCollapsed}
				>
					<Hugeicon icon={SidebarRight01Icon} className="workspace-tab-strip__toggle-icon" />
				</button>
			</div>
		</section>
	);
}
