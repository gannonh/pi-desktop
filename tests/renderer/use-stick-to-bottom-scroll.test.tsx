// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { isNearScrollBottom, useStickToBottomScroll } from "../../src/renderer/chat/use-stick-to-bottom-scroll";

describe("isNearScrollBottom", () => {
	it("returns true when the viewport is within the pin threshold", () => {
		expect(isNearScrollBottom(152, 400, 200)).toBe(true);
		expect(isNearScrollBottom(100, 400, 200)).toBe(false);
	});
});

describe("useStickToBottomScroll", () => {
	it("scrolls to the bottom when pinned and messages change", () => {
		const element = document.createElement("div");
		Object.defineProperty(element, "scrollHeight", { value: 400, configurable: true });
		Object.defineProperty(element, "clientHeight", { value: 200, configurable: true });
		let scrollTop = 0;
		Object.defineProperty(element, "scrollTop", {
			get: () => scrollTop,
			set: (value: number) => {
				scrollTop = value;
			},
			configurable: true,
		});

		const { result, rerender } = renderHook((props) => useStickToBottomScroll(props), {
			initialProps: {
				messageCount: 1,
				streamingMessageCount: 0,
				sessionStatus: "running",
				hydrationStatus: "loaded",
			},
		});

		result.current.scrollRef.current = element;
		act(() => {
			rerender({
				messageCount: 2,
				streamingMessageCount: 1,
				sessionStatus: "running",
				hydrationStatus: "loaded",
			});
		});

		expect(scrollTop).toBe(400);
	});

	it("shows jump to latest after scrolling away from the bottom", () => {
		const element = document.createElement("div");
		Object.defineProperty(element, "scrollHeight", { value: 400, configurable: true });
		Object.defineProperty(element, "clientHeight", { value: 200, configurable: true });
		Object.defineProperty(element, "scrollTop", {
			value: 0,
			writable: true,
			configurable: true,
		});

		const { result } = renderHook(() =>
			useStickToBottomScroll({
				messageCount: 1,
				streamingMessageCount: 0,
				sessionStatus: "idle",
				hydrationStatus: "loaded",
			}),
		);

		result.current.scrollRef.current = element;
		act(() => {
			result.current.onScroll();
		});

		expect(result.current.showJumpToLatest).toBe(true);
	});
});
