import { describe, expect, it } from "vitest";
import { rightPanelAddMenuItems } from "../../src/renderer/right-panel/right-panel-add-menu";
import {
	addOrActivateRightPanelTab,
	addRightPanelTab,
	createDefaultRightPanelState,
	isWorkspaceFilesActive,
	removeRightPanelTab,
	selectRightPanelTab,
	selectWorkspaceFileTab,
} from "../../src/renderer/right-panel/right-panel-state";
import type { RightPanelKind } from "../../src/renderer/right-panel/right-panel-types";

describe("right panel state", () => {
	it("creates default mock tabs with an active selection", () => {
		const state = createDefaultRightPanelState();

		expect(state.tabs).toHaveLength(3);
		expect(state.tabs.map((tab) => tab.kind)).toEqual(["changes", "terminal", "browser"]);
		expect(state.activeTabId).toBe(state.tabs[0]?.id);
	});

	it("selects a tab by id", () => {
		const state = createDefaultRightPanelState();
		const nextTabId = state.tabs[2]?.id;
		expect(nextTabId).toBeTruthy();
		if (!nextTabId) {
			return;
		}

		const next = selectRightPanelTab(state, nextTabId);

		expect(next.activeTabId).toBe(nextTabId);
		expect(next.collapsed).toBe(false);
	});

	it("activates an existing tab instead of duplicating single-kind panels", () => {
		const state = createDefaultRightPanelState();
		const terminalItem = rightPanelAddMenuItems.find((item) => item.id === "terminal");
		expect(terminalItem).toBeTruthy();
		if (!terminalItem) {
			return;
		}

		const next = addOrActivateRightPanelTab(state, terminalItem);

		expect(next.tabs).toHaveLength(state.tabs.length);
		expect(next.activeTabId).toBe(state.tabs.find((tab) => tab.kind === "terminal")?.id);
	});

	it("activates the file workspace view from the add menu", () => {
		const filesItem = rightPanelAddMenuItems.find((item) => item.id === "files");
		expect(filesItem).toBeTruthy();
		if (!filesItem) {
			return;
		}

		const next = addOrActivateRightPanelTab(createDefaultRightPanelState(), filesItem);

		expect(next.tabs).toHaveLength(3);
		expect(next.activeTabId).toBe("file-workspace:view");
	});

	it("activates the file workspace for diff tabs", () => {
		const next = selectWorkspaceFileTab(createDefaultRightPanelState(), "diff:unstaged:README.md");

		expect(next.activeTabId).toBe("diff:unstaged:README.md");
		expect(isWorkspaceFilesActive(next)).toBe(true);
		expect(next.collapsed).toBe(false);
	});

	it("adds a tab by kind and activates it", () => {
		const state = createDefaultRightPanelState();
		const beforeCount = state.tabs.length;

		const next = addRightPanelTab(state, "terminal");

		expect(next.tabs).toHaveLength(beforeCount + 1);
		expect(next.tabs.at(-1)?.kind).toBe("terminal");
		expect(next.activeTabId).toBe(next.tabs.at(-1)?.id);
	});

	it("selects the nearest remaining tab when the active tab is removed", () => {
		const state = createDefaultRightPanelState();
		const activeId = state.activeTabId;
		expect(activeId).toBeTruthy();
		if (!activeId) {
			return;
		}

		const next = removeRightPanelTab(state, activeId);

		expect(next.tabs.some((tab) => tab.id === activeId)).toBe(false);
		expect(next.activeTabId).toBe(next.tabs[0]?.id);
	});

	it("clears active selection when the last tab is removed", () => {
		let state = createDefaultRightPanelState();
		for (const tab of [...state.tabs]) {
			state = removeRightPanelTab(state, tab.id);
		}

		expect(state.tabs).toHaveLength(0);
		expect(state.activeTabId).toBeNull();
	});
});

describe("right panel tab titles", () => {
	const kinds: RightPanelKind[] = ["terminal", "browser", "files", "changes"];

	it.each(kinds)("adds a unique title for %s tabs", (kind) => {
		const first = addRightPanelTab(createDefaultRightPanelState(), kind);
		const second = addRightPanelTab(first, kind);

		expect(second.tabs.filter((tab) => tab.kind === kind)).toHaveLength(
			first.tabs.filter((tab) => tab.kind === kind).length + 1,
		);
		expect(new Set(second.tabs.map((tab) => tab.id)).size).toBe(second.tabs.length);
	});
});
