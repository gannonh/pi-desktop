// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Composer } from "../../src/renderer/components/composer";
import { createComposerContext } from "./composer-fixtures";

const context = createComposerContext({
	projectSelectorLabel: "pi-desktop",
	modelLabel: "5.5 High",
	thinkingLabel: "High",
	projectId: "project:/tmp/pi-desktop",
	showProjectMenu: true,
});

describe("Composer command palette integration", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"ResizeObserver",
			class ResizeObserver {
				observe() {}
				unobserve() {}
				disconnect() {}
			},
		);
		Element.prototype.scrollIntoView = vi.fn();
	});

	it.each(["center", "bottom"] as const)("opens slash palette in %s layout", (layout) => {
		render(<Composer context={context} layout={layout} />);

		fireEvent.change(screen.getByLabelText("Message Pi"), { target: { value: "/co" } });

		expect(screen.getByRole("group", { name: "Config" })).toBeTruthy();
		expect(screen.getByRole("option", { name: /Config command/ })).toBeTruthy();
	});

	it("selects a stub entry into the draft without submitting raw slash text", () => {
		const onSubmit = vi.fn();
		render(<Composer context={context} onSubmit={onSubmit} />);
		const textarea = screen.getByLabelText("Message Pi") as HTMLTextAreaElement;

		fireEvent.change(textarea, { target: { value: "/" } });
		fireEvent.keyDown(screen.getByRole("listbox", { name: "Suggestions" }), { key: "ArrowDown" });
		fireEvent.keyDown(screen.getByRole("listbox", { name: "Suggestions" }), { key: "Enter" });

		expect(onSubmit).not.toHaveBeenCalled();
		expect(textarea.value).toBe("Config command selected");
	});

	it("preserves Enter submit behavior when the palette is closed", async () => {
		const onSubmit = vi.fn(() => true);
		render(<Composer context={context} onSubmit={onSubmit} />);
		const textarea = screen.getByLabelText("Message Pi");

		fireEvent.change(textarea, { target: { value: "hello" } });
		fireEvent.keyDown(textarea, { key: "Enter" });

		await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("hello", "prompt", undefined));
	});
});
