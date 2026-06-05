// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CommandPaletteEntry } from "../../src/renderer/chat/command-palette-registry";
import { useComposerCommandPalette } from "../../src/renderer/chat/use-composer-command-palette";
import { createMockSessionCommandPaletteActions } from "./session-command-palette-fixtures";

interface HarnessProps {
	initialText?: string;
	focusTextarea?: () => void;
	setTextareaSelection?: (selectionStart: number) => void;
}

function CommandPaletteHookHarness({
	initialText = "/",
	focusTextarea = () => {},
	setTextareaSelection = () => {},
}: HarnessProps) {
	const [text, setText] = useState(initialText);
	const [selectionStart, setSelectionStart] = useState(initialText.length);
	const [lastHandled, setLastHandled] = useState("unset");
	const palette = useComposerCommandPalette({
		text,
		selectionStart,
		setText,
		setSelectionStart,
		setTextareaSelection,
		focusTextarea,
	});
	const handledEntry: CommandPaletteEntry = {
		id: "session.handled",
		sectionId: "session",
		icon: "SquarePen",
		title: "Handled command",
		description: "Covers handled palette actions",
		handler: () => ({ type: "handled" }),
	};

	const handleKey = (key: string) => {
		setLastHandled(String(palette.handleNavigationKey(key)));
	};

	return (
		<div>
			<output data-testid="open">{String(palette.open)}</output>
			<output data-testid="active-entry">{palette.activeEntryId}</output>
			<output data-testid="text">{text}</output>
			<output data-testid="last-handled">{lastHandled}</output>
			<button type="button" onClick={() => handleKey("ArrowDown")}>
				next
			</button>
			<button type="button" onClick={() => handleKey("ArrowUp")}>
				previous
			</button>
			<button type="button" onClick={() => handleKey("Enter")}>
				select
			</button>
			<button type="button" onClick={() => handleKey("Escape")}>
				dismiss
			</button>
			<button type="button" onClick={() => handleKey("Tab")}>
				unsupported
			</button>
			<button type="button" onClick={() => palette.selectEntry(handledEntry)}>
				handled action
			</button>
			<button type="button" onClick={() => palette.noteTextChanged("/co", 3)}>
				change text
			</button>
		</div>
	);
}

function SessionActionsSwapHarness() {
	const [text, setText] = useState("/");
	const [selectionStart, setSelectionStart] = useState(1);
	const [sessionActions, setSessionActions] = useState<
		ReturnType<typeof createMockSessionCommandPaletteActions> | undefined
	>();
	const palette = useComposerCommandPalette({
		text,
		selectionStart,
		setText,
		setSelectionStart,
		setTextareaSelection: () => {},
		focusTextarea: () => {},
		commandPaletteActions: sessionActions ? { session: sessionActions } : undefined,
	});
	const sessionEntryIds =
		palette.groups.find((group) => group.section.id === "session")?.entries.map((entry) => entry.id).join(",") ??
		"";

	return (
		<div>
			<output data-testid="session-entry-ids">{sessionEntryIds}</output>
			<button type="button" onClick={() => setSessionActions(createMockSessionCommandPaletteActions())}>
				wire session actions
			</button>
		</div>
	);
}

