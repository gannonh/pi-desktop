import {
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	Check,
	ChevronDown,
	ChevronRight,
	CirclePlus,
	Clock,
	Folder,
	FolderOpen,
	FolderPlus,
	ListFilter,
	MessageCircle,
	Minimize2,
	MoreHorizontal,
	PanelLeftClose,
	PanelLeftOpen,
	Pin,
	Search,
	SquarePen,
	Star,
	Workflow,
	Wrench,
	X,
} from "lucide-react";
import { useState } from "react";
import type { ProjectStateViewResult } from "../../shared/ipc";
import type { ProjectStateView } from "../../shared/project-state";
import {
	createProjectSidebarRows,
	createStandaloneChatSidebarRows,
	type SidebarProjectRow,
} from "../projects/project-view-model";
import {
	MenuAnchor,
	MenuItem,
	MenuItemIcon,
	MenuSectionHeading,
	MenuSelectionIndicator,
	MenuSeparator,
	MenuSurface,
} from "./menu";

interface ProjectSidebarProps {
	state: ProjectStateView;
	collapsed: boolean;
	onToggleCollapsed: () => void;
	onProjectState: (result: ProjectStateViewResult) => void;
}

type MenuState =
	| {
			kind: "add";
	  }
	| {
			kind: "project";
			projectId: string;
	  }
	| {
			kind: "projects-filter";
	  }
	| null;

const toProjectStateError = (error: unknown): ProjectStateViewResult => ({
	ok: false,
	error: {
		code: "renderer:project-action-failed",
		message: error instanceof Error ? error.message : "Project action failed.",
	},
});

