import type { ProjectStateViewResult } from "@/shared/ipc";
import type { ProjectStateView } from "@/shared/project-state";
import { Badge } from "./ui/badge";
import { ProjectMain } from "./project-main";
import { ProjectSidebar } from "./project-sidebar";

interface AppShellProps {
	state: ProjectStateView;
	versionLabel: string;
	statusMessage?: string;
	onProjectState: (result: ProjectStateViewResult) => void;
}

export function AppShell({ state, versionLabel, statusMessage, onProjectState }: AppShellProps) {
	return (
		<div data-testid="app-shell" className="app-shell">
			<ProjectSidebar state={state} versionLabel={versionLabel} onProjectState={onProjectState} />

			<div className="app-shell__main">
				<header className="app-shell__main-header">
					<div className="app-shell__main-title-group">
						<div className="app-shell__main-title">Project home</div>
						<p className="app-shell__main-subtitle">Local projects and chats</p>
					</div>
					<Badge variant="outline">macOS local</Badge>
				</header>

				<ProjectMain state={state} statusMessage={statusMessage} onProjectState={onProjectState} />
			</div>
		</div>
	);
}
