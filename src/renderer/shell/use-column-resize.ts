import type { PointerEvent as ReactPointerEvent } from "react";

export type ColumnResizeEdge = "start" | "end";

type UseColumnResizeOptions = {
	width: number;
	setWidth: (width: number) => void;
	enabled: boolean;
	edge: ColumnResizeEdge;
	clamp: (width: number) => number;
};

export function useColumnResize({ width, setWidth, enabled, edge, clamp }: UseColumnResizeOptions) {
	const onResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (!enabled || event.button !== 0) {
			return;
		}

		event.preventDefault();
		const startX = event.clientX;
		const startWidth = width;

		const onMove = (moveEvent: PointerEvent) => {
			const delta = edge === "start" ? startX - moveEvent.clientX : moveEvent.clientX - startX;
			setWidth(clamp(startWidth + delta));
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
