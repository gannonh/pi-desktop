import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { getExplorerFileIcon } from "../file-workspace/file-explorer-icons";
import { useOptionalFileWorkspace } from "../file-workspace/use-optional-file-workspace";
import { WORKSPACE_PANEL_ID } from "./workspace-panel-id";

interface WorkspaceFileTabsProps {
	activeTabId: string | null;
	onSelect: (tabId: string) => void;
}

export function WorkspaceFileTabs({ activeTabId, onSelect }: WorkspaceFileTabsProps) {
	const fileWorkspace = useOptionalFileWorkspace();
	const listRef = useRef<HTMLDivElement>(null);
	const tabs = fileWorkspace?.state.tabs ?? [];

	useEffect(() => {
		if (!activeTabId || !listRef.current) {
			return;
		}
		const activeTab = Array.from(listRef.current.querySelectorAll<HTMLButtonElement>("[data-tab-id]")).find(
			(candidate) => candidate.dataset.tabId === activeTabId,
		);
		if (activeTab && typeof activeTab.scrollIntoView === "function") {
			activeTab.scrollIntoView({ block: "nearest", inline: "nearest" });
		}
	}, [activeTabId]);

	if (tabs.length === 0) {
		return null;
	}

	return (
		<div ref={listRef} className="workspace-tabs workspace-tabs--files" role="tablist" aria-label="Open files">
			{tabs.map((tab) => {
				const selected = tab.id === activeTabId;
				const FileIcon = getExplorerFileIcon(tab.title);
				return (
					<div
						key={tab.id}
						className={`workspace-tabs__tab-wrap workspace-tabs__tab-wrap--file${selected ? " workspace-tabs__tab-wrap--active" : ""}`}
					>
						<button
							type="button"
							id={`workspace-tab-${tab.id}`}
							data-tab-id={tab.id}
							className="workspace-tabs__file-tab-select"
							role="tab"
							aria-selected={selected}
							aria-controls={WORKSPACE_PANEL_ID}
							title={tab.relativePath}
							onClick={() => onSelect(tab.id)}
						>
							<FileIcon className="workspace-tabs__file-icon" aria-hidden strokeWidth={1.75} />
							<span className="workspace-tabs__tab-label">{tab.dirty ? `${tab.title} •` : tab.title}</span>
						</button>
						<button
							type="button"
							className="workspace-tabs__file-tab-close"
							aria-label={`Close ${tab.title}`}
							onClick={(event) => {
								event.stopPropagation();
								fileWorkspace?.closeTab(tab.id);
							}}
						>
							<X className="workspace-tabs__file-tab-close-icon" aria-hidden strokeWidth={1.75} />
						</button>
					</div>
				);
			})}
		</div>
	);
}
