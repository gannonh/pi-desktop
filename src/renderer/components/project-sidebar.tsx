import {
	Archive,
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	Check,
	ChevronDown,
	ChevronRight,
	CirclePlus,
	Clock,
	Copy,
	ExternalLink,
	Folder,
	FolderOpen,
	FolderPlus,
	GitFork,
	ListFilter,
	MessageCircle,
	Minimize2,
	MoreHorizontal,
	PanelLeftClose,
	PanelLeftOpen,
	Pencil,
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
	type ChatFilter,
	type SidebarChatRow,
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
			kind: "chat";
			projectId: string;
			chatId: string;
	  }
	| {
			kind: "projects-filter";
	  }
	| {
			kind: "chats-filter";
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
	const [chatFilter, setChatFilter] = useState<ChatFilter>("all");
	const [expandedProjectChatIds, setExpandedProjectChatIds] = useState<Set<string>>(() => new Set());
	const [standaloneExpanded, setStandaloneExpanded] = useState(false);
	const rows = createProjectSidebarRows(state, undefined, {
		chatFilter,
		expandedProjectIds: expandedProjectChatIds,
	});
	const standaloneChatRows = createStandaloneChatSidebarRows(state, undefined, {
		chatFilter,
		expandStandaloneChats: standaloneExpanded,
	});
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

	const toggleAllProjectsOpen = () => {
		setMenu(null);
		setProjectsCollapsed(false);
		setClosedProjectIds((current) => {
			const projectIds = rows.map((row) => row.projectId);
			const hasOpenProject = projectIds.some((projectId) => !current.has(projectId));
			return hasOpenProject ? new Set(projectIds) : new Set();
		});
	};

	const hasOpenProject = rows.some((row) => !closedProjectIds.has(row.projectId));
	const changeChatFilter = (filter: ChatFilter) => {
		setChatFilter(filter);
		setMenu(null);
	};
	const expandProjectChats = (projectId: string) => {
		setExpandedProjectChatIds((current) => {
			const next = new Set(current);
			next.add(projectId);
			return next;
		});
	};
	const selectStandaloneChat = (chatId: string) => {
		void runProjectAction(() =>
			window.piDesktop.chat.selectStandalone({
				chatId,
			}),
		);
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
							aria-label={hasOpenProject ? "Collapse all projects" : "Expand all projects"}
							onClick={toggleAllProjectsOpen}
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
							{menu?.kind === "projects-filter" ? (
								<ProjectsFilterMenu chatFilter={chatFilter} onChatFilterChange={changeChatFilter} />
							) : null}
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
								onExpandChats={expandProjectChats}
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
						<MenuAnchor>
							<button
								className="project-sidebar__heading-button"
								type="button"
								aria-label="Filter chats"
								aria-expanded={menu?.kind === "chats-filter"}
								onClick={() =>
									setMenu((current) => (current?.kind === "chats-filter" ? null : { kind: "chats-filter" }))
								}
							>
								<ListFilter className="project-sidebar__icon" />
							</button>
							{menu?.kind === "chats-filter" ? (
								<ChatsFilterMenu chatFilter={chatFilter} onChatFilterChange={changeChatFilter} />
							) : null}
						</MenuAnchor>
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
									onClick={() => setStandaloneExpanded(true)}
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
									onClick={() => selectStandaloneChat(child.chatId)}
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
	onExpandChats: (projectId: string) => void;
	runProjectAction: (action: () => Promise<ProjectStateViewResult>) => Promise<void>;
}

function ProjectSidebarProject({
	row,
	menu,
	setMenu,
	closed,
	onToggleOpen,
	onExpandChats,
	runProjectAction,
}: ProjectSidebarProjectProps) {
	const unavailable = row.availability.status !== "available";

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

	const renameProject = () => {
		const displayName = window.prompt("Rename project", row.label)?.trim();
		if (!displayName) {
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
					onClick={() => {
						onToggleOpen(row.projectId);
						void runProjectAction(() =>
							window.piDesktop.project.select({
								projectId: row.projectId,
							}),
						);
					}}
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
							onLocateFolder={() =>
								runProjectAction(() =>
									window.piDesktop.project.locateFolder({
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

			<div
				className={["project-sidebar__chats-shell", closed ? "project-sidebar__chats-shell--closed" : ""]
					.filter(Boolean)
					.join(" ")}
				aria-hidden={closed}
			>
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
								tabIndex={closed ? -1 : undefined}
								onClick={() => onExpandChats(row.projectId)}
							>
								{child.label}
							</button>
						) : (
							<ProjectChatRow
								key={child.chatId}
								child={child}
								closed={closed}
								menu={menu}
								projectId={row.projectId}
								sessionPath={row.project.chats.find((chat) => chat.id === child.chatId)?.sessionPath ?? null}
								setMenu={setMenu}
								runProjectAction={runProjectAction}
							/>
						),
					)}
				</div>
			</div>
		</div>
	);
}

type SidebarConcreteChatRow = Extract<SidebarChatRow, { kind: "chat" }>;

interface ProjectChatRowProps {
	child: SidebarConcreteChatRow;
	closed: boolean;
	menu: MenuState;
	projectId: string;
	sessionPath: string | null;
	setMenu: (menu: MenuState | ((current: MenuState) => MenuState)) => void;
	runProjectAction: (action: () => Promise<ProjectStateViewResult>) => Promise<void>;
}

function ProjectChatRow({
	child,
	closed,
	menu,
	projectId,
	sessionPath,
	setMenu,
	runProjectAction,
}: ProjectChatRowProps) {
	const chatMenuOpen = menu?.kind === "chat" && menu.projectId === projectId && menu.chatId === child.chatId;
	const chatActionsDisabled = sessionPath === null;
	const chatActionTitle = chatActionsDisabled ? "Chat does not have a Pi session file yet" : undefined;

	const renameChat = () => {
		const title = window.prompt("Rename chat", child.label)?.trim();
		if (!title) {
			setMenu(null);
			return;
		}

		void runProjectAction(() =>
			window.piDesktop.chat.rename({
				projectId,
				chatId: child.chatId,
				title,
			}),
		);
	};

	return (
		<div className="project-sidebar__chat-row-wrap">
			<button
				className={[
					"project-sidebar__chat-row",
					"project-sidebar__chat-row--with-menu",
					child.selected ? "project-sidebar__chat-row--selected" : "",
					child.status === "failed" ? "project-sidebar__chat-row--failed" : "",
				]
					.filter(Boolean)
					.join(" ")}
				type="button"
				tabIndex={closed ? -1 : undefined}
				onClick={() =>
					void runProjectAction(() =>
						window.piDesktop.chat.select({
							projectId,
							chatId: child.chatId,
						}),
					)
				}
			>
				<span className="project-sidebar__chat-label">{child.label}</span>
				{child.needsAttention ? (
					<span className="project-sidebar__attention-dot" />
				) : child.status === "failed" ? (
					<X className="project-sidebar__chat-failed-icon" />
				) : (
					<span className="project-sidebar__chat-trailing">
						<span className="project-sidebar__chat-time">{child.updatedLabel}</span>
						<Archive className="project-sidebar__chat-archive-icon" aria-hidden="true" />
					</span>
				)}
			</button>
			<MenuAnchor className="project-sidebar__chat-menu-anchor">
				<button
					className="project-sidebar__chat-menu-button"
					type="button"
					aria-label={`${child.label} menu`}
					aria-expanded={chatMenuOpen}
					tabIndex={closed ? -1 : undefined}
					onClick={() =>
						setMenu((current) =>
							current?.kind === "chat" && current.projectId === projectId && current.chatId === child.chatId
								? null
								: { kind: "chat", projectId, chatId: child.chatId },
						)
					}
				>
					<MoreHorizontal className="project-sidebar__icon" />
				</button>
				{chatMenuOpen ? (
					<ChatMenu
						disabled={chatActionsDisabled}
						disabledTitle={chatActionTitle}
						onRename={renameChat}
						onFork={() =>
							runProjectAction(() =>
								window.piDesktop.chat.fork({
									projectId,
									chatId: child.chatId,
								}),
							)
						}
						onClone={() =>
							runProjectAction(() =>
								window.piDesktop.chat.clone({
									projectId,
									chatId: child.chatId,
								}),
							)
						}
					/>
				) : null}
			</MenuAnchor>
		</div>
	);
}

interface ChatMenuProps {
	disabled: boolean;
	disabledTitle?: string;
	onRename: () => void;
	onFork: () => void;
	onClone: () => void;
}

function ChatMenu({ disabled, disabledTitle, onRename, onFork, onClone }: ChatMenuProps) {
	return (
		<MenuSurface className="project-sidebar__chat-menu" variant="context">
			<MenuItem disabled={disabled} title={disabledTitle} onClick={onRename}>
				<MenuItemIcon>
					<Pencil />
				</MenuItemIcon>
				Rename chat
			</MenuItem>
			<MenuItem disabled={disabled} title={disabledTitle} onClick={onFork}>
				<MenuItemIcon>
					<GitFork />
				</MenuItemIcon>
				Fork chat
			</MenuItem>
			<MenuItem disabled={disabled} title={disabledTitle} onClick={onClone}>
				<MenuItemIcon>
					<Copy />
				</MenuItemIcon>
				Clone current branch
			</MenuItem>
		</MenuSurface>
	);
}

interface ProjectMenuProps {
	row: SidebarProjectRow;
	onPin: () => void;
	onOpenInFinder: () => void;
	onLocateFolder: () => void;
	onRename: () => void;
	onRemove: () => void;
}

interface ProjectSidebarFilterMenuProps {
	chatFilter: ChatFilter;
	onChatFilterChange: (filter: ChatFilter) => void;
}

function ProjectsFilterMenu(props: ProjectSidebarFilterMenuProps) {
	return <SidebarFilterMenu moveDirection="down" {...props} />;
}

function ChatsFilterMenu(props: ProjectSidebarFilterMenuProps) {
	return <SidebarFilterMenu moveDirection="up" {...props} />;
}

interface SidebarFilterMenuProps extends ProjectSidebarFilterMenuProps {
	moveDirection: "up" | "down";
}

function SidebarFilterMenu({ moveDirection, chatFilter, onChatFilterChange }: SidebarFilterMenuProps) {
	const MoveIcon = moveDirection === "up" ? ArrowUp : ArrowDown;
	const chatFilterItems: Array<{ filter: ChatFilter; label: string; icon: typeof MessageCircle }> = [
		{ filter: "all", label: "All chats", icon: MessageCircle },
		{ filter: "attention", label: "Needs attention", icon: Star },
		{ filter: "failed", label: "Failed", icon: X },
		{ filter: "running", label: "Running", icon: Workflow },
	];

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
					<MoveIcon />
				</MenuItemIcon>
				Move {moveDirection}
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
			{chatFilterItems.map((item) => {
				const FilterIcon = item.icon;
				const selected = chatFilter === item.filter;

				return (
					<MenuItem
						aria-checked={selected}
						key={item.filter}
						onClick={() => onChatFilterChange(item.filter)}
						role="menuitemradio"
					>
						<MenuItemIcon>
							<FilterIcon />
						</MenuItemIcon>
						{item.label}
						{selected ? (
							<MenuSelectionIndicator>
								<Check />
							</MenuSelectionIndicator>
						) : null}
					</MenuItem>
				);
			})}
		</MenuSurface>
	);
}

function ProjectMenu({ row, onPin, onOpenInFinder, onLocateFolder, onRename, onRemove }: ProjectMenuProps) {
	const projectFolderUnavailable = row.project.availability.status !== "available";
	const projectFolderMissing = row.project.availability.status === "missing";

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
				<MenuItemIcon>
					<Folder />
				</MenuItemIcon>
				Open in Finder
			</MenuItem>
			<MenuItem disabled title="Coming soon">
				<MenuItemIcon>
					<ExternalLink />
				</MenuItemIcon>
				Create permanent worktree
			</MenuItem>
			<MenuItem
				disabled={!projectFolderMissing}
				title={projectFolderMissing ? undefined : "Project folder is available"}
				onClick={onLocateFolder}
			>
				<MenuItemIcon>
					<FolderOpen />
				</MenuItemIcon>
				Locate folder
			</MenuItem>
			<MenuItem onClick={onRename}>
				<MenuItemIcon>
					<Pencil />
				</MenuItemIcon>
				Rename project
			</MenuItem>
			<MenuItem disabled title="Coming soon">
				<MenuItemIcon>
					<Archive />
				</MenuItemIcon>
				Archive chats
			</MenuItem>
			<MenuItem onClick={onRemove}>
				<MenuItemIcon>
					<X />
				</MenuItemIcon>
				Remove
			</MenuItem>
		</MenuSurface>
	);
}
