// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RightPanelProvider } from "../../src/renderer/right-panel/right-panel-context";
import { createDefaultRightPanelState } from "../../src/renderer/right-panel/right-panel-state";
import { RightPanelWorkspace } from "../../src/renderer/right-panel/right-panel-workspace";
import { WorkspaceTabStrip } from "../../src/renderer/right-panel/workspace-tab-strip";

function WorkspaceFixture() {
	return (
		<>
			<WorkspaceTabStrip />
			<RightPanelWorkspace />
		</>
	);
}

describe("right panel workspace integration", () => {
	it("switches panel body when selecting tabs", () => {
		render(
			<RightPanelProvider initialState={createDefaultRightPanelState()}>
				<WorkspaceFixture />
			</RightPanelProvider>,
		);

		expect(screen.getByTestId("workspace-panel-diffs")).toBeTruthy();
		expect(screen.queryByTestId("workspace-panel-terminal")).toBeNull();

		fireEvent.click(screen.getByRole("tab", { name: "Terminal" }));
		expect(screen.getByTestId("workspace-panel-terminal")).toBeTruthy();
		expect(screen.queryByTestId("workspace-panel-diffs")).toBeNull();

		fireEvent.click(screen.getByRole("tab", { name: "README.md" }));
		expect(screen.getByTestId("workspace-panel-markdown")).toBeTruthy();
		expect(screen.queryByTestId("workspace-panel-terminal")).toBeNull();
	});

	it("opens the add menu with all required panel kinds", () => {
		render(
			<RightPanelProvider initialState={createDefaultRightPanelState()}>
				<WorkspaceFixture />
			</RightPanelProvider>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Add panel" }));

		for (const label of ["Changes", "Terminal", "Browser", "File", "Markdown"]) {
			expect(screen.getByRole("menuitem", { name: label })).toBeTruthy();
		}
	});

	it("expands the workspace when selecting a tab while collapsed", () => {
		const initial = { ...createDefaultRightPanelState(), collapsed: true };
		render(
			<RightPanelProvider initialState={initial}>
				<WorkspaceFixture />
			</RightPanelProvider>,
		);

		expect(screen.queryByTestId("workspace-panel-body")).toBeNull();
		fireEvent.click(screen.getByRole("tab", { name: "Terminal" }));
		expect(screen.getByTestId("workspace-panel-body")).toBeTruthy();
		expect(screen.getByTestId("workspace-panel-terminal")).toBeTruthy();
	});

	it("hides and shows the workspace panel with the strip toggle", () => {
		render(
			<RightPanelProvider initialState={createDefaultRightPanelState()}>
				<WorkspaceFixture />
			</RightPanelProvider>,
		);

		expect(screen.getByTestId("workspace-panel-body")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Hide workspace" }));
		expect(screen.queryByTestId("workspace-panel-body")).toBeNull();
		expect(screen.getByRole("button", { name: "Show workspace" })).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Show workspace" }));
		expect(screen.getByTestId("workspace-panel-body")).toBeTruthy();
	});
});
