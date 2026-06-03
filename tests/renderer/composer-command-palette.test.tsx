// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Composer } from "../../src/renderer/components/composer";
import {
	META_CHANGELOG_DEFERRAL_MESSAGE,
	META_HOTKEYS_DEFERRAL_MESSAGE,
	META_QUIT_OUT_OF_SCOPE_MESSAGE,
	META_RELOAD_DEFERRAL_MESSAGE,
} from "../../src/renderer/chat/meta-command-palette-entries";
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
		expect(textarea.selectionStart).toBe("Config command selected".length);
	});

	it("re-evaluates slash triggers after clicking to move the caret", () => {
		render(<Composer context={context} />);
		const textarea = screen.getByLabelText("Message Pi") as HTMLTextAreaElement;

		fireEvent.change(textarea, { target: { value: "/co hello" } });
		expect(screen.queryByRole("listbox", { name: "Suggestions" })).toBeNull();

		textarea.setSelectionRange(3, 3);
		fireEvent.click(textarea);

		expect(screen.getByRole("option", { name: /Config command/ })).toBeTruthy();
	});

	it("shows a visible deferral when selecting /hotkeys from the Meta/Skills section", () => {
		render(<Composer context={context} />);
		const textarea = screen.getByLabelText("Message Pi");

		fireEvent.change(textarea, { target: { value: "/hot" } });
		fireEvent.click(screen.getByRole("option", { name: /\/hotkeys/ }));

		expect(textarea.value).toBe("/hot");
		expect(screen.getByRole("status").textContent).toBe(META_HOTKEYS_DEFERRAL_MESSAGE);
	});

	it("shows a visible deferral when selecting /changelog from the Meta/Skills section", () => {
		render(<Composer context={context} />);
		const textarea = screen.getByLabelText("Message Pi");

		fireEvent.change(textarea, { target: { value: "/change" } });
		fireEvent.click(screen.getByRole("option", { name: /\/changelog/ }));

		expect(textarea.value).toBe("/change");
		expect(screen.getByRole("status").textContent).toBe(META_CHANGELOG_DEFERRAL_MESSAGE);
	});

	it("shows reload and quit rationale when selecting meta palette entries", () => {
		render(<Composer context={context} />);
		const textarea = screen.getByLabelText("Message Pi");

		fireEvent.change(textarea, { target: { value: "/rel" } });
		fireEvent.click(screen.getByRole("option", { name: /\/reload/ }));
		expect(screen.getByRole("status").textContent).toBe(META_RELOAD_DEFERRAL_MESSAGE);

		fireEvent.change(textarea, { target: { value: "/qu" } });
		fireEvent.click(screen.getByRole("option", { name: /\/quit/ }));
		expect(screen.getByRole("status").textContent).toBe(META_QUIT_OUT_OF_SCOPE_MESSAGE);
		expect(textarea.value).toBe("/qu");
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