export function ProjectSidebar({ state, collapsed, onToggleCollapsed, onProjectState }: ProjectSidebarProps) {
	const [menu, setMenu] = useState<MenuState>(null);
	const [closedProjectIds, setClosedProjectIds] = useState<Set<string>>(() => new Set());
	const [projectsCollapsed, setProjectsCollapsed] = useState(false);
	const [chatsCollapsed, setChatsCollapsed] = useState(false);
	const rows = createProjectSidebarRows(state);
	const standaloneChatRows = createStandaloneChatSidebarRows(state);
	const chromeTitle = state.selectedChat?.title;
	const menuOpen = menu !== null && !collapsed;

	const toggleCollapsed = () => {
		setMenu(null);
		onToggleCollapsed();
	};

	const runProjectAction = async (action: () => Promise<ProjectStateViewResult>) => {
		setMenu(null);

		try {
			onProjectState(await action());
		} catch (error) {
			onProjectState(toProjectStateError(error));
		}
	};

	const toggleProjectOpen = (projectId: string) => {
		setClosedProjectIds((current) => {
			const next = new Set(current);
			if (next.has(projectId)) {
				next.delete(projectId);
			} else {
				next.add(projectId);
			}
			return next;
		});
	};

	return (
		<aside className="project-sidebar" aria-label="Project navigation">
			<div className="project-sidebar__chrome">
				<div className="project-sidebar__window-controls" aria-hidden="true">
					<span className="project-sidebar__window-dot project-sidebar__window-dot--close" />
					<span className="project-sidebar__window-dot project-sidebar__window-dot--minimize" />
					<span className="project-sidebar__window-dot project-sidebar__window-dot--maximize" />
				</div>
				<div className="project-sidebar__chrome-actions">
					<button
						className="project-sidebar__chrome-button"
						type="button"
						aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
						aria-pressed={collapsed}
						onClick={toggleCollapsed}
					>
						{collapsed ? (
							<PanelLeftOpen className="project-sidebar__icon" />
						) : (
							<PanelLeftClose className="project-sidebar__icon" />
						)}
					</button>
					<button className="project-sidebar__chrome-button" type="button" disabled aria-label="Back">
						<ArrowLeft className="project-sidebar__icon" />
					</button>
					<button className="project-sidebar__chrome-button" type="button" disabled aria-label="Forward">
						<ArrowRight className="project-sidebar__icon" />
					</button>
					<button
						className="project-sidebar__chrome-button project-sidebar__chrome-button--collapsed-only"
						type="button"
						disabled
						aria-label="New chat"
					>
						<SquarePen className="project-sidebar__icon" />
					</button>
				</div>
				{chromeTitle ? (
					<div className="project-sidebar__chrome-title-group">
						<div className="project-sidebar__chrome-title">{chromeTitle}</div>
						<button className="project-sidebar__chrome-button" type="button" disabled aria-label="Chat menu">
							<MoreHorizontal className="project-sidebar__icon" />
						</button>
					</div>
				) : null}
			</div>

			<div
				className={["project-sidebar__panel", menuOpen ? "project-sidebar__panel--menu-open" : ""]
					.filter(Boolean)
					.join(" ")}
			>
				<div className="project-sidebar__top-actions">
					<button className="project-sidebar__action" type="button" disabled>
						<SquarePen className="project-sidebar__icon" />
						<span>New chat</span>
					</button>
					<button className="project-sidebar__action" type="button" disabled>
						<Search className="project-sidebar__icon" />
						<span>Search</span>
					</button>
					<button className="project-sidebar__action" type="button" disabled>
						<Wrench className="project-sidebar__icon" />
						<span>Plugins</span>
					</button>
					<button className="project-sidebar__action" type="button" disabled>
						<Workflow className="project-sidebar__icon" />
						<span>Automations</span>
					</button>
				</div>

				<div className="project-sidebar__section-heading">
					<button
						className="project-sidebar__section-title"
						type="button"
						aria-expanded={!projectsCollapsed}
						onClick={() => setProjectsCollapsed((current) => !current)}
					>
						<span>Projects</span>
						{projectsCollapsed ? (
							<ChevronRight className="project-sidebar__icon project-sidebar__section-chevron" />
						) : (
							<ChevronDown className="project-sidebar__icon" />
						)}
					</button>
					<div className="project-sidebar__heading-actions">
						<button
							className="project-sidebar__heading-button"
							type="button"
							disabled
							aria-label="Collapse all projects"
						>
							<Minimize2 className="project-sidebar__icon" />
						</button>
						<MenuAnchor>
							<button
								className="project-sidebar__heading-button"
								type="button"
								aria-label="Filter projects"
								aria-expanded={menu?.kind === "projects-filter"}
								onClick={() =>
									setMenu((current) =>
										current?.kind === "projects-filter" ? null : { kind: "projects-filter" },
									)
								}
							>
								<ListFilter className="project-sidebar__icon" />
							</button>
							{menu?.kind === "projects-filter" ? <ProjectsFilterMenu /> : null}
						</MenuAnchor>
						<MenuAnchor>
							<button
								className="project-sidebar__heading-button"
								type="button"
								aria-label="Add project"
								aria-expanded={menu?.kind === "add"}
								onClick={() => setMenu((current) => (current?.kind === "add" ? null : { kind: "add" }))}
							>
								<FolderPlus className="project-sidebar__icon" />
							</button>
							{menu?.kind === "add" ? (
								<MenuSurface className="project-sidebar__add-menu">
									<MenuItem
										onClick={() => runProjectAction(() => window.piDesktop.project.createFromScratch())}
									>
										<MenuItemIcon>
											<FolderPlus />
										</MenuItemIcon>
										Start from scratch
									</MenuItem>
									<MenuItem
										onClick={() => runProjectAction(() => window.piDesktop.project.addExistingFolder())}
									>
										<MenuItemIcon>
											<FolderOpen />
										</MenuItemIcon>
										Use an existing folder
									</MenuItem>
								</MenuSurface>
							) : null}
						</MenuAnchor>
					</div>
				</div>

				{projectsCollapsed ? null : (
					<div className="project-sidebar__projects">
						{rows.map((row) => (
							<ProjectSidebarProject
								key={row.projectId}
								row={row}
								menu={menu}
								setMenu={setMenu}
								closed={closedProjectIds.has(row.projectId)}
								onToggleOpen={toggleProjectOpen}
								onProjectState={onProjectState}
								runProjectAction={runProjectAction}
							/>
						))}
					</div>
				)}

				<div className="project-sidebar__section-heading">
					<button
						className="project-sidebar__section-title"
						type="button"
						aria-expanded={!chatsCollapsed}
						onClick={() => setChatsCollapsed((current) => !current)}
					>
						<span>Chats</span>
						{chatsCollapsed ? (
							<ChevronRight className="project-sidebar__icon project-sidebar__section-chevron" />
						) : (
							<ChevronDown className="project-sidebar__icon" />
						)}
					</button>
					<div className="project-sidebar__heading-actions">
						<button className="project-sidebar__heading-button" type="button" disabled aria-label="Filter chats">
							<ListFilter className="project-sidebar__icon" />
						</button>
						<button
							className="project-sidebar__heading-button"
							type="button"
							disabled
							aria-label="New chat without project"
						>
							<SquarePen className="project-sidebar__icon" />
						</button>
					</div>
				</div>

				{chatsCollapsed ? null : (
					<div className="project-sidebar__chats project-sidebar__chats--standalone">
						{standaloneChatRows.map((child) =>
							child.kind === "empty" ? (
								<div className="project-sidebar__empty-chat" key="standalone:empty">
									{child.label}
								</div>
							) : child.kind === "show-more" ? (
								<button
									className="project-sidebar__show-more"
									key="standalone:show-more"
									type="button"
									disabled
								>
									{child.label}
								</button>
							) : (
								<button
									className={[
										"project-sidebar__chat-row",
										"project-sidebar__chat-row--standalone",
										child.selected ? "project-sidebar__chat-row--selected" : "",
										child.status === "failed" ? "project-sidebar__chat-row--failed" : "",
									]
										.filter(Boolean)
										.join(" ")}
									key={child.chatId}
									type="button"
								>
									<span className="project-sidebar__chat-label">{child.label}</span>
									{child.needsAttention ? (
										<span className="project-sidebar__attention-dot" />
									) : child.status === "failed" ? (
										<X className="project-sidebar__chat-failed-icon" />
									) : (
										<span className="project-sidebar__chat-time">{child.updatedLabel}</span>
									)}
								</button>
							),
						)}
					</div>
				)}
			</div>
		</aside>
	);
}

