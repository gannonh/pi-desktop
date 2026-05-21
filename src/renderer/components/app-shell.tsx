import { useState } from "react";
import type { ProjectStateViewResult } from "@/shared/ipc";
import type { ProjectStateView } from "@/shared/project-state";
import type { ComposerHostProps } from "../chat/composer-host";
import { createChatShellRoute, resolveChatSessionHeader } from "../chat/chat-view-model";
import type { PiSessionSettingsPayload } from "../../shared/pi-session";
import type { LiveSessionState } from "../session/session-state";
import type { TranscriptHydrationState } from "../session/transcript-hydration";
import { ProjectMain } from "./project-main";
import { ProjectSidebar } from "./project-sidebar";
import { Badge } from "./ui/badge";

interface AppShellProps {
	state: ProjectStateView;
	statusMessage?: string;
	session: LiveSessionState;
	transcriptHydration: TranscriptHydrationState;
	transcriptScope: { projectId: string | null; chatId: string | null };
	onProjectState: (result: ProjectStateViewResult) => void;
	composerHost: ComposerHostProps;
	defaultComposerSettings: PiSessionSettingsPayload | null;
	onAbortSession: () => void;
}

export function AppShell({
	state,
	statusMessage,
	session,
	transcriptHydration,
	transcriptScope,
	onProjectState,
	composerHost,
	defaultComposerSettings,
	onAbortSession,
}: AppShellProps) {
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const route = createChatShellRoute(state, session, session.settings ?? defaultComposerSettings);
	const sessionHeader = resolveChatSessionHeader(route, session);
	const showPathBadge = Boolean(state.selectedChat) && !sidebarCollapsed && !sessionHeader?.metadataLabel;
	const showMainHeader = showPathBadge || sessionHeader !== null;
	const selectedProjectPath = state.selectedProject?.path ?? state.selectedChat?.cwd ?? "No active project path";

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
					className={["app-shell__main-header", showMainHeader ? "" : "app-shell__main-header--empty"]
						.filter(Boolean)
						.join(" ")}
				>
					{sessionHeader ? (
						<div className="app-shell__main-header-copy">
							<h1 id="app-shell-title" className="app-shell__chat-title">
								{sessionHeader.title}
							</h1>
							{sessionHeader.resumeLabel && sessionHeader.metadataLabel ? (
								<section className="app-shell__session-labels" aria-label="Session metadata">
									<span className="app-shell__resume-label">{sessionHeader.resumeLabel}</span>
									<span className="app-shell__metadata-label">{sessionHeader.metadataLabel}</span>
								</section>
							) : null}
						</div>
					) : null}
					{showPathBadge ? (
						<Badge className="app-shell__path-badge" variant="outline" title={selectedProjectPath}>
							{selectedProjectPath}
						</Badge>
					) : null}
				</header>

				<ProjectMain
					chatShellRoute={route}
					statusMessage={statusMessage}
					session={session}
					transcriptHydration={transcriptHydration}
					transcriptScope={transcriptScope}
					onProjectState={onProjectState}
					composerHost={composerHost}
					onAbortSession={onAbortSession}
				/>
			</div>
		</div>
	);
}
