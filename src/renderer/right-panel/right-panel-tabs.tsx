import { useEffect, useRef } from "react";
import type { RightPanelTab } from "./right-panel-types";
import { WORKSPACE_PANEL_ID } from "./workspace-panel-id";

interface RightPanelTabsProps {
	tabs: readonly RightPanelTab[];
	activeTabId: string | null;
	onSelect: (tabId: string) => void;
	onRemove?: (tabId: string) => void;
}

export function RightPanelTabs({ tabs, activeTabId, onSelect, onRemove }: RightPanelTabsProps) {
	const listRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!activeTabId || !listRef.current) {
			return;
		}
		const activeTab = listRef.current.querySelector<HTMLButtonElement>(`[data-tab-id="${activeTabId}"]`);
		if (activeTab && typeof activeTab.scrollIntoView === "function") {
			activeTab.scrollIntoView({ block: "nearest", inline: "nearest" });
		}
	}, [activeTabId, tabs]);

	if (tabs.length === 0) {
		return null;
	}

	return (
		<div ref={listRef} className="workspace-tabs" role="tablist" aria-label="Workspace panel tabs">
			{tabs.map((tab) => {
				const selected = tab.id === activeTabId;
				const label = tab.subtitle ? `${tab.title} · ${tab.subtitle}` : tab.title;
				return (
					<div key={tab.id} className="workspace-tabs__tab-wrap">
						<button
							type="button"
							id={`workspace-tab-${tab.id}`}
							data-tab-id={tab.id}
							className={`workspace-tabs__tab${selected ? " workspace-tabs__tab--active" : ""}`}
							role="tab"
							aria-selected={selected}
							aria-controls={WORKSPACE_PANEL_ID}
							title={label}
							onClick={() => onSelect(tab.id)}
						>
							<span className="workspace-tabs__tab-label">{tab.title}</span>
						</button>
						{onRemove ? (
							<button
								type="button"
								className="workspace-tabs__tab-close"
								aria-label={`Close ${tab.title}`}
								onClick={(event) => {
									event.stopPropagation();
									onRemove(tab.id);
								}}
							>
								×
							</button>
						) : null}
					</div>
				);
			})}
		</div>
	);
}
