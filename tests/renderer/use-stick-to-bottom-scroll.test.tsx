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

		const { result, rerender } = renderHook((scrollTriggerKey) => useStickToBottomScroll(scrollTriggerKey), {
			initialProps: "messages:1:msg:1:0:5:running:loaded:tools:none",
		});

		result.current.scrollRef.current = element;
		act(() => {
			rerender("messages:2:msg:2:1:12:running:loaded:tools:none");
		});

		expect(scrollTop).toBe(400);
	});

	it("scrolls to the bottom when the last message content grows during streaming", () => {
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

		const { result, rerender } = renderHook((scrollTriggerKey) => useStickToBottomScroll(scrollTriggerKey), {
			initialProps: "messages:1:assistant:1:1:3:running:loaded:tools:none",
		});

		result.current.scrollRef.current = element;
		act(() => {
			rerender("messages:1:assistant:1:1:24:running:loaded:tools:none");
		});

		expect(scrollTop).toBe(400);
	});

	it("scrolls to the bottom when tool timeline content changes while pinned", () => {
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

		const { result, rerender } = renderHook((scrollTriggerKey) => useStickToBottomScroll(scrollTriggerKey), {
			initialProps: "messages:1:assistant:1:0:24:running:loaded:tools:none",
		});

		result.current.scrollRef.current = element;
		act(() => {
			rerender("messages:1:assistant:1:0:24:running:loaded:tools:call_1:running:2026-05-14T12:00:00.000Z");
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

		const { result } = renderHook(() => useStickToBottomScroll("messages:1:msg:1:0:5:idle:loaded:tools:none"));

		result.current.scrollRef.current = element;
		act(() => {
			result.current.onScroll();
		});

		expect(result.current.showJumpToLatest).toBe(true);
	});
});