describe("useComposerCommandPalette", () => {
	it("rebuilds session entries when session actions are supplied after mount", async () => {
		render(<SessionActionsSwapHarness />);

		await waitFor(() => expect(screen.getByTestId("session-entry-ids").textContent).toBe("session.stub"));

		fireEvent.click(screen.getByRole("button", { name: "wire session actions" }));

		await waitFor(() => expect(screen.getByTestId("session-entry-ids").textContent).toContain("session.new"));
		expect(screen.getByTestId("session-entry-ids").textContent).not.toContain("session.stub");
	});

	it("handles command navigation actions from the composer", async () => {
		const focusTextarea = vi.fn();
		const setTextareaSelection = vi.fn();
		render(<CommandPaletteHookHarness focusTextarea={focusTextarea} setTextareaSelection={setTextareaSelection} />);

		await waitFor(() => expect(screen.getByTestId("active-entry").textContent).toBe("session.stub"));

		fireEvent.click(screen.getByRole("button", { name: "next" }));
		expect(screen.getByTestId("last-handled").textContent).toBe("true");
		expect(screen.getByTestId("active-entry").textContent).toBe("config.model");

		fireEvent.click(screen.getByRole("button", { name: "previous" }));
		expect(screen.getByTestId("active-entry").textContent).toBe("session.stub");

		fireEvent.click(screen.getByRole("button", { name: "unsupported" }));
		expect(screen.getByTestId("last-handled").textContent).toBe("false");

		fireEvent.click(screen.getByRole("button", { name: "select" }));
		expect(screen.getByTestId("text").textContent).toBe("Session command selected");
		expect(setTextareaSelection).toHaveBeenCalledWith("Session command selected".length);
		expect(focusTextarea).toHaveBeenCalled();
	});

	it("does not swallow Enter when the palette has no visible entries", async () => {
		render(<CommandPaletteHookHarness initialText="/nomatch" />);

		await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("true"));
		expect(screen.getByTestId("active-entry").textContent).toBe("");

		fireEvent.click(screen.getByRole("button", { name: "select" }));
		expect(screen.getByTestId("last-handled").textContent).toBe("false");
		expect(screen.getByTestId("text").textContent).toBe("/nomatch");

		fireEvent.click(screen.getByRole("button", { name: "dismiss" }));
		expect(screen.getByTestId("last-handled").textContent).toBe("true");
		expect(screen.getByTestId("open").textContent).toBe("false");
	});

	it("surfaces notice actions without inserting prompt text", () => {
		const focusTextarea = vi.fn();
		const onShowPaletteNotice = vi.fn();
		const noticeEntry: CommandPaletteEntry = {
			id: "meta.hotkeys",
			sectionId: "meta",
			icon: "CircleHelp",
			title: "/hotkeys",
			description: "Show keyboard shortcuts",
			handler: () => ({ type: "notice", message: "Shortcuts deferred" }),
		};

		function NoticeHarness() {
			const [text, setText] = useState("/");
			const [selectionStart, setSelectionStart] = useState(1);
			const palette = useComposerCommandPalette({
				text,
				selectionStart,
				setText,
				setSelectionStart,
				setTextareaSelection: () => {},
				focusTextarea,
				onShowPaletteNotice,
			});

			return (
				<div>
					<output data-testid="notice-text">{text}</output>
					<button type="button" onClick={() => palette.selectEntry(noticeEntry)}>
						select notice
					</button>
				</div>
			);
		}

		render(<NoticeHarness />);
		fireEvent.click(screen.getByRole("button", { name: "select notice" }));

		expect(onShowPaletteNotice).toHaveBeenCalledWith("Shortcuts deferred");
		expect(screen.getByTestId("notice-text").textContent).toBe("/");
		expect(focusTextarea).toHaveBeenCalled();
	});

	it("clears palette notices when selecting handled or insertPrompt actions", () => {
		const onClearPaletteNotice = vi.fn();
		const handledEntry: CommandPaletteEntry = {
			id: "config.model",
			sectionId: "config",
			icon: "Settings",
			title: "Model",
			description: "Open model picker",
			handler: () => ({ type: "handled" }),
		};
		const insertEntry: CommandPaletteEntry = {
			id: "session.stub",
			sectionId: "session",
			icon: "SquarePen",
			title: "Session",
			description: "Insert session prompt",
			handler: () => ({ type: "insertPrompt", prompt: "Session command selected" }),
		};

		function ClearNoticeHarness() {
			const [text, setText] = useState("/");
			const [selectionStart, setSelectionStart] = useState(1);
			const palette = useComposerCommandPalette({
				text,
				selectionStart,
				setText,
				setSelectionStart,
				setTextareaSelection: () => {},
				focusTextarea: () => {},
				onClearPaletteNotice,
			});

			return (
				<div>
					<button type="button" onClick={() => palette.selectEntry(handledEntry)}>
						select handled
					</button>
					<button type="button" onClick={() => palette.selectEntry(insertEntry)}>
						select insert
					</button>
				</div>
			);
		}

		render(<ClearNoticeHarness />);
		fireEvent.click(screen.getByRole("button", { name: "select handled" }));
		fireEvent.click(screen.getByRole("button", { name: "select insert" }));

		expect(onClearPaletteNotice).toHaveBeenCalledTimes(2);
	});

	it("clears handled command text and closed palette navigation without inserting prompt text", async () => {
		const focusTextarea = vi.fn();
		render(<CommandPaletteHookHarness initialText="hello" focusTextarea={focusTextarea} />);

		expect(screen.getByTestId("open").textContent).toBe("false");
		fireEvent.click(screen.getByRole("button", { name: "select" }));
		expect(screen.getByTestId("last-handled").textContent).toBe("false");

		fireEvent.click(screen.getByRole("button", { name: "change text" }));
		await waitFor(() => expect(screen.getByTestId("open").textContent).toBe("true"));

		fireEvent.click(screen.getByRole("button", { name: "dismiss" }));
		expect(screen.getByTestId("last-handled").textContent).toBe("true");
		expect(screen.getByTestId("open").textContent).toBe("false");

		fireEvent.click(screen.getByRole("button", { name: "handled action" }));
		expect(screen.getByTestId("text").textContent).toBe("");
		expect(focusTextarea).toHaveBeenCalled();
	});
});