interface ProjectSidebarProjectProps {
	row: SidebarProjectRow;
	menu: MenuState;
	setMenu: (menu: MenuState | ((current: MenuState) => MenuState)) => void;
	closed: boolean;
	onToggleOpen: (projectId: string) => void;
	onProjectState: (result: ProjectStateViewResult) => void;
	runProjectAction: (action: () => Promise<ProjectStateViewResult>) => Promise<void>;
}

function ProjectSidebarProject({
	row,
	menu,
	setMenu,
	closed,
	onToggleOpen,
	onProjectState,
	runProjectAction,
}: ProjectSidebarProjectProps) {
	const unavailable = row.availability.status !== "available";

	const renameProject = () => {
		const displayName = window.prompt("Rename project", row.label)?.trim();

		if (!displayName || displayName === row.label) {
			setMenu(null);
			return;
		}

		void runProjectAction(() =>
			window.piDesktop.project.rename({
				projectId: row.projectId,
				displayName,
			}),
		);
	};

	const removeProject = () => {
		if (!window.confirm(`Remove ${row.label} from pi-desktop?`)) {
			setMenu(null);
			return;
		}

		void runProjectAction(() =>
			window.piDesktop.project.remove({
				projectId: row.projectId,
			}),
		);
	};

	const createProjectChat = () => {
		void runProjectAction(() =>
			window.piDesktop.chat.create({
				projectId: row.projectId,
			}),
		);
	};

	return (
		<div className="project-sidebar__project">
			<div className="project-sidebar__project-row-wrap">
				<button
					className={["project-sidebar__project-row", unavailable ? "project-sidebar__project-row--warning" : ""]
						.filter(Boolean)
						.join(" ")}
					type="button"
					title={row.path}
					aria-expanded={!closed}
					onClick={() => onToggleOpen(row.projectId)}
				>
					{closed ? (
						<Folder className="project-sidebar__icon" />
					) : (
						<FolderOpen className="project-sidebar__icon" />
					)}
					<span className="project-sidebar__project-name">{row.label}</span>
				</button>
				<button
					className="project-sidebar__project-menu-button"
					type="button"
					aria-label={`New chat in ${row.label}`}
					disabled={unavailable}
					onClick={createProjectChat}
				>
					<SquarePen className="project-sidebar__icon" />
				</button>
				<MenuAnchor>
					<button
						className="project-sidebar__project-menu-button"
						type="button"
						aria-label={`${row.label} menu`}
						aria-expanded={menu?.kind === "project" && menu.projectId === row.projectId}
						onClick={() =>
							setMenu((current) =>
								current?.kind === "project" && current.projectId === row.projectId
									? null
									: { kind: "project", projectId: row.projectId },
							)
						}
					>
						<MoreHorizontal className="project-sidebar__icon" />
					</button>
					{menu?.kind === "project" && menu.projectId === row.projectId ? (
						<ProjectMenu
							row={row}
							onPin={() =>
								runProjectAction(() =>
									window.piDesktop.project.setPinned({
										projectId: row.projectId,
										pinned: !row.project.pinned,
									}),
								)
							}
							onOpenInFinder={() =>
								runProjectAction(() =>
									window.piDesktop.project.openInFinder({
										projectId: row.projectId,
									}),
								)
							}
							onRename={renameProject}
							onRemove={removeProject}
						/>
					) : null}
				</MenuAnchor>
			</div>

			{closed ? null : (
				<div className="project-sidebar__chats">
					{row.children.map((child) =>
						child.kind === "empty" ? (
							<div className="project-sidebar__empty-chat" key={`${row.projectId}:empty`}>
								{child.label}
							</div>
						) : child.kind === "show-more" ? (
							<button
								className="project-sidebar__show-more"
								key={`${row.projectId}:show-more`}
								type="button"
								disabled
							>
								{child.label}
							</button>
						) : (
							<button
								className={[
									"project-sidebar__chat-row",
									child.selected ? "project-sidebar__chat-row--selected" : "",
									child.status === "failed" ? "project-sidebar__chat-row--failed" : "",
								]
									.filter(Boolean)
									.join(" ")}
								key={child.chatId}
								type="button"
								onClick={async () => {
									try {
										onProjectState(
											await window.piDesktop.chat.select({
												projectId: row.projectId,
												chatId: child.chatId,
											}),
										);
									} catch (error) {
										onProjectState(toProjectStateError(error));
									}
								}}
							>
								<span className="project-sidebar__chat-label">{child.label}</span>
								{child.needsAttention ? (
									<span className="project-sidebar__attention-dot" />
								) : child.status === "failed" ? (
									<X className="project-sidebar__chat-failed-icon" />
								) : (
									<span className="project-sidebar__chat-time">{child.updatedLabel}</span>
								)}
							</button>
						),
					)}
				</div>
			)}
		</div>
	);
}

