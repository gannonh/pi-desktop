// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createDefaultRightPanelState } from "../../src/renderer/right-panel/right-panel-state";
import { ShellTestProviders } from "./shell-test-providers";
import { RightPanelWorkspace } from "../../src/renderer/right-panel/right-panel-workspace";
import { WorkspaceTabStrip } from "../../src/renderer/right-panel/workspace-tab-strip";

function WorkspaceFixture() {
	return (
		<>
			<WorkspaceTabStrip />
			<RightPanelWorkspace selectedProject={null} />
		</>
	);
}

describe("right panel workspace integration", () => {
	it("switches panel body when selecting tabs", () => {
		render(
			<ShellTestProviders initialRightPanelState={createDefaultRightPanelState()}>
				<WorkspaceFixture />
			</ShellTestProviders>,
		);

		expect(screen.getByTestId("workspace-panel-diffs")).toBeTruthy();
		expect(screen.queryByTestId("workspace-panel-terminal")).toBeNull();

		fireEvent.click(screen.getByRole("tab", { name: "Terminal" }));
		expect(screen.getByTestId("workspace-panel-terminal")).toBeTruthy();
		expect(screen.queryByTestId("workspace-panel-diffs")).toBeNull();

		fireEvent.click(screen.getByRole("tab", { name: "File explorer" }));
		expect(screen.getByTestId("workspace-panel-files")).toBeTruthy();
		expect(screen.queryByTestId("workspace-panel-terminal")).toBeNull();
	});

	it("opens the add menu with all required panel kinds", () => {
		render(
			<ShellTestProviders initialRightPanelState={createDefaultRightPanelState()}>
				<WorkspaceFixture />
			</ShellTestProviders>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Add panel" }));

		for (const label of ["Changes", "Terminal", "Browser", "File"]) {
			expect(screen.getByRole("menuitem", { name: label })).toBeTruthy();
		}
	});

	it("expands the workspace when selecting a tab while collapsed", () => {
		const initial = { ...createDefaultRightPanelState(), collapsed: true };
		render(
			<ShellTestProviders initialRightPanelState={initial}>
				<WorkspaceFixture />
			</ShellTestProviders>,
		);

		expect(screen.queryByTestId("workspace-panel-body")).toBeNull();
		fireEvent.click(screen.getByRole("tab", { name: "Terminal" }));
		expect(screen.getByTestId("workspace-panel-body")).toBeTruthy();
		expect(screen.getByTestId("workspace-panel-terminal")).toBeTruthy();
	});

	it("hides and shows the workspace panel with the strip toggle", () => {
		render(
			<ShellTestProviders initialRightPanelState={createDefaultRightPanelState()}>
				<WorkspaceFixture />
			</ShellTestProviders>,
		);

		expect(screen.getByTestId("workspace-panel-body")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Hide workspace" }));
		expect(screen.queryByTestId("workspace-panel-body")).toBeNull();
		expect(screen.getByRole("button", { name: "Show workspace" })).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Show workspace" }));
		expect(screen.getByTestId("workspace-panel-body")).toBeTruthy();
	});
});
