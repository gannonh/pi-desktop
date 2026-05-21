import { useState } from "react";
import { RightPanelAddMenu } from "./right-panel-add-menu";
import { RightPanelBody } from "./right-panel-body";
import {
	addRightPanelTab,
	createDefaultRightPanelState,
	getActiveRightPanelTab,
	selectRightPanelTab,
	setRightPanelCollapsed,
} from "./right-panel-state";
import { RightPanelTabs } from "./right-panel-tabs";
import type { RightPanelKind, RightPanelState } from "./right-panel-types";

interface RightPanelWorkspaceProps {
	initialState?: RightPanelState;
}

export function RightPanelWorkspace({ initialState = createDefaultRightPanelState() }: RightPanelWorkspaceProps) {
	const [state, setState] = useState(initialState);
	const [addMenuOpen, setAddMenuOpen] = useState(false);
	const activeTab = getActiveRightPanelTab(state);

	const handleAdd = (kind: RightPanelKind) => {
		setState((current) => addRightPanelTab(current, kind));
		setAddMenuOpen(false);
	};

	return (
		<aside
			className={`right-panel${state.collapsed ? " right-panel--collapsed" : ""}`}
			aria-label="Right panel workspace"
		>
			<header className="right-panel__header">
				<RightPanelTabs
					tabs={state.tabs}
					activeTabId={state.activeTabId}
					onSelect={(tabId) => setState((current) => selectRightPanelTab(current, tabId))}
				/>
				<div className="right-panel__header-actions">
					<RightPanelAddMenu
						open={addMenuOpen}
						onToggle={() => setAddMenuOpen((open) => !open)}
						onAdd={handleAdd}
					/>
					<button
						type="button"
						className="right-panel__collapse-button"
						aria-expanded={!state.collapsed}
						onClick={() => setState((current) => setRightPanelCollapsed(current, !current.collapsed))}
					>
						{state.collapsed ? "Show panel" : "Hide panel"}
					</button>
				</div>
			</header>
			{state.collapsed ? (
				<p className="right-panel__collapsed-hint">Right workspace hidden. Show panel to switch tabs.</p>
			) : (
				<div className="right-panel__body" role="tabpanel">
					{state.tabs.length === 0 ? (
						<div className="right-panel__empty">
							<h2 className="right-panel__empty-title">Open a panel</h2>
							<p className="right-panel__empty-copy">
								Add Terminal, Browser, File, Markdown, or Changes tabs for mock work surfaces.
							</p>
						</div>
					) : null}
					<RightPanelBody tab={activeTab} />
				</div>
			)}
		</aside>
	);
}
