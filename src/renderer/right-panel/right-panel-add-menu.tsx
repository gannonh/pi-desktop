import { File, GitBranch, Globe, Layers, Terminal } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { MenuAnchor, MenuItem, MenuSurface } from "../components/menu";
import { useRightPanel } from "./right-panel-context";
import type { RightPanelKind } from "./right-panel-types";

export type RightPanelAddMenuItem = {
	id: string;
	kind: RightPanelKind;
	label: string;
};

export const rightPanelAddMenuItems: RightPanelAddMenuItem[] = [
	{ id: "diffs", kind: "diffs", label: "Changes" },
	{ id: "terminal", kind: "terminal", label: "Terminal" },
	{ id: "browser", kind: "browser", label: "Browser" },
	{ id: "files", kind: "files", label: "File" },
];

const menuIcons: Record<RightPanelKind, typeof GitBranch> = {
	diffs: GitBranch,
	terminal: Terminal,
	browser: Globe,
	files: File,
};

interface RightPanelAddMenuProps {
	onAdd: (item: RightPanelAddMenuItem) => void;
}

export function RightPanelAddMenu({ onAdd }: RightPanelAddMenuProps) {
	const { isNarrowLayout } = useRightPanel();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const menuId = useId();
	const anchorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) {
			setQuery("");
			return;
		}

		const handlePointerDown = (event: PointerEvent) => {
			if (!anchorRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [open]);

	const filteredItems = rightPanelAddMenuItems.filter((item) =>
		item.label.toLowerCase().includes(query.trim().toLowerCase()),
	);

	return (
		<MenuAnchor ref={anchorRef} className="workspace-add-menu">
			<button
				type="button"
				className="workspace-add-menu__button"
				aria-expanded={open}
				aria-haspopup="menu"
				aria-controls={menuId}
				aria-label="Add panel"
				onClick={() => setOpen((current) => !current)}
			>
				+
			</button>
			{open ? (
				<MenuSurface
					id={menuId}
					className={["workspace-add-menu__surface", isNarrowLayout ? "workspace-add-menu__surface--above" : ""]
						.filter(Boolean)
						.join(" ")}
					aria-label="Add panel"
				>
					<label className="workspace-add-menu__search">
						<span className="workspace-add-menu__search-label">Filter panels</span>
						<input
							type="search"
							className="workspace-add-menu__search-input"
							placeholder="Open any file, URL, …"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
						/>
					</label>
					{filteredItems.map((item) => {
						const Icon = menuIcons[item.kind];
						return (
							<MenuItem
								key={item.id}
								onClick={() => {
									onAdd(item);
									setOpen(false);
								}}
							>
								<Icon className="workspace-add-menu__item-icon" aria-hidden strokeWidth={1.75} />
								<span>{item.label}</span>
							</MenuItem>
						);
					})}
					<MenuItem inactive>
						<Layers className="workspace-add-menu__item-icon" aria-hidden strokeWidth={1.75} />
						<span>Canvas</span>
					</MenuItem>
				</MenuSurface>
			) : null}
		</MenuAnchor>
	);
}
