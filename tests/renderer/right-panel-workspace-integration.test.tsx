// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createDefaultRightPanelState } from "../../src/renderer/right-panel/right-panel-state";
import { RightPanelProvider } from "../../src/renderer/right-panel/right-panel-context";
import { ShellLayoutProvider } from "../../src/renderer/shell/shell-layout-context";
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

function renderPersistentWorkspace(workspaceId: string) {
	return render(
		<ShellLayoutProvider>
			<RightPanelProvider workspaceId={workspaceId}>
				<WorkspaceFixture />
			</RightPanelProvider>
		</ShellLayoutProvider>,
	);
}

afterEach(() => {
	window.localStorage.clear();
});

describe("right panel workspace integration", () => {
	it("switches panel body when selecting tabs", () => {
		render(
			<ShellTestProviders initialRightPanelState={{ ...createDefaultRightPanelState(), collapsed: false }}>
				<WorkspaceFixture />
			</ShellTestProviders>,
		);

		expect(screen.getByTestId("workspace-panel-changes")).toBeTruthy();
		expect(screen.queryByTestId("workspace-panel-terminal")).toBeNull();

		fireEvent.click(screen.getByRole("tab", { name: "Terminal" }));
		expect(screen.getByTestId("workspace-panel-terminal")).toBeTruthy();
		expect(screen.queryByTestId("workspace-panel-changes")).toBeNull();

		fireEvent.click(screen.getByRole("tab", { name: "File explorer" }));
		expect(screen.getByTestId("workspace-panel-files")).toBeTruthy();
		expect(screen.queryByTestId("workspace-panel-terminal")).toBeNull();
	});

	it("opens the add menu with all required panel kinds", () => {
		render(
			<ShellTestProviders initialRightPanelState={{ ...createDefaultRightPanelState(), collapsed: false }}>
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
			<ShellTestProviders initialRightPanelState={{ ...createDefaultRightPanelState(), collapsed: false }}>
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

	it("restores the last tab and collapse state for each workspace", () => {
		const first = renderPersistentWorkspace("project:/tmp/one");

		fireEvent.click(screen.getByRole("tab", { name: "Terminal" }));
		fireEvent.click(screen.getByRole("button", { name: "Hide workspace" }));
		first.unmount();

		const second = renderPersistentWorkspace("project:/tmp/two");
		expect(screen.getByRole("tab", { name: "Changes", selected: true })).toBeTruthy();
		second.unmount();

		renderPersistentWorkspace("project:/tmp/one");
		expect(screen.getByRole("tab", { name: "Terminal", selected: true })).toBeTruthy();
		expect(screen.queryByTestId("workspace-panel-body")).toBeNull();
		expect(screen.getByRole("button", { name: "Show workspace" })).toBeTruthy();
	});
});
