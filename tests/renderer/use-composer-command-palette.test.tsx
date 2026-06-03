// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CommandPaletteEntry } from "../../src/renderer/chat/command-palette-registry";
import { useComposerCommandPalette } from "../../src/renderer/chat/use-composer-command-palette";

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
			<button type="button" onClick={() => handleKey("ArrowDown")}>next</button>
			<button type="button" onClick={() => handleKey("ArrowUp")}>previous</button>
			<button type="button" onClick={() => handleKey("Enter")}>select</button>
			<button type="button" onClick={() => handleKey("Escape")}>dismiss</button>
			<button type="button" onClick={() => handleKey("Tab")}>unsupported</button>
			<button type="button" onClick={() => palette.selectEntry(handledEntry)}>handled action</button>
			<button type="button" onClick={() => palette.noteTextChanged("/co", 3)}>change text</button>
		</div>
	);
}

describe("useComposerCommandPalette", () => {
	it("handles command navigation actions from the composer", async () => {
		const focusTextarea = vi.fn();
		const setTextareaSelection = vi.fn();
		render(<CommandPaletteHookHarness focusTextarea={focusTextarea} setTextareaSelection={setTextareaSelection} />);

		await waitFor(() => expect(screen.getByTestId("active-entry").textContent).toBe("session.stub"));

		fireEvent.click(screen.getByRole("button", { name: "next" }));
		expect(screen.getByTestId("last-handled").textContent).toBe("true");
		expect(screen.getByTestId("active-entry").textContent).toBe("config.stub");

		fireEvent.click(screen.getByRole("button", { name: "previous" }));
		expect(screen.getByTestId("active-entry").textContent).toBe("session.stub");

		fireEvent.click(screen.getByRole("button", { name: "unsupported" }));
		expect(screen.getByTestId("last-handled").textContent).toBe("false");

		fireEvent.click(screen.getByRole("button", { name: "select" }));
		expect(screen.getByTestId("text").textContent).toBe("Session command selected");
		expect(setTextareaSelection).toHaveBeenCalledWith("Session command selected".length);
		expect(focusTextarea).toHaveBeenCalled();
	});

	it("dismisses handled actions and closed palette navigation without inserting prompt text", async () => {
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
		expect(screen.getByTestId("text").textContent).toBe("/co");
		expect(focusTextarea).toHaveBeenCalled();
	});
});
