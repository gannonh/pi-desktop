import { Badge } from "@/renderer/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/renderer/components/ui/card";
import type { ProjectStateViewResult } from "@/shared/ipc";
import type { ProjectStateView } from "@/shared/project-state";
import { PanelRight, Play, Terminal } from "lucide-react";
import { createProjectMainCopy } from "../projects/project-view-model";
import { ProjectSidebar } from "./project-sidebar";

interface AppShellProps {
	state: ProjectStateView;
	versionLabel: string;
	statusMessage?: string;
	onProjectState: (result: ProjectStateViewResult) => void;
}

export function AppShell({ state, versionLabel, statusMessage, onProjectState }: AppShellProps) {
	const mainCopy = createProjectMainCopy(state);

	return (
		<div data-testid="app-shell" className="app-shell">
			<ProjectSidebar state={state} versionLabel={versionLabel} onProjectState={onProjectState} />

			<main className="app-shell__main">
				<header className="app-shell__main-header">
					<div className="app-shell__main-title-group">
						<h1 className="app-shell__main-title">
							{mainCopy.kind === "global-empty" ? "Project home" : mainCopy.projectSelectorLabel}
						</h1>
						<p className="app-shell__main-subtitle">{mainCopy.title}</p>
					</div>
					<Badge variant="outline">macOS local</Badge>
				</header>

				<section className="app-shell__main-body">
					{statusMessage ? <div className="app-shell__status-message">{statusMessage}</div> : null}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<Play className="size-4" />
								Project navigation ready
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm text-muted-foreground">
							<p>Version {versionLabel}</p>
							<p>Project main surfaces arrive in the next task.</p>
						</CardContent>
					</Card>
				</section>
			</main>

			<aside className="app-shell__details">
				<div className="app-shell__details-header">
					<PanelRight className="size-4" />
					<div className="text-sm font-medium">Details</div>
				</div>
				<div className="app-shell__details-body">
					<Card>
						<CardHeader className="p-3">
							<CardTitle className="flex items-center gap-2 text-sm">
								<Terminal className="size-4" />
								Runtime
							</CardTitle>
						</CardHeader>
						<CardContent className="px-3 pb-3 pt-0 text-xs text-muted-foreground">Not connected</CardContent>
					</Card>
				</div>
			</aside>
		</div>
	);
}
