import { useState, type CSSProperties } from "react";
import { PanelRightOpen } from "lucide-react";
import type { ProjectStateViewResult } from "@/shared/ipc";
import type { ProjectStateView } from "@/shared/project-state";
import { formatChatDisplayLabel } from "../../shared/format-chat-display-label";
import type { ComposerHostProps } from "../chat/composer-host";
import { createChatShellRoute, resolveChatSessionHeader, shouldUseChatStartLayout } from "../chat/chat-view-model";
import { useRightPanel } from "../right-panel/right-panel-context";
import { FileWorkspaceProvider } from "../file-workspace/file-workspace-context";
import { RightPanelWorkspace } from "../right-panel/right-panel-workspace";
import { WorkspaceTabStrip } from "../right-panel/workspace-tab-strip";
import { useShellLayout } from "../shell/shell-layout-context";
import { useColumnResize } from "../shell/use-column-resize";
import {
	clampSidebarWidth,
	clampWorkspaceWidth,
	SIDEBAR_WIDTH_MAX,
	SIDEBAR_WIDTH_MIN,
	WORKSPACE_WIDTH_MAX,
	WORKSPACE_WIDTH_MIN,
} from "../shell/shell-layout";
import type { PiSessionSettingsPayload } from "../../shared/pi-session";
import type { LiveSessionState } from "../session/session-state";
import type { TranscriptHydrationState } from "../session/transcript-hydration";
import type { ProjectSidebarActions } from "../projects/project-sidebar-actions";
import type { StatusMessage } from "../status-message";
import { ProjectMain } from "./project-main";
import { ProjectSidebar } from "./project-sidebar";
import { Badge } from "./ui/badge";

interface AppShellProps {
	state: ProjectStateView;
	onRegisterSidebarActions?: (actions: ProjectSidebarActions | null) => void;
	statusMessage?: StatusMessage;
	session: LiveSessionState;
	transcriptHydration: TranscriptHydrationState;
	transcriptScope: { projectId: string | null; chatId: string | null };
	onProjectState: (result: ProjectStateViewResult) => void;
	composerHost: ComposerHostProps;
	defaultComposerSettings: PiSessionSettingsPayload | null;
	onAbortSession: () => void;
	sidebarLoading?: boolean;
}

