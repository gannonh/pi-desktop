// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createDefaultRightPanelState } from "../../src/renderer/right-panel/right-panel-state";
import { ShellTestProviders } from "./shell-test-providers";
import { WorkspaceTabStrip } from "../../src/renderer/right-panel/workspace-tab-strip";

describe("right panel interactions", () => {
	it("adds a new terminal tab from the plus menu", () => {
		const initial = createDefaultRightPanelState();
		render(
			<ShellTestProviders initialRightPanelState={initial}>
				<WorkspaceTabStrip />
			</ShellTestProviders>,
		);

		const tabsBefore = screen.getAllByRole("tab").length;
		fireEvent.click(screen.getByRole("button", { name: "Add panel" }));
		fireEvent.click(screen.getByRole("menuitem", { name: "Terminal" }));

		expect(screen.getAllByRole("tab")).toHaveLength(tabsBefore);
		expect(screen.getByRole("tab", { name: "Terminal", selected: true })).toBeTruthy();
	});

	it("adds a new file tab from the plus menu", () => {
		render(
			<ShellTestProviders initialRightPanelState={createDefaultRightPanelState()}>
				<WorkspaceTabStrip />
			</ShellTestProviders>,
		);

		const tabsBefore = screen.getAllByRole("tab").length;
		fireEvent.click(screen.getByRole("button", { name: "Add panel" }));
		fireEvent.click(screen.getByRole("menuitem", { name: "File" }));

		expect(screen.getAllByRole("tab")).toHaveLength(tabsBefore + 1);
		expect(screen.getByRole("tab", { name: "New file", selected: true })).toBeTruthy();
	});
});
