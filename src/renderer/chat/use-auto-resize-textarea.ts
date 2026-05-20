import { useCallback, useLayoutEffect, useRef } from "react";

function readMaxHeightPx(element: HTMLTextAreaElement): number | null {
	const maxHeight = Number.parseFloat(getComputedStyle(element).maxHeight);
	return Number.isFinite(maxHeight) ? maxHeight : null;
}

export function useAutoResizeTextarea(value: string) {
	const ref = useRef<HTMLTextAreaElement>(null);

	const syncHeight = useCallback(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		element.style.height = "auto";
		const maxHeight = readMaxHeightPx(element);
		const nextHeight = maxHeight === null ? element.scrollHeight : Math.min(element.scrollHeight, maxHeight);
		element.style.height = `${nextHeight}px`;
	}, []);

	useLayoutEffect(() => {
		syncHeight();
	}, [value, syncHeight]);

	return { ref, syncHeight };
}
