import { Bot, Folder, MoreHorizontal, Pin, Plus, Search, Workflow, Wrench, X } from "lucide-react";
import { useState } from "react";
import type { ProjectStateViewResult } from "../../shared/ipc";
import type { ProjectStateView } from "../../shared/project-state";
import { createProjectSidebarRows, type SidebarProjectRow } from "../projects/project-view-model";

interface ProjectSidebarProps {
	state: ProjectStateView;
	versionLabel: string;
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
	| null;

const toProjectStateError = (error: unknown): ProjectStateViewResult => ({
	ok: false,
	error: {
		code: "renderer:project-action-failed",
		message: error instanceof Error ? error.message : "Project action failed.",
	},
});

export function ProjectSidebar({ state, versionLabel, onProjectState }: ProjectSidebarProps) {
	const [menu, setMenu] = useState<MenuState>(null);
	const rows = createProjectSidebarRows(state);

	const runProjectAction = async (action: () => Promise<ProjectStateViewResult>) => {
		setMenu(null);

		try {
			onProjectState(await action());
		} catch (error) {
			onProjectState(toProjectStateError(error));
		}
	};

	const selectProject = (projectId: string) =>
		runProjectAction(() =>
			window.piDesktop.project.select({
				projectId,
			}),
		);

	return (
		<aside className="project-sidebar" aria-label="Project navigation">
			<div className="project-sidebar__header">
				<div className="project-sidebar__brand-mark">pi</div>
				<div className="project-sidebar__brand-copy">
					<div className="project-sidebar__brand-name">pi-desktop</div>
					<div className="project-sidebar__version">{versionLabel}</div>
				</div>
			</div>

			<div className="project-sidebar__top-actions">
				<button className="project-sidebar__action" type="button" disabled>
					<Bot className="project-sidebar__icon" />
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
				<span>Projects</span>
				<div className="project-sidebar__menu-anchor">
					<button
						className="project-sidebar__icon-button"
						type="button"
						aria-label="Add project"
						aria-expanded={menu?.kind === "add"}
						onClick={() => setMenu((current) => (current?.kind === "add" ? null : { kind: "add" }))}
					>
						<Plus className="project-sidebar__icon" />
					</button>
					{menu?.kind === "add" ? (
						<div className="project-sidebar__menu">
							<button
								className="project-sidebar__menu-item"
								type="button"
								onClick={() => runProjectAction(() => window.piDesktop.project.createFromScratch())}
							>
								Start from scratch
							</button>
							<button
								className="project-sidebar__menu-item"
								type="button"
								onClick={() => runProjectAction(() => window.piDesktop.project.addExistingFolder())}
							>
								Use an existing folder
							</button>
						</div>
					) : null}
				</div>
			</div>

			<div className="project-sidebar__projects">
				{rows.map((row) => (
					<ProjectSidebarProject
						key={row.projectId}
						row={row}
						menu={menu}
						setMenu={setMenu}
						onSelectProject={selectProject}
						onProjectState={onProjectState}
						runProjectAction={runProjectAction}
					/>
				))}
			</div>
		</aside>
	);
}

interface ProjectSidebarProjectProps {
	row: SidebarProjectRow;
	menu: MenuState;
	setMenu: (menu: MenuState | ((current: MenuState) => MenuState)) => void;
	onSelectProject: (projectId: string) => void;
	onProjectState: (result: ProjectStateViewResult) => void;
	runProjectAction: (action: () => Promise<ProjectStateViewResult>) => Promise<void>;
}

function ProjectSidebarProject({
	row,
	menu,
	setMenu,
	onSelectProject,
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

	return (
		<div className="project-sidebar__project">
			<div className="project-sidebar__project-row-wrap">
				<button
					className={[
						"project-sidebar__project-row",
						row.selected ? "project-sidebar__project-row--selected" : "",
						unavailable ? "project-sidebar__project-row--warning" : "",
					]
						.filter(Boolean)
						.join(" ")}
					type="button"
					title={row.path}
					onClick={() => onSelectProject(row.projectId)}
				>
					<Folder className="project-sidebar__icon" />
					<span className="project-sidebar__project-name">{row.label}</span>
				</button>
				<div className="project-sidebar__menu-anchor">
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
				</div>
			</div>

			<div className="project-sidebar__chats">
				{row.children.map((child) =>
					child.kind === "empty" ? (
						<div className="project-sidebar__empty-chat" key={`${row.projectId}:empty`}>
							{child.label}
						</div>
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
							{child.status === "running" ? <span className="project-sidebar__chat-status">Running</span> : null}
							{child.status === "failed" ? <X className="project-sidebar__chat-failed-icon" /> : null}
						</button>
					),
				)}
			</div>
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

function ProjectMenu({ row, onPin, onOpenInFinder, onRename, onRemove }: ProjectMenuProps) {
	return (
		<div className="project-sidebar__menu project-sidebar__project-menu">
			<button className="project-sidebar__menu-item" type="button" onClick={onPin}>
				<Pin className="project-sidebar__menu-icon" />
				{row.project.pinned ? "Unpin project" : "Pin project"}
			</button>
			<button className="project-sidebar__menu-item" type="button" onClick={onOpenInFinder}>
				Open in Finder
			</button>
			<button className="project-sidebar__menu-item" type="button" disabled title="Coming soon">
				Create permanent worktree
			</button>
			<button className="project-sidebar__menu-item" type="button" onClick={onRename}>
				Rename project
			</button>
			<button className="project-sidebar__menu-item" type="button" disabled title="Coming soon">
				Archive chats
			</button>
			<button
				className="project-sidebar__menu-item project-sidebar__menu-item--danger"
				type="button"
				onClick={onRemove}
			>
				Remove
			</button>
		</div>
	);
}
