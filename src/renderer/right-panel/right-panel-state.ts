import { createDefaultMockTabs, createMockTab } from "./right-panel-mock-data";
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
	return { ...state, activeTabId: tabId };
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

export const addRightPanelTab = (state: RightPanelState, kind: RightPanelKind): RightPanelState => {
	const tab = createMockTab(kind, titleForAddedTab(kind, state.tabs));
	return {
		...state,
		tabs: [...state.tabs, tab],
		activeTabId: tab.id,
		collapsed: false,
	};
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
