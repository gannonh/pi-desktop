import type { RightPanelTab } from "./right-panel-types";

interface RightPanelTabsProps {
	tabs: readonly RightPanelTab[];
	activeTabId: string | null;
	onSelect: (tabId: string) => void;
}

export function RightPanelTabs({ tabs, activeTabId, onSelect }: RightPanelTabsProps) {
	if (tabs.length === 0) {
		return null;
	}

	return (
		<div className="right-panel__tabs" role="tablist" aria-label="Right panel tabs">
			{tabs.map((tab) => {
				const selected = tab.id === activeTabId;
				return (
					<button
						key={tab.id}
						type="button"
						className={`right-panel__tab${selected ? " right-panel__tab--active" : ""}`}
						role="tab"
						aria-selected={selected}
						onClick={() => onSelect(tab.id)}
					>
						<span className="right-panel__tab-title">{tab.title}</span>
						{tab.subtitle ? <span className="right-panel__tab-subtitle">{tab.subtitle}</span> : null}
					</button>
				);
			})}
		</div>
	);
}
