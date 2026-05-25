import { ChevronRight, Folder, FolderOpen, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { MenuItem, MenuSurface } from "../components/menu";
import { getExplorerFileIcon } from "./file-explorer-icons";
import { useFileWorkspace } from "./file-workspace-context";

type ExplorerContextMenuKind = "background" | "directory" | "file";

type ExplorerContextMenuState = {
	kind: ExplorerContextMenuKind;
	x: number;
	y: number;
} | null;

const creationContextMenuItems = ["New File", "New Folder"];
const pathContextMenuItems = ["Copy Path", "Copy Relative Path"];
const manageContextMenuItems = ["Reveal in Finder", "Rename", "Delete"];

const contextMenuItems: Record<ExplorerContextMenuKind, string[]> = {
	background: creationContextMenuItems,
	directory: [...creationContextMenuItems, ...pathContextMenuItems, ...manageContextMenuItems],
	file: [...creationContextMenuItems, ...pathContextMenuItems, "Duplicate", ...manageContextMenuItems],
};

interface ExplorerNodeProps {
	relativePath: string;
	name: string;
	kind: "file" | "directory";
	depth: number;
	onOpenContextMenu: (kind: ExplorerContextMenuKind, event: ReactMouseEvent) => void;
}

function ExplorerNode({ relativePath, name, kind, depth, onOpenContextMenu }: ExplorerNodeProps) {
	const { state, selectExplorerItem, toggleDirectory } = useFileWorkspace();
	const expanded = kind === "directory" && state.expandedPaths.includes(relativePath);
	const selected = state.selectedPath === relativePath;
	const listing = state.directoryEntries[relativePath];
	const FileIcon = kind === "file" ? getExplorerFileIcon(name) : expanded ? FolderOpen : Folder;

	const onSelect = () => {
		selectExplorerItem(relativePath, kind);
	};

	return (
		<li className="file-explorer__node" data-depth={depth}>
			<div
				className={`file-explorer__row-wrap${selected ? " file-explorer__row-wrap--selected" : ""}`}
				style={{ "--file-explorer-depth": depth } as CSSProperties}
			>
				{kind === "directory" ? (
					<button
						type="button"
						className="file-explorer__disclosure"
						aria-label={expanded ? `Collapse ${name}` : `Expand ${name}`}
						aria-expanded={expanded}
						onContextMenu={(event) => onOpenContextMenu(kind, event)}
						onClick={(event) => {
							event.stopPropagation();
							toggleDirectory(relativePath);
						}}
					>
						<ChevronRight
							className={`file-explorer__chevron${expanded ? " file-explorer__chevron--expanded" : ""}`}
							aria-hidden
						/>
					</button>
				) : (
					<span className="file-explorer__disclosure file-explorer__disclosure--spacer" aria-hidden />
				)}
				<button
					type="button"
					className="file-explorer__row"
					aria-current={selected ? "true" : undefined}
					onContextMenu={(event) => onOpenContextMenu(kind, event)}
					onClick={onSelect}
				>
					<FileIcon
						className={`file-explorer__icon file-explorer__icon--${kind}`}
						aria-hidden
						strokeWidth={1.75}
					/>
					<span className="file-explorer__name">{name}</span>
				</button>
			</div>
			{kind === "directory" && expanded ? (
				<ul className="file-explorer__children">
					{listing?.status === "loading" ? (
						<li className="file-explorer__status" style={{ "--file-explorer-depth": depth + 1 } as CSSProperties}>
							<Loader2 className="file-explorer__status-icon" aria-hidden />
							<span>Loading…</span>
						</li>
					) : null}
					{listing?.status === "error" ? (
						<li
							className="file-explorer__status file-explorer__status--error"
							style={{ "--file-explorer-depth": depth + 1 } as CSSProperties}
						>
							{listing.message}
						</li>
					) : null}
					{listing?.status === "loaded"
						? listing.entries.map((entry) => (
								<ExplorerNode
									key={entry.relativePath}
									relativePath={entry.relativePath}
									name={entry.name}
									kind={entry.kind}
									depth={depth + 1}
									onOpenContextMenu={onOpenContextMenu}
								/>
							))
						: null}
				</ul>
			) : null}
		</li>
	);
}

export function FileExplorer() {
	const { project, state, retryLoadDirectory } = useFileWorkspace();
	const rootListing = state.directoryEntries[""];
	const [contextMenu, setContextMenu] = useState<ExplorerContextMenuState>(null);
	const contextMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!contextMenu) {
			return;
		}

		const closeContextMenu = (event: PointerEvent) => {
			if (!contextMenuRef.current?.contains(event.target as Node)) {
				setContextMenu(null);
			}
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setContextMenu(null);
			}
		};

		document.addEventListener("pointerdown", closeContextMenu);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("pointerdown", closeContextMenu);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [contextMenu]);

	if (!project) {
		return null;
	}

	const openContextMenu = (kind: ExplorerContextMenuKind, event: ReactMouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
		setContextMenu({ kind, x: event.clientX, y: event.clientY });
	};

	return (
		<section
			className="file-explorer"
			aria-label="Project files"
			data-testid="file-explorer"
			onContextMenu={(event) => openContextMenu("background", event)}
		>
			<header className="file-explorer__header">
				<h2 className="file-explorer__title" title={project.path}>
					{project.displayName}
				</h2>
			</header>
			<div className="file-explorer__tree">
				<ul className="file-explorer__tree-root">
					{rootListing?.status === "loading" ? (
						<li className="file-explorer__status file-explorer__status--root">
							<Loader2 className="file-explorer__status-icon" aria-hidden />
							<span>Loading…</span>
						</li>
					) : null}
					{rootListing?.status === "error" ? (
						<li className="file-explorer__status file-explorer__status--error file-explorer__status--root">
							{rootListing.message}
							<button type="button" className="file-explorer__retry" onClick={() => retryLoadDirectory("")}>
								Retry
							</button>
						</li>
					) : null}
					{rootListing?.status === "loaded"
						? rootListing.entries.map((entry) => (
								<ExplorerNode
									key={entry.relativePath}
									relativePath={entry.relativePath}
									name={entry.name}
									kind={entry.kind}
									depth={0}
									onOpenContextMenu={openContextMenu}
								/>
							))
						: null}
				</ul>
			</div>
			{contextMenu ? (
				<MenuSurface
					ref={contextMenuRef}
					className="file-explorer__context-menu"
					variant="context"
					aria-label="File explorer actions"
					style={{ top: contextMenu.y, right: "auto", left: contextMenu.x } as CSSProperties}
				>
					{contextMenuItems[contextMenu.kind].map((label) => (
						<MenuItem
							key={label}
							tone={label === "Delete" ? "danger" : "default"}
							onClick={() => setContextMenu(null)}
						>
							{label}
						</MenuItem>
					))}
				</MenuSurface>
			) : null}
		</section>
	);
}
