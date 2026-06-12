import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { clampSectionHeight } from "./changes-panel-layout";

const SECTION_RESIZE_STEP = 24;

export function SectionResizeHandle({
	label,
	height,
	setHeight,
	minHeight,
	maxHeight,
	growDirection,
	className,
}: {
	label: string;
	height: number;
	setHeight: (updater: (current: number) => number) => void;
	minHeight: number;
	maxHeight: number;
	growDirection: "up" | "down";
	className: string;
}) {
	const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

	useEffect(() => {
		const resize = (event: globalThis.PointerEvent) => {
			const drag = dragRef.current;
			if (!drag) {
				return;
			}
			const delta = growDirection === "up" ? drag.startY - event.clientY : event.clientY - drag.startY;
			setHeight(() => clampSectionHeight(drag.startHeight + delta, minHeight, maxHeight));
		};
		const stopResize = () => {
			dragRef.current = null;
		};
		document.addEventListener("pointermove", resize);
		document.addEventListener("pointerup", stopResize);
		return () => {
			document.removeEventListener("pointermove", resize);
			document.removeEventListener("pointerup", stopResize);
		};
	}, [growDirection, maxHeight, minHeight, setHeight]);

	const startResize = (event: PointerEvent<HTMLHRElement>) => {
		event.preventDefault();
		dragRef.current = { startY: event.clientY, startHeight: height };
		event.currentTarget.setPointerCapture?.(event.pointerId);
	};

	const resizeWithKeyboard = (event: KeyboardEvent<HTMLHRElement>) => {
		const growKey = growDirection === "up" ? "ArrowUp" : "ArrowDown";
		const shrinkKey = growDirection === "up" ? "ArrowDown" : "ArrowUp";

		switch (event.key) {
			case growKey:
				event.preventDefault();
				setHeight((current) => clampSectionHeight(current + SECTION_RESIZE_STEP, minHeight, maxHeight));
				break;
			case shrinkKey:
				event.preventDefault();
				setHeight((current) => clampSectionHeight(current - SECTION_RESIZE_STEP, minHeight, maxHeight));
				break;
			case "Home":
				event.preventDefault();
				setHeight(() => minHeight);
				break;
			case "End":
				event.preventDefault();
				setHeight(() => maxHeight);
				break;
		}
	};

	return (
		<hr
			aria-label={label}
			aria-orientation="horizontal"
			aria-valuemax={maxHeight}
			aria-valuemin={minHeight}
			aria-valuenow={height}
			className={className}
			onKeyDown={resizeWithKeyboard}
			onPointerDown={startResize}
			tabIndex={0}
		/>
	);
}
