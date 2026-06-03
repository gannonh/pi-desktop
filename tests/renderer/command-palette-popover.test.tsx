// @vitest-environment jsdom

import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandPalettePopover } from "../../src/renderer/components/command-palette-popover";
import {
	createCommandPaletteRegistry,
	getDefaultCommandPaletteEntries,
} from "../../src/renderer/chat/command-palette-registry";

const groups = createCommandPaletteRegistry(getDefaultCommandPaletteEntries()).getEntriesBySection();

describe("CommandPalettePopover", () => {
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

	it("renders grouped stub sections with highlighted title matches", () => {
		render(
			<CommandPalettePopover
				open
				query="command"
				groups={groups}
				activeEntryId="session.stub"
				onActiveEntryIdChange={() => {}}
				onSelectEntry={() => {}}
				onDismiss={() => {}}
			/>,
		);

		expect(screen.getByRole("group", { name: "Session" })).toBeTruthy();
		expect(screen.getByRole("group", { name: "Config" })).toBeTruthy();
		expect(screen.getByRole("group", { name: "Output" })).toBeTruthy();
		expect(screen.getByRole("group", { name: "Meta/Skills" })).toBeTruthy();
		expect(screen.getAllByText("command", { selector: "mark" }).length).toBeGreaterThan(0);
	});

	it("selects entries with keyboard-only navigation", () => {
		const onSelectEntry = vi.fn();
		const onActiveEntryIdChange = vi.fn();

		function ControlledPopover() {
			const [activeEntryId, setActiveEntryId] = useState("session.stub");
			const handleActiveEntryIdChange = (entryId: string) => {
				onActiveEntryIdChange(entryId);
				setActiveEntryId(entryId);
			};

			return (
				<CommandPalettePopover
					open
					query=""
					groups={groups}
					activeEntryId={activeEntryId}
					onActiveEntryIdChange={handleActiveEntryIdChange}
					onSelectEntry={onSelectEntry}
					onDismiss={() => {}}
				/>
			);
		}

		render(<ControlledPopover />);

		const palette = screen.getByRole("listbox", { name: "Suggestions" });
		fireEvent.keyDown(palette, { key: "ArrowDown" });
		expect(onActiveEntryIdChange).toHaveBeenCalledWith("config.stub");
		fireEvent.keyDown(palette, { key: "Enter" });
		expect(onSelectEntry).toHaveBeenCalledWith(expect.objectContaining({ id: "config.stub" }));
	});

	it("dismisses on Escape", () => {
		const onDismiss = vi.fn();

		render(
			<CommandPalettePopover
				open
				query=""
				groups={groups}
				activeEntryId="session.stub"
				onActiveEntryIdChange={() => {}}
				onSelectEntry={() => {}}
				onDismiss={onDismiss}
			/>,
		);

		fireEvent.keyDown(screen.getByRole("listbox", { name: "Suggestions" }), { key: "Escape" });
		expect(onDismiss).toHaveBeenCalledOnce();
	});

	it("dismisses on outside interactions", () => {
		const onDismiss = vi.fn();

		render(
			<>
				<button type="button">Outside</button>
				<CommandPalettePopover
					open
					query=""
					groups={groups}
					activeEntryId="session.stub"
					onActiveEntryIdChange={() => {}}
					onSelectEntry={() => {}}
					onDismiss={onDismiss}
				/>
			</>,
		);

		fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
		expect(onDismiss).toHaveBeenCalledOnce();
	});
});