interface ProjectMenuProps {
	row: SidebarProjectRow;
	onPin: () => void;
	onOpenInFinder: () => void;
	onRename: () => void;
	onRemove: () => void;
}

function ProjectsFilterMenu() {
	return (
		<MenuSurface className="project-sidebar__filter-menu">
			<MenuSectionHeading>Organize</MenuSectionHeading>
			<MenuItem inactive aria-disabled="true">
				<MenuItemIcon>
					<Folder />
				</MenuItemIcon>
				By project
				<MenuSelectionIndicator>
					<Check />
				</MenuSelectionIndicator>
			</MenuItem>
			<MenuItem inactive aria-disabled="true">
				<MenuItemIcon>
					<Folder />
				</MenuItemIcon>
				Recent projects
			</MenuItem>
			<MenuItem inactive aria-disabled="true">
				<MenuItemIcon>
					<Clock />
				</MenuItemIcon>
				Chronological list
			</MenuItem>
			<MenuItem inactive aria-disabled="true">
				<MenuItemIcon>
					<ArrowDown />
				</MenuItemIcon>
				Move down
			</MenuItem>
			<MenuSeparator />
			<MenuSectionHeading>Sort by</MenuSectionHeading>
			<MenuItem inactive aria-disabled="true">
				<MenuItemIcon>
					<CirclePlus />
				</MenuItemIcon>
				Created
			</MenuItem>
			<MenuItem inactive aria-disabled="true">
				<MenuItemIcon>
					<Clock />
				</MenuItemIcon>
				Updated
				<MenuSelectionIndicator>
					<Check />
				</MenuSelectionIndicator>
			</MenuItem>
			<MenuSeparator />
			<MenuSectionHeading>Show</MenuSectionHeading>
			<MenuItem inactive aria-disabled="true">
				<MenuItemIcon>
					<MessageCircle />
				</MenuItemIcon>
				All chats
				<MenuSelectionIndicator>
					<Check />
				</MenuSelectionIndicator>
			</MenuItem>
			<MenuItem inactive aria-disabled="true">
				<MenuItemIcon>
					<Star />
				</MenuItemIcon>
				Relevant
			</MenuItem>
		</MenuSurface>
	);
}

function ProjectMenu({ row, onPin, onOpenInFinder, onRename, onRemove }: ProjectMenuProps) {
	const projectFolderUnavailable = row.project.availability.status !== "available";

	return (
		<MenuSurface className="project-sidebar__project-menu">
			<MenuItem onClick={onPin}>
				<MenuItemIcon>
					<Pin />
				</MenuItemIcon>
				{row.project.pinned ? "Unpin project" : "Pin project"}
			</MenuItem>
			<MenuItem
				disabled={projectFolderUnavailable}
				title={projectFolderUnavailable ? "Project folder unavailable" : undefined}
				onClick={onOpenInFinder}
			>
				Open in Finder
			</MenuItem>
			<MenuItem disabled title="Coming soon">
				Create permanent worktree
			</MenuItem>
			<MenuItem onClick={onRename}>Rename project</MenuItem>
			<MenuItem disabled title="Coming soon">
				Archive chats
			</MenuItem>
			<MenuItem tone="danger" onClick={onRemove}>
				Remove
			</MenuItem>
		</MenuSurface>
	);
}
