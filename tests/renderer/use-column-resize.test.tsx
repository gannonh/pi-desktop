// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useColumnResize } from "../../src/renderer/shell/use-column-resize";

describe("useColumnResize", () => {
	afterEach(() => {
		document.body.style.cursor = "";
		document.body.style.userSelect = "";
	});

	it("ignores resize when disabled", () => {
		const setWidth = vi.fn();
		const { result } = renderHook(() =>
			useColumnResize({
				width: 200,
				setWidth,
				enabled: false,
				edge: "end",
				clamp: (value) => value,
			}),
		);

		const event = {
			button: 0,
			clientX: 100,
			preventDefault: vi.fn(),
		} as unknown as React.PointerEvent<HTMLDivElement>;

		act(() => {
			result.current.onResizeStart(event);
		});

		expect(event.preventDefault).not.toHaveBeenCalled();
		expect(setWidth).not.toHaveBeenCalled();
	});

	it("ignores non-primary pointer buttons", () => {
		const setWidth = vi.fn();
		const { result } = renderHook(() =>
			useColumnResize({
				width: 200,
				setWidth,
				enabled: true,
				edge: "end",
				clamp: (value) => value,
			}),
		);

		const event = {
			button: 1,
			clientX: 100,
			preventDefault: vi.fn(),
		} as unknown as React.PointerEvent<HTMLDivElement>;

		act(() => {
			result.current.onResizeStart(event);
		});

		expect(event.preventDefault).not.toHaveBeenCalled();
		expect(setWidth).not.toHaveBeenCalled();
	});

	it("resizes from the end edge while dragging", () => {
		const setWidth = vi.fn((value: number) => value);
		const clamp = vi.fn((value: number) => value);
		const { result } = renderHook(() =>
			useColumnResize({
				width: 200,
				setWidth,
				enabled: true,
				edge: "end",
				clamp,
			}),
		);

		const event = {
			button: 0,
			clientX: 100,
			preventDefault: vi.fn(),
		} as unknown as React.PointerEvent<HTMLDivElement>;

		act(() => {
			result.current.onResizeStart(event);
		});

		expect(document.body.style.cursor).toBe("col-resize");
		expect(document.body.style.userSelect).toBe("none");

		act(() => {
			document.dispatchEvent(new PointerEvent("pointermove", { clientX: 130 }));
		});

		expect(clamp).toHaveBeenCalledWith(230);
		expect(setWidth).toHaveBeenCalledWith(230);

		act(() => {
			document.dispatchEvent(new PointerEvent("pointerup"));
		});

		expect(document.body.style.cursor).toBe("");
		expect(document.body.style.userSelect).toBe("");
	});

	it("resizes from the start edge while dragging", () => {
		const setWidth = vi.fn();
		const clamp = vi.fn((value: number) => value);
		const { result } = renderHook(() =>
			useColumnResize({
				width: 200,
				setWidth,
				enabled: true,
				edge: "start",
				clamp,
			}),
		);

		const event = {
			button: 0,
			clientX: 200,
			preventDefault: vi.fn(),
		} as unknown as React.PointerEvent<HTMLDivElement>;

		act(() => {
			result.current.onResizeStart(event);
		});

		act(() => {
			document.dispatchEvent(new PointerEvent("pointermove", { clientX: 170 }));
		});

		expect(clamp).toHaveBeenCalledWith(230);
		expect(setWidth).toHaveBeenCalledWith(230);
	});

	it("cleans up listeners on pointercancel", () => {
		const setWidth = vi.fn();
		const { result } = renderHook(() =>
			useColumnResize({
				width: 200,
				setWidth,
				enabled: true,
				edge: "end",
				clamp: (value) => value,
			}),
		);

		const event = {
			button: 0,
			clientX: 100,
			preventDefault: vi.fn(),
		} as unknown as React.PointerEvent<HTMLDivElement>;

		act(() => {
			result.current.onResizeStart(event);
		});

		act(() => {
			document.dispatchEvent(new PointerEvent("pointercancel"));
		});

		expect(document.body.style.cursor).toBe("");
		expect(document.body.style.userSelect).toBe("");

		act(() => {
			document.dispatchEvent(new PointerEvent("pointermove", { clientX: 200 }));
		});

		expect(setWidth).not.toHaveBeenCalled();
	});
});
