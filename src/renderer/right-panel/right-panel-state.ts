import { createDefaultMockTabs, createMockTab } from "./right-panel-mock-data";
import type { RightPanelAddMenuItem } from "./right-panel-add-menu";
import type { RightPanelKind, RightPanelState, RightPanelTab } from "./right-panel-types";

export const createDefaultRightPanelState = (): RightPanelState => {
	const tabs = createDefaultMockTabs();
	return {
		tabs,
		activeTabId: tabs[0]?.id ?? null,
		collapsed: false,
	};
};

const findTabIndex = (tabs: readonly RightPanelTab[], tabId: string) => tabs.findIndex((tab) => tab.id === tabId);

export const selectRightPanelTab = (state: RightPanelState, tabId: string): RightPanelState => {
	if (!state.tabs.some((tab) => tab.id === tabId)) {
		return state;
	}
	return { ...state, activeTabId: tabId, collapsed: false };
};

const titleForAddedTab = (
	kind: RightPanelKind,
	existing: readonly RightPanelTab[],
): Partial<Pick<RightPanelTab, "title" | "subtitle">> => {
	const sameKind = existing.filter((tab) => tab.kind === kind);
	if (sameKind.length === 0) {
		return {};
	}

	const base = createMockTab(kind);
	return {
		title: `${base.title} ${sameKind.length + 1}`,
		subtitle: base.subtitle,
	};
};

const menuItemTabOverrides = (
	item: RightPanelAddMenuItem,
	tabs: readonly RightPanelTab[],
): Partial<Pick<RightPanelTab, "title" | "subtitle">> => {
	if (item.id === "markdown-file") {
		return { title: "New file", subtitle: "untitled.md" };
	}
	if (item.id === "markdown-doc") {
		return { title: "New note", subtitle: "notes/draft.md" };
	}
	return titleForAddedTab(item.kind, tabs);
};

const findTabForMenuItem = (tabs: readonly RightPanelTab[], item: RightPanelAddMenuItem): RightPanelTab | null => {
	if (item.kind === "markdown") {
		return null;
	}
	return tabs.find((tab) => tab.kind === item.kind) ?? null;
};

export const addRightPanelTab = (
	state: RightPanelState,
	kind: RightPanelKind,
	overrides: Partial<Pick<RightPanelTab, "title" | "subtitle">> = {},
): RightPanelState => {
	const tab = createMockTab(kind, { ...titleForAddedTab(kind, state.tabs), ...overrides });
	return {
		...state,
		tabs: [...state.tabs, tab],
		activeTabId: tab.id,
		collapsed: false,
	};
};

export const addOrActivateRightPanelTab = (state: RightPanelState, item: RightPanelAddMenuItem): RightPanelState => {
	const existing = findTabForMenuItem(state.tabs, item);
	if (existing) {
		return selectRightPanelTab(state, existing.id);
	}

	const overrides =
		item.kind === "markdown" ? menuItemTabOverrides(item, state.tabs) : titleForAddedTab(item.kind, state.tabs);
	return addRightPanelTab(state, item.kind, overrides);
};

const nearestTabId = (tabs: readonly RightPanelTab[], removedIndex: number): string | null => {
	if (tabs.length === 0) {
		return null;
	}
	const neighbor = tabs[removedIndex] ?? tabs[removedIndex - 1] ?? tabs[0];
	return neighbor?.id ?? null;
};

export const removeRightPanelTab = (state: RightPanelState, tabId: string): RightPanelState => {
	const removedIndex = findTabIndex(state.tabs, tabId);
	if (removedIndex === -1) {
		return state;
	}

	const tabs = state.tabs.filter((tab) => tab.id !== tabId);
	const activeTabId =
		state.activeTabId === tabId
			? nearestTabId(tabs, removedIndex)
			: state.activeTabId && tabs.some((tab) => tab.id === state.activeTabId)
				? state.activeTabId
				: (tabs[0]?.id ?? null);

	return { ...state, tabs, activeTabId };
};

export const setRightPanelCollapsed = (state: RightPanelState, collapsed: boolean): RightPanelState => ({
	...state,
	collapsed,
});

export const getActiveRightPanelTab = (state: RightPanelState): RightPanelTab | null => {
	if (!state.activeTabId) {
		return null;
	}
	return state.tabs.find((tab) => tab.id === state.activeTabId) ?? null;
};
