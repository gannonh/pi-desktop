// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAutoResizeTextarea } from "../../src/renderer/chat/use-auto-resize-textarea";

describe("useAutoResizeTextarea", () => {
	it("grows the textarea to fit content up to max-height", () => {
		const element = document.createElement("textarea");
		element.style.maxHeight = "128px";
		Object.defineProperty(element, "scrollHeight", {
			get: () => 96,
			configurable: true,
		});

		const { result, rerender } = renderHook((props) => useAutoResizeTextarea(props.value), {
			initialProps: { value: "short" },
		});

		result.current.ref.current = element;
		act(() => {
			rerender({ value: "a longer prompt that should expand the composer textarea" });
		});

		expect(element.style.height).toBe("96px");
	});

	it("caps height at the computed max-height", () => {
		const element = document.createElement("textarea");
		element.style.maxHeight = "80px";
		Object.defineProperty(element, "scrollHeight", {
			get: () => 240,
			configurable: true,
		});

		const { result, rerender } = renderHook((props) => useAutoResizeTextarea(props.value), {
			initialProps: { value: "" },
		});

		result.current.ref.current = element;
		act(() => {
			rerender({ value: "very long pasted content" });
		});

		expect(element.style.height).toBe("80px");
	});
});
