import type { PointerEvent as ReactPointerEvent } from "react";

export const WORKSPACE_COLUMN_WIDTH_DEFAULT = 352;
export const WORKSPACE_COLUMN_WIDTH_MIN = 240;
export const WORKSPACE_COLUMN_WIDTH_MAX = 720;

export const clampWorkspaceColumnWidth = (width: number) =>
	Math.min(WORKSPACE_COLUMN_WIDTH_MAX, Math.max(WORKSPACE_COLUMN_WIDTH_MIN, width));

type UseWorkspaceColumnResizeOptions = {
	width: number;
	setWidth: (width: number) => void;
	enabled: boolean;
};

export function useWorkspaceColumnResize({ width, setWidth, enabled }: UseWorkspaceColumnResizeOptions) {
	const onResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (!enabled || event.button !== 0) {
			return;
		}

		event.preventDefault();
		const startX = event.clientX;
		const startWidth = width;

		const onMove = (moveEvent: PointerEvent) => {
			const delta = startX - moveEvent.clientX;
			setWidth(clampWorkspaceColumnWidth(startWidth + delta));
		};

		const onUp = () => {
			document.removeEventListener("pointermove", onMove);
			document.removeEventListener("pointerup", onUp);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};

		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
		document.addEventListener("pointermove", onMove);
		document.addEventListener("pointerup", onUp);
	};

	return { onResizeStart };
}
