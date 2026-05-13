import type { ProjectStateViewResult } from "@/shared/ipc";
import type { ProjectStateView } from "@/shared/project-state";
import { useState } from "react";
import { Badge } from "./ui/badge";
import { ProjectMain } from "./project-main";
import { ProjectSidebar } from "./project-sidebar";

interface AppShellProps {
	state: ProjectStateView;
	statusMessage?: string;
	onProjectState: (result: ProjectStateViewResult) => void;
}

export function AppShell({ state, statusMessage, onProjectState }: AppShellProps) {
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const showHeaderMeta = Boolean(state.selectedChat) && !sidebarCollapsed;
	const selectedProjectPath = state.selectedProject?.path ?? "No active project path";

	return (
		<div
			data-testid="app-shell"
			className={["app-shell", sidebarCollapsed ? "app-shell--sidebar-collapsed" : ""].filter(Boolean).join(" ")}
		>
			<ProjectSidebar
				state={state}
				collapsed={sidebarCollapsed}
				onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
				onProjectState={onProjectState}
			/>

			<div className="app-shell__main">
				<header
					className={["app-shell__main-header", showHeaderMeta ? "" : "app-shell__main-header--empty"]
						.filter(Boolean)
						.join(" ")}
				>
					{showHeaderMeta ? (
						<Badge className="app-shell__path-badge" variant="outline" title={selectedProjectPath}>
							{selectedProjectPath}
						</Badge>
					) : null}
				</header>

				<ProjectMain state={state} statusMessage={statusMessage} onProjectState={onProjectState} />
			</div>
		</div>
	);
}
