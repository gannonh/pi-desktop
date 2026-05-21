import type { RightPanelKind } from "./right-panel-types";

export type RightPanelAddMenuItem = {
	kind: RightPanelKind;
	label: string;
};

export const rightPanelAddMenuItems: RightPanelAddMenuItem[] = [
	{ kind: "diffs", label: "Changes" },
	{ kind: "terminal", label: "Terminal" },
	{ kind: "browser", label: "Browser" },
	{ kind: "markdown", label: "File" },
	{ kind: "markdown", label: "Markdown" },
];

interface RightPanelAddMenuProps {
	open: boolean;
	onToggle: () => void;
	onAdd: (kind: RightPanelKind) => void;
}

export function RightPanelAddMenu({ open, onToggle, onAdd }: RightPanelAddMenuProps) {
	return (
		<div className="right-panel__add-menu">
			<button
				type="button"
				className="right-panel__add-button"
				aria-expanded={open}
				aria-haspopup="menu"
				onClick={onToggle}
			>
				Add panel
			</button>
			{open ? (
				<div className="right-panel__add-menu-list" role="menu" aria-label="Add panel">
					{rightPanelAddMenuItems.map((item) => (
						<button
							key={`${item.kind}:${item.label}`}
							type="button"
							className="right-panel__add-menu-item"
							role="menuitem"
							onClick={() => onAdd(item.kind)}
						>
							{item.label}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
