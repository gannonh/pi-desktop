import { createDefaultMockTabs, createMockTab } from "./right-panel-mock-data";
import type { RightPanelAddMenuItem, RightPanelKind, RightPanelState, RightPanelTab } from "./right-panel-types";
import { FILE_WORKSPACE_VIEW_ID, isWorkspaceFileTabId } from "./workspace-tab-ids";

export const WORKSPACE_TOOL_KINDS = ["changes", "terminal", "browser"] as const satisfies readonly RightPanelKind[];

export const createDefaultRightPanelState = (): RightPanelState => {
	const tabs = createDefaultMockTabs();
	return {
		tabs,
		activeTabId: tabs[0]?.id ?? null,
		collapsed: true,
	};
};

const findTabIndex = (tabs: readonly RightPanelTab[], tabId: string) => tabs.findIndex((tab) => tab.id === tabId);

export const selectRightPanelTab = (state: RightPanelState, tabId: string): RightPanelState => {
	if (!isWorkspaceFileTabId(tabId) && !state.tabs.some((tab) => tab.id === tabId)) {
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

const findTabForMenuItem = (tabs: readonly RightPanelTab[], item: RightPanelAddMenuItem): RightPanelTab | null => {
	if (item.kind === "files") {
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
	if (item.kind === "files") {
		return selectRightPanelTab(state, FILE_WORKSPACE_VIEW_ID);
	}

	const existing = findTabForMenuItem(state.tabs, item);
	if (existing) {
		return selectRightPanelTab(state, existing.id);
	}

	return addRightPanelTab(state, item.kind);
};

export const selectWorkspaceFileTab = (state: RightPanelState, tabId: string): RightPanelState =>
	selectRightPanelTab(state, tabId);

export const getWorkspaceToolTabs = (state: RightPanelState): RightPanelTab[] =>
	state.tabs.filter((tab) => WORKSPACE_TOOL_KINDS.includes(tab.kind as (typeof WORKSPACE_TOOL_KINDS)[number]));

export const isWorkspaceFilesActive = (state: RightPanelState): boolean => isWorkspaceFileTabId(state.activeTabId);

export const getActiveWorkspaceToolTab = (state: RightPanelState): RightPanelTab | null => {
	if (!state.activeTabId || isWorkspaceFileTabId(state.activeTabId)) {
		return null;
	}
	return state.tabs.find((tab) => tab.id === state.activeTabId) ?? null;
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

export const getActiveRightPanelTab = (state: RightPanelState): RightPanelTab | null =>
	getActiveWorkspaceToolTab(state);
