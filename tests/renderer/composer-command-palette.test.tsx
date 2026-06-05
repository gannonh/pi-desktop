// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG_PALETTE_DEFERRAL_MESSAGES } from "../../src/renderer/chat/config-command-palette-entries";
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

const runtimeCommands = [
	{
		id: "runtime-command:review",
		title: "review",
		slashCommand: "review",
		source: "prompt-template" as const,
		description: "Review a path",
		argumentHint: "[path]",
		scope: "project" as const,
		provenance: { path: "/tmp/review.md", source: "project", origin: "top-level" as const },
		availability: { state: "available" as const },
	},
	{
		id: "runtime-command:skill:missing",
		title: "skill:missing",
		slashCommand: "skill:missing",
		source: "skill" as const,
		description: "Missing skill",
		scope: "user" as const,
		provenance: { path: "/tmp/missing/SKILL.md", source: "user", origin: "top-level" as const },
		availability: { state: "unavailable" as const, reason: "Skill metadata is unavailable." },
	},
];

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
		expect(screen.getByRole("option", { name: /Change model/ })).toBeTruthy();
	});

	it("renders dynamic runtime commands in slash search with source labels and argument hints", () => {
		render(<Composer context={context} commandPaletteActions={{ runtimeCommands }} />);

		fireEvent.change(screen.getByLabelText("Message Pi"), { target: { value: "/rev" } });

		expect(screen.getByRole("option", { name: /\/review/ })).toBeTruthy();
		expect(screen.getByText("Review a path Arguments: [path]")).toBeTruthy();
		expect(screen.getByText("Prompt template")).toBeTruthy();
		expect(screen.getByText("project · project · /tmp/review.md")).toBeTruthy();
	});

	it("shows unavailable skill guidance without inserting an invokable command", () => {
		render(<Composer context={context} commandPaletteActions={{ runtimeCommands }} />);
		const textarea = screen.getByLabelText("Message Pi") as HTMLTextAreaElement;

		fireEvent.change(textarea, { target: { value: "/missing" } });
		fireEvent.click(screen.getByRole("option", { name: /\/skill:missing/ }));

		expect(textarea.value).toBe("/missing");
		expect(screen.getByRole("status").textContent).toBe("Skill metadata is unavailable.");
	});

	it("selects the change model entry without submitting raw slash text", () => {
		const onSubmit = vi.fn();
		render(<Composer context={context} onSubmit={onSubmit} />);
		const textarea = screen.getByLabelText("Message Pi") as HTMLTextAreaElement;

		fireEvent.change(textarea, { target: { value: "/" } });
		fireEvent.keyDown(screen.getByRole("listbox", { name: "Suggestions" }), { key: "ArrowDown" });
		fireEvent.keyDown(screen.getByRole("listbox", { name: "Suggestions" }), { key: "Enter" });

		expect(onSubmit).not.toHaveBeenCalled();
		expect(textarea.value).toBe("");
		expect(screen.getByRole("button", { name: context.modelLabel }).getAttribute("aria-expanded")).toBe("true");
	});

	it("shows a visible deferral when selecting settings from the palette", () => {
		render(<Composer context={context} />);
		const textarea = screen.getByLabelText("Message Pi") as HTMLTextAreaElement;

		fireEvent.change(textarea, { target: { value: "/set" } });
		fireEvent.click(screen.getByRole("option", { name: /Settings/ }));

		expect(textarea.value).toBe("/set");
		expect(screen.getByRole("status").textContent).toContain(CONFIG_PALETTE_DEFERRAL_MESSAGES.settings);
	});

	it("clears palette deferral notices when the composer text changes", () => {
		render(<Composer context={context} />);
		const textarea = screen.getByLabelText("Message Pi") as HTMLTextAreaElement;

		fireEvent.change(textarea, { target: { value: "/set" } });
		fireEvent.click(screen.getByRole("option", { name: /Settings/ }));
		expect(screen.getByRole("status")).toBeTruthy();

		fireEvent.change(textarea, { target: { value: "/set " } });
		expect(screen.queryByRole("status")).toBeNull();
	});

	it("re-evaluates slash triggers after clicking to move the caret", () => {
		render(<Composer context={context} />);
		const textarea = screen.getByLabelText("Message Pi") as HTMLTextAreaElement;

		fireEvent.change(textarea, { target: { value: "/co hello" } });
		expect(screen.queryByRole("listbox", { name: "Suggestions" })).toBeNull();

		textarea.setSelectionRange(3, 3);
		fireEvent.click(textarea);

		expect(screen.getByRole("option", { name: /Change model/ })).toBeTruthy();
	});

	it.each([
		{ query: "/hot", option: /\/hotkeys/, expectedMessage: META_HOTKEYS_DEFERRAL_MESSAGE },
		{ query: "/change", option: /\/changelog/, expectedMessage: META_CHANGELOG_DEFERRAL_MESSAGE },
		{ query: "/rel", option: /\/reload/, expectedMessage: META_RELOAD_DEFERRAL_MESSAGE },
		{ query: "/qu", option: /\/quit/, expectedMessage: META_QUIT_OUT_OF_SCOPE_MESSAGE },
	])("shows meta notice when selecting $option", ({ query, option, expectedMessage }) => {
		render(<Composer context={context} />);
		const textarea = screen.getByLabelText("Message Pi") as HTMLTextAreaElement;

		fireEvent.change(textarea, { target: { value: query } });
		fireEvent.click(screen.getByRole("option", { name: option }));

		expect(textarea.value).toBe(query);
		expect(screen.getByRole("status").textContent).toBe(expectedMessage);
	});

	it("clears a meta notice when selecting a stub palette entry", () => {
		render(<Composer context={context} />);
		const textarea = screen.getByLabelText("Message Pi") as HTMLTextAreaElement;

		fireEvent.change(textarea, { target: { value: "/hot" } });
		fireEvent.click(screen.getByRole("option", { name: /\/hotkeys/ }));
		expect(screen.getByRole("status").textContent).toBe(META_HOTKEYS_DEFERRAL_MESSAGE);

		fireEvent.change(textarea, { target: { value: "/" } });
		fireEvent.click(screen.getByRole("option", { name: /Session command/ }));

		expect(screen.queryByRole("status")).toBeNull();
		expect(textarea.value).toBe("Session command selected");
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
