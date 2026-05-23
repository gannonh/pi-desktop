import { FolderTree, GitBranch, Globe, Terminal, type LucideIcon } from "lucide-react";
import type { RightPanelTab } from "./right-panel-types";
import { WORKSPACE_TOOL_KINDS } from "./right-panel-state";
import { FILE_WORKSPACE_VIEW_ID } from "./workspace-tab-ids";
import { WORKSPACE_PANEL_ID } from "./workspace-panel-id";

type WorkspaceToolKind = (typeof WORKSPACE_TOOL_KINDS)[number];

const toolIcons: Record<WorkspaceToolKind, LucideIcon> = {
	diffs: GitBranch,
	terminal: Terminal,
	browser: Globe,
};

const toolLabels: Record<WorkspaceToolKind, string> = {
	diffs: "Changes",
	terminal: "Terminal",
	browser: "Browser",
};

interface WorkspaceToolTabsProps {
	tabs: readonly RightPanelTab[];
	activeTabId: string | null;
	filesActive: boolean;
	onSelect: (tabId: string) => void;
}

const toolTabOrder: WorkspaceToolKind[] = ["diffs", "terminal", "browser"];

export function WorkspaceToolTabs({ tabs, activeTabId, filesActive, onSelect }: WorkspaceToolTabsProps) {
	const explorerSelected = activeTabId === FILE_WORKSPACE_VIEW_ID;

	return (
		<div className="workspace-tabs workspace-tabs--tools" role="presentation">
			{toolTabOrder.map((kind) => {
				const tab = tabs.find((candidate) => candidate.kind === kind);
				if (!tab) {
					return null;
				}
				const Icon = toolIcons[kind];
				const selected = !filesActive && tab.id === activeTabId;
				return (
					<div key={tab.id} className="workspace-tabs__tab-wrap workspace-tabs__tab-wrap--tool">
						<button
							type="button"
							id={`workspace-tab-${tab.id}`}
							data-tab-id={tab.id}
							className={`workspace-tabs__tab workspace-tabs__tab--tool${selected ? " workspace-tabs__tab--active" : ""}`}
							role="tab"
							aria-selected={selected}
							aria-controls={WORKSPACE_PANEL_ID}
							aria-label={toolLabels[kind]}
							title={tab.subtitle ? `${tab.title} · ${tab.subtitle}` : tab.title}
							onClick={() => onSelect(tab.id)}
						>
							<Icon className="workspace-tabs__tool-icon" aria-hidden strokeWidth={1.75} />
						</button>
					</div>
				);
			})}
			<div className="workspace-tabs__tab-wrap workspace-tabs__tab-wrap--tool">
				<button
					type="button"
					id="workspace-tab-file-explorer"
					data-tab-id={FILE_WORKSPACE_VIEW_ID}
					className={`workspace-tabs__tab workspace-tabs__tab--tool${explorerSelected ? " workspace-tabs__tab--active" : ""}`}
					role="tab"
					aria-selected={explorerSelected}
					aria-controls={WORKSPACE_PANEL_ID}
					aria-label="File explorer"
					title="File explorer"
					onClick={() => onSelect(FILE_WORKSPACE_VIEW_ID)}
				>
					<FolderTree className="workspace-tabs__tool-icon" aria-hidden strokeWidth={1.75} />
				</button>
			</div>
		</div>
	);
}
