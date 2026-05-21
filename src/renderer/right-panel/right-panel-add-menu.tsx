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
	{ id: "markdown-file", kind: "markdown", label: "File" },
	{ id: "markdown-doc", kind: "markdown", label: "Markdown" },
];

interface RightPanelAddMenuProps {
	onAdd: (item: RightPanelAddMenuItem) => void;
}

export function RightPanelAddMenu({ onAdd }: RightPanelAddMenuProps) {
	const { isNarrowLayout } = useRightPanel();
	const [open, setOpen] = useState(false);
	const menuId = useId();
	const anchorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) {
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
					className={[
						"workspace-add-menu__surface",
						isNarrowLayout ? "workspace-add-menu__surface--above" : "",
					]
						.filter(Boolean)
						.join(" ")}
					aria-label="Add panel"
				>
					{rightPanelAddMenuItems.map((item) => (
						<MenuItem
							key={item.id}
							onClick={() => {
								onAdd(item);
								setOpen(false);
							}}
						>
							{item.label}
						</MenuItem>
					))}
				</MenuSurface>
			) : null}
		</MenuAnchor>
	);
}