export function AppShell({
	state,
	onRegisterSidebarActions,
	statusMessage,
	session,
	transcriptHydration,
	transcriptScope,
	onProjectState,
	composerHost,
	defaultComposerSettings,
	onAbortSession,
	sidebarLoading = false,
}: AppShellProps) {
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const route = createChatShellRoute(state, session, session.settings ?? defaultComposerSettings);
	const sessionHeader = resolveChatSessionHeader(route, session);
	const sidebarChromeTitle = state.selectedChat?.title ? formatChatDisplayLabel(state.selectedChat.title) : undefined;
	const showChatHeaderTitle = sessionHeader !== null && !(sidebarCollapsed && sidebarChromeTitle);
	const showPathBadge = Boolean(state.selectedChat) && !sidebarCollapsed && !sessionHeader?.metadataLabel;
	const showMainHeader =
		showPathBadge ||
		(sessionHeader !== null &&
			(showChatHeaderTitle || Boolean(sessionHeader.resumeLabel) || Boolean(sessionHeader.metadataLabel)));
	const showWorkspaceColumn = route.kind !== "unavailable-project" && !shouldUseChatStartLayout(route, session);
	const selectedProjectPath = state.selectedProject?.path ?? state.selectedChat?.cwd ?? "No active project path";
	const { sidebarWidth, workspaceWidth, isNarrowLayout, setSidebarWidth, setWorkspaceWidth } = useShellLayout();
	const { state: rightPanelState, toggleCollapsed } = useRightPanel();

	const { onResizeStart: onSidebarResizeStart } = useColumnResize({
		width: sidebarWidth,
		setWidth: setSidebarWidth,
		enabled: !sidebarCollapsed,
		edge: "end",
		clamp: clampSidebarWidth,
	});
	const { onResizeStart: onWorkspaceResizeStart } = useColumnResize({
		width: workspaceWidth,
		setWidth: setWorkspaceWidth,
		enabled: showWorkspaceColumn && !rightPanelState.collapsed && !isNarrowLayout,
		edge: "start",
		clamp: clampWorkspaceWidth,
	});

	const shellStyle: CSSProperties = {
		["--app-sidebar-width" as string]: `${sidebarWidth}px`,
		gridTemplateColumns: sidebarCollapsed
			? `0 minmax(var(--app-main-min-width), 1fr)`
			: `${sidebarWidth}px minmax(var(--app-main-min-width), 1fr)`,
	};

	const workspaceColumnStyle =
		showWorkspaceColumn && !rightPanelState.collapsed && !isNarrowLayout
			? ({ width: workspaceWidth } as const)
			: undefined;

	const workspaceToggle =
		showWorkspaceColumn && rightPanelState.collapsed ? (
			<button
				type="button"
				className="app-shell__workspace-toggle workspace-tab-strip__action"
				aria-label="Show workspace"
				onClick={toggleCollapsed}
			>
				<PanelRightOpen className="workspace-tab-strip__action-icon" aria-hidden />
			</button>
		) : null;

	const projectMain = (
		<ProjectMain
			chatShellRoute={route}
			statusMessage={statusMessage}
			session={session}
			transcriptHydration={transcriptHydration}
			transcriptScope={transcriptScope}
			onProjectState={onProjectState}
			composerHost={composerHost}
			onAbortSession={onAbortSession}
			workspaceColumnDetached={showWorkspaceColumn}
			selectedProject={state.selectedProject}
		/>
	);

	return (
		<div
			data-testid="app-shell"
			className={["app-shell", sidebarCollapsed ? "app-shell--sidebar-collapsed" : ""].filter(Boolean).join(" ")}
			style={shellStyle}
		>
			<ProjectSidebar
				state={state}
				collapsed={sidebarCollapsed}
				onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
				onProjectState={onProjectState}
				onRegisterActions={onRegisterSidebarActions}
				ensureSidebarVisible={() => setSidebarCollapsed(false)}
				loading={sidebarLoading}
			/>
			{!sidebarCollapsed ? (
				<div
					className="app-shell__column-resize-handle app-shell__column-resize-handle--sidebar"
					role="slider"
					tabIndex={0}
					aria-orientation="vertical"
					aria-label="Resize project sidebar"
					aria-valuenow={sidebarWidth}
					aria-valuemin={SIDEBAR_WIDTH_MIN}
					aria-valuemax={SIDEBAR_WIDTH_MAX}
					onPointerDown={onSidebarResizeStart}
				/>
			) : null}

			{showWorkspaceColumn ? (
				<div
					className={["app-shell__workspace-layout", isNarrowLayout ? "app-shell__workspace-layout--stacked" : ""]
						.filter(Boolean)
						.join(" ")}
				>
					<div className="app-shell__chat-column">
						<header
							className={["app-shell__chat-header", showMainHeader ? "" : "app-shell__chat-header--empty"]
								.filter(Boolean)
								.join(" ")}
						>
							{sessionHeader && showChatHeaderTitle ? (
								<h1
									id="app-shell-title"
									className="app-shell__chat-title app-chrome-title"
									title={sessionHeader.title}
								>
									{sessionHeader.title}
								</h1>
							) : null}
							{showPathBadge ? (
								<Badge className="app-shell__path-badge" variant="outline" title={selectedProjectPath}>
									{selectedProjectPath}
								</Badge>
							) : null}
						</header>
						{projectMain}
					</div>
					{workspaceToggle}
					<aside
						className={[
							"app-shell__workspace-column",
							isNarrowLayout ? "app-shell__workspace-column--stacked" : "",
							rightPanelState.collapsed ? "app-shell__workspace-column--collapsed" : "",
						]
							.filter(Boolean)
							.join(" ")}
						style={workspaceColumnStyle}
						aria-label={rightPanelState.collapsed ? undefined : "Workspace"}
						aria-hidden={rightPanelState.collapsed ? true : undefined}
					>
						{!rightPanelState.collapsed && !isNarrowLayout ? (
							<div
								className="app-shell__column-resize-handle app-shell__column-resize-handle--workspace"
								role="slider"
								tabIndex={0}
								aria-orientation="vertical"
								aria-label="Resize workspace"
								aria-valuenow={workspaceWidth}
								aria-valuemin={WORKSPACE_WIDTH_MIN}
								aria-valuemax={WORKSPACE_WIDTH_MAX}
								onPointerDown={onWorkspaceResizeStart}
							/>
						) : null}
						<FileWorkspaceProvider project={state.selectedProject}>
							<div className="app-shell__workspace-chrome">
								<WorkspaceTabStrip />
							</div>
							<div className="app-shell__workspace-body">
								<RightPanelWorkspace selectedProject={state.selectedProject} onProjectState={onProjectState} />
							</div>
						</FileWorkspaceProvider>
					</aside>
				</div>
			) : (
				<div className="app-shell__main">
					<header
						className={["app-shell__main-header", showMainHeader ? "" : "app-shell__main-header--empty"]
							.filter(Boolean)
							.join(" ")}
					>
						{sessionHeader &&
						(showChatHeaderTitle || sessionHeader.resumeLabel || sessionHeader.metadataLabel) ? (
							<div className="app-shell__main-header-copy">
								{showChatHeaderTitle ? (
									<h1 id="app-shell-title" className="app-shell__chat-title app-chrome-title">
										{sessionHeader.title}
									</h1>
								) : null}
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
					{projectMain}
				</div>
			)}
		</div>
	);
}
