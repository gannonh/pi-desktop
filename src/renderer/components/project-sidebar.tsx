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
import { useId, useState, type ReactNode } from "react";
import type { ProjectStateViewResult } from "../../shared/ipc";
import type { ProjectStateView } from "../../shared/project-state";
import {
	createProjectSidebarRows,
	createStandaloneChatSidebarRows,
	toggleAllUnpinnedProjectClosedIds,
	type ChatFilter,
	type SidebarChatList,
	type SidebarConcreteChatRow,
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
import { SidebarInlineRenameField } from "./sidebar-inline-rename";

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
	const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
	const [projectsCollapsed, setProjectsCollapsed] = useState(false);
	const [chatsCollapsed, setChatsCollapsed] = useState(false);
	const [chatFilter, setChatFilter] = useState<ChatFilter>("all");
	const [expandedProjectChatIds, setExpandedProjectChatIds] = useState<Set<string>>(() => new Set());
	const [standaloneExpanded, setStandaloneExpanded] = useState(false);
	const projectsFilterMenuId = useId();
	const addProjectMenuId = useId();
	const chatsFilterMenuId = useId();
	const rows = createProjectSidebarRows(state, undefined, {
		chatFilter,
		expandedProjectIds: expandedProjectChatIds,
	});
	const pinnedRows = rows.filter((row) => row.project.pinned);
	const unpinnedRows = rows.filter((row) => !row.project.pinned);
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
		setClosedProjectIds((current) =>
			toggleAllUnpinnedProjectClosedIds(
				current,
				unpinnedRows.map((row) => row.projectId),
			),
		);
	};

	const hasOpenProject = unpinnedRows.some((row) => !closedProjectIds.has(row.projectId));
	const changeChatFilter = (filter: ChatFilter) => {
		setChatFilter(filter);
		setMenu(null);
	};
	const toggleProjectChats = (projectId: string) => {
		setExpandedProjectChatIds((current) => {
			const next = new Set(current);
			if (next.has(projectId)) {
				next.delete(projectId);
			} else {
				next.add(projectId);
			}
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
				<div className="project-sidebar__scroll">
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

					{pinnedRows.length > 0 ? (
						<>
							<div className="project-sidebar__section-heading">
								<button
									className="project-sidebar__section-title"
									type="button"
									aria-expanded={!pinnedCollapsed}
									onClick={() => setPinnedCollapsed((current) => !current)}
								>
									<span>Pinned</span>
									{pinnedCollapsed ? (
										<ChevronRight className="project-sidebar__icon project-sidebar__section-chevron" />
									) : (
										<ChevronDown className="project-sidebar__icon" />
									)}
								</button>
							</div>
							{pinnedCollapsed ? null : (
								<ProjectRows
									rows={pinnedRows}
									menu={menu}
									setMenu={setMenu}
									closedProjectIds={closedProjectIds}
									expandedProjectChatIds={expandedProjectChatIds}
									onToggleOpen={toggleProjectOpen}
									onToggleChats={toggleProjectChats}
									runProjectAction={runProjectAction}
								/>
							)}
						</>
					) : null}

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
									aria-controls={projectsFilterMenuId}
									aria-expanded={menu?.kind === "projects-filter"}
									aria-haspopup="menu"
									onClick={() =>
										setMenu((current) =>
											current?.kind === "projects-filter" ? null : { kind: "projects-filter" },
										)
									}
								>
									<ListFilter className="project-sidebar__icon" />
								</button>
								{menu?.kind === "projects-filter" ? (
									<ProjectsFilterMenu
										id={projectsFilterMenuId}
										chatFilter={chatFilter}
										onChatFilterChange={changeChatFilter}
									/>
								) : null}
							</MenuAnchor>
							<MenuAnchor>
								<button
									className="project-sidebar__heading-button"
									type="button"
									aria-label="Add project"
									aria-controls={addProjectMenuId}
									aria-expanded={menu?.kind === "add"}
									aria-haspopup="menu"
									onClick={() => setMenu((current) => (current?.kind === "add" ? null : { kind: "add" }))}
								>
									<FolderPlus className="project-sidebar__icon" />
								</button>
								{menu?.kind === "add" ? (
									<MenuSurface className="project-sidebar__add-menu" id={addProjectMenuId}>
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
						<ProjectRows
							rows={unpinnedRows}
							menu={menu}
							setMenu={setMenu}
							closedProjectIds={closedProjectIds}
							expandedProjectChatIds={expandedProjectChatIds}
							onToggleOpen={toggleProjectOpen}
							onToggleChats={toggleProjectChats}
							runProjectAction={runProjectAction}
						/>
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
									aria-controls={chatsFilterMenuId}
									aria-expanded={menu?.kind === "chats-filter"}
									aria-haspopup="menu"
									onClick={() =>
										setMenu((current) => (current?.kind === "chats-filter" ? null : { kind: "chats-filter" }))
									}
								>
									<ListFilter className="project-sidebar__icon" />
								</button>
								{menu?.kind === "chats-filter" ? (
									<ChatsFilterMenu
										id={chatsFilterMenuId}
										chatFilter={chatFilter}
										onChatFilterChange={changeChatFilter}
									/>
								) : null}
							</MenuAnchor>
							<button
								className="project-sidebar__heading-button"
								type="button"
								aria-label="New quick-start chat"
								onClick={() => {
									void runProjectAction(() => window.piDesktop.chat.createStandalone({}));
								}}
							>
								<SquarePen className="project-sidebar__icon" />
							</button>
						</div>
					</div>

					{chatsCollapsed ? null : (
						<ProjectSidebarChatList
							chatList={standaloneChatRows}
							expanded={standaloneExpanded}
							listClassName="project-sidebar__chats project-sidebar__chats--standalone"
							onToggleExpanded={() => setStandaloneExpanded((current) => !current)}
							renderChatRow={(child) => (
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
							)}
						/>
					)}
				</div>
			</div>
		</aside>
	);
}

interface ProjectRowsProps {
	rows: SidebarProjectRow[];
	menu: MenuState;
	setMenu: (menu: MenuState | ((current: MenuState) => MenuState)) => void;
	closedProjectIds: ReadonlySet<string>;
	expandedProjectChatIds: ReadonlySet<string>;
	onToggleOpen: (projectId: string) => void;
	onToggleChats: (projectId: string) => void;
	runProjectAction: (action: () => Promise<ProjectStateViewResult>) => Promise<void>;
}

function ProjectRows({
	rows,
	menu,
	setMenu,
	closedProjectIds,
	expandedProjectChatIds,
	onToggleOpen,
	onToggleChats,
	runProjectAction,
}: ProjectRowsProps) {
	const renderProject = (row: SidebarProjectRow) => (
		<ProjectSidebarProject
			key={row.projectId}
			row={row}
			menu={menu}
			setMenu={setMenu}
			closed={closedProjectIds.has(row.projectId)}
			onToggleOpen={onToggleOpen}
			onToggleChats={onToggleChats}
			chatsExpanded={expandedProjectChatIds.has(row.projectId)}
			runProjectAction={runProjectAction}
		/>
	);

	return <div className="project-sidebar__projects">{rows.map(renderProject)}</div>;
}

interface ProjectSidebarChatListProps {
	chatList: SidebarChatList;
	expanded: boolean;
	listClassName?: string;
	inertWhenHidden?: boolean;
	onToggleExpanded: () => void;
	renderChatRow: (child: SidebarConcreteChatRow) => ReactNode;
}

function ProjectSidebarChatList({
	chatList,
	expanded,
	listClassName,
	inertWhenHidden = false,
	onToggleExpanded,
	renderChatRow,
}: ProjectSidebarChatListProps) {
	const emptyRow = chatList.primary.find((row) => row.kind === "empty");

	if (emptyRow) {
		return (
			<div className={listClassName ?? "project-sidebar__chats"}>
				<div className="project-sidebar__empty-chat">{emptyRow.label}</div>
			</div>
		);
	}

	return (
		<div className={listClassName ?? "project-sidebar__chats"}>
			{chatList.primary
				.filter((row): row is SidebarConcreteChatRow => row.kind === "chat")
				.map((child) => renderChatRow(child))}
			{chatList.toggle ? (
				<>
					<div
						className={[
							"project-sidebar__chats-overflow-shell",
							expanded ? "" : "project-sidebar__chats-overflow-shell--collapsed",
						]
							.filter(Boolean)
							.join(" ")}
						aria-hidden={!expanded}
						inert={!expanded || inertWhenHidden ? true : undefined}
					>
						<div className="project-sidebar__chats-overflow">
							{chatList.overflow
								.filter((row): row is SidebarConcreteChatRow => row.kind === "chat")
								.map((child) => renderChatRow(child))}
						</div>
					</div>
					<button
						className="project-sidebar__show-more"
						type="button"
						tabIndex={inertWhenHidden ? -1 : undefined}
						aria-expanded={expanded}
						onClick={onToggleExpanded}
					>
						{chatList.toggle.label}
					</button>
				</>
			) : null}
		</div>
	);
}

interface ProjectSidebarProjectProps {
	row: SidebarProjectRow;
	menu: MenuState;
	setMenu: (menu: MenuState | ((current: MenuState) => MenuState)) => void;
	closed: boolean;
	onToggleOpen: (projectId: string) => void;
	onToggleChats: (projectId: string) => void;
	chatsExpanded: boolean;
	runProjectAction: (action: () => Promise<ProjectStateViewResult>) => Promise<void>;
}

function ProjectSidebarProject({
	row,
	menu,
	setMenu,
	closed,
	onToggleOpen,
	onToggleChats,
	chatsExpanded,
	runProjectAction,
}: ProjectSidebarProjectProps) {
	const projectMenuId = useId();
	const [isRenaming, setIsRenaming] = useState(false);
	const sessionPathByChatId = new Map(row.project.chats.map((chat) => [chat.id, chat.sessionPath]));
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

	const startRenameProject = () => {
		setMenu(null);
		setIsRenaming(true);
	};

	const cancelRenameProject = () => {
		setIsRenaming(false);
	};

	const commitRenameProject = (displayName: string) => {
		setIsRenaming(false);
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
					className="project-sidebar__project-disclosure"
					type="button"
					aria-label={closed ? `Expand ${row.label}` : `Collapse ${row.label}`}
					aria-expanded={!closed}
					onClick={() => onToggleOpen(row.projectId)}
				>
					{closed ? (
						<Folder className="project-sidebar__icon" />
					) : (
						<FolderOpen className="project-sidebar__icon" />
					)}
				</button>
				{isRenaming ? (
					<div
						className={[
							"project-sidebar__project-row",
							"project-sidebar__project-row--renaming",
							unavailable ? "project-sidebar__project-row--warning" : "",
						]
							.filter(Boolean)
							.join(" ")}
						title={row.path}
					>
						<SidebarInlineRenameField
							className="project-sidebar__inline-rename"
							value={row.label}
							label={`Rename ${row.label}`}
							onCancel={cancelRenameProject}
							onCommit={commitRenameProject}
						/>
					</div>
				) : (
					<button
						className={[
							"project-sidebar__project-row",
							unavailable ? "project-sidebar__project-row--warning" : "",
						]
							.filter(Boolean)
							.join(" ")}
						type="button"
						title={row.path}
						onClick={() => {
							void runProjectAction(() =>
								window.piDesktop.project.select({
									projectId: row.projectId,
								}),
							);
						}}
					>
						<span className="project-sidebar__project-name">{row.label}</span>
					</button>
				)}
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
						aria-controls={projectMenuId}
						aria-expanded={menu?.kind === "project" && menu.projectId === row.projectId}
						aria-haspopup="menu"
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
							id={projectMenuId}
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
							onRename={startRenameProject}
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
				<ProjectSidebarChatList
					chatList={row.chatList}
					expanded={chatsExpanded}
					inertWhenHidden={closed}
					onToggleExpanded={() => onToggleChats(row.projectId)}
					renderChatRow={(child) => (
						<ProjectChatRow
							key={child.chatId}
							child={child}
							closed={closed}
							menu={menu}
							projectId={row.projectId}
							sessionPath={sessionPathByChatId.get(child.chatId) ?? null}
							setMenu={setMenu}
							runProjectAction={runProjectAction}
						/>
					)}
				/>
			</div>
		</div>
	);
}

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
	const chatMenuId = useId();
	const [isRenaming, setIsRenaming] = useState(false);
	const chatMenuOpen = menu?.kind === "chat" && menu.projectId === projectId && menu.chatId === child.chatId;
	const sessionActionsDisabled = sessionPath === null;
	const sessionActionTitle = sessionActionsDisabled ? "Chat does not have a Pi session file yet" : undefined;

	const startRenameChat = () => {
		setMenu(null);
		setIsRenaming(true);
	};

	const cancelRenameChat = () => {
		setIsRenaming(false);
	};

	const commitRenameChat = (title: string) => {
		setIsRenaming(false);
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
			{isRenaming ? (
				<div
					className={[
						"project-sidebar__chat-row",
						"project-sidebar__chat-row--renaming",
						child.selected ? "project-sidebar__chat-row--selected" : "",
						child.status === "failed" ? "project-sidebar__chat-row--failed" : "",
					]
						.filter(Boolean)
						.join(" ")}
				>
					<SidebarInlineRenameField
						className="project-sidebar__inline-rename"
						value={child.label}
						label={`Rename ${child.label}`}
						onCancel={cancelRenameChat}
						onCommit={commitRenameChat}
					/>
				</div>
			) : (
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
			)}
			<MenuAnchor className="project-sidebar__chat-menu-anchor">
				<button
					className="project-sidebar__chat-menu-button"
					type="button"
					aria-label={`${child.label} menu`}
					aria-controls={chatMenuId}
					aria-expanded={chatMenuOpen}
					aria-haspopup="menu"
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
						id={chatMenuId}
						sessionActionsDisabled={sessionActionsDisabled}
						disabledTitle={sessionActionTitle}
						onRename={startRenameChat}
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
	id: string;
	sessionActionsDisabled: boolean;
	disabledTitle?: string;
	onRename: () => void;
	onFork: () => void;
	onClone: () => void;
}

function ChatMenu({ id, sessionActionsDisabled, disabledTitle, onRename, onFork, onClone }: ChatMenuProps) {
	return (
		<MenuSurface className="project-sidebar__chat-menu" id={id} variant="context">
			<MenuItem onClick={onRename}>
				<MenuItemIcon>
					<Pencil />
				</MenuItemIcon>
				Rename chat
			</MenuItem>
			<MenuItem disabled={sessionActionsDisabled} title={disabledTitle} onClick={onFork}>
				<MenuItemIcon>
					<GitFork />
				</MenuItemIcon>
				Fork chat
			</MenuItem>
			<MenuItem disabled={sessionActionsDisabled} title={disabledTitle} onClick={onClone}>
				<MenuItemIcon>
					<Copy />
				</MenuItemIcon>
				Clone current branch
			</MenuItem>
		</MenuSurface>
	);
}

interface ProjectMenuProps {
	id: string;
	row: SidebarProjectRow;
	onPin: () => void;
	onOpenInFinder: () => void;
	onLocateFolder: () => void;
	onRename: () => void;
	onRemove: () => void;
}

interface ProjectSidebarFilterMenuProps {
	id: string;
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

function SidebarFilterMenu({ id, moveDirection, chatFilter, onChatFilterChange }: SidebarFilterMenuProps) {
	const MoveIcon = moveDirection === "up" ? ArrowUp : ArrowDown;
	const chatFilterItems: Array<{ filter: ChatFilter; label: string; icon: typeof MessageCircle }> = [
		{ filter: "all", label: "All chats", icon: MessageCircle },
		{ filter: "attention", label: "Needs attention", icon: Star },
		{ filter: "failed", label: "Failed", icon: X },
		{ filter: "running", label: "Running", icon: Workflow },
	];

	return (
		<MenuSurface className="project-sidebar__filter-menu" id={id}>
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

function ProjectMenu({ id, row, onPin, onOpenInFinder, onLocateFolder, onRename, onRemove }: ProjectMenuProps) {
	const projectFolderUnavailable = row.project.availability.status !== "available";
	const projectFolderMissing = row.project.availability.status === "missing";

	return (
		<MenuSurface className="project-sidebar__project-menu" id={id}>
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
