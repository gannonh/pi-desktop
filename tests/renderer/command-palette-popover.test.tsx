// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandPalettePopover } from "../../src/renderer/components/command-palette-popover";
import {
	createCommandPaletteRegistry,
	getDefaultCommandPaletteEntries,
} from "../../src/renderer/chat/command-palette-registry";

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
		const groups = createCommandPaletteRegistry(getDefaultCommandPaletteEntries()).getEntriesBySection();

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
		const groups = createCommandPaletteRegistry(getDefaultCommandPaletteEntries()).getEntriesBySection();
		const onSelectEntry = vi.fn();
		const onActiveEntryIdChange = vi.fn();

		render(
			<CommandPalettePopover
				open
				query=""
				groups={groups}
				activeEntryId="session.stub"
				onActiveEntryIdChange={onActiveEntryIdChange}
				onSelectEntry={onSelectEntry}
				onDismiss={() => {}}
			/>,
		);

		const palette = screen.getByRole("listbox", { name: "Suggestions" });
		fireEvent.keyDown(palette, { key: "ArrowDown" });
		expect(onActiveEntryIdChange).toHaveBeenCalledWith("config.stub");
		fireEvent.keyDown(palette, { key: "Enter" });
		expect(onSelectEntry).toHaveBeenCalledWith(expect.objectContaining({ id: "config.stub" }));
	});

	it("dismisses on Escape", () => {
		const groups = createCommandPaletteRegistry(getDefaultCommandPaletteEntries()).getEntriesBySection();
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
});
