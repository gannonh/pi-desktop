import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
	addOrActivateRightPanelTab,
	addRightPanelTab,
	createDefaultRightPanelState,
	getActiveRightPanelTab,
	isWorkspaceFilesActive,
	removeRightPanelTab,
	selectRightPanelTab,
	setRightPanelCollapsed,
} from "./right-panel-state";
import { FILE_WORKSPACE_VIEW_ID } from "./workspace-tab-ids";
import type { RightPanelAddMenuItem, RightPanelKind, RightPanelState, RightPanelTab } from "./right-panel-types";
import { useShellLayout } from "../shell/shell-layout-context";

type RightPanelContextValue = {
	state: RightPanelState;
	activeTab: RightPanelTab | null;
	filesActive: boolean;
	isNarrowLayout: boolean;
	selectTab: (tabId: string) => void;
	addTab: (kind: RightPanelKind) => void;
	addTabFromMenu: (item: RightPanelAddMenuItem) => void;
	removeTab: (tabId: string) => void;
	toggleCollapsed: () => void;
};

const RightPanelContext = createContext<RightPanelContextValue | null>(null);

interface RightPanelProviderProps {
	children: ReactNode;
	initialState?: RightPanelState;
	workspaceId?: string | null;
}

type PersistedRightPanelState = {
	version: 1;
	collapsed: boolean;
	activeKind: RightPanelKind | "files" | null;
};

const RIGHT_PANEL_STORAGE_PREFIX = "pi-desktop:right-panel:";

const storageKeyForWorkspace = (workspaceId: string) =>
	`${RIGHT_PANEL_STORAGE_PREFIX}${encodeURIComponent(workspaceId)}`;

const createStateFromPersisted = (persisted: PersistedRightPanelState | null): RightPanelState => {
	const state = createDefaultRightPanelState();
	if (!persisted) {
		return state;
	}

	const activeTabId =
		persisted.activeKind === "files"
			? FILE_WORKSPACE_VIEW_ID
			: (state.tabs.find((tab) => tab.kind === persisted.activeKind)?.id ?? state.activeTabId);

	return {
		...state,
		activeTabId,
		collapsed: persisted.collapsed,
	};
};

const readPersistedState = (workspaceId: string | null | undefined): RightPanelState => {
	if (!workspaceId || typeof window === "undefined") {
		return createDefaultRightPanelState();
	}

	try {
		const raw = window.localStorage.getItem(storageKeyForWorkspace(workspaceId));
		if (!raw) {
			return createDefaultRightPanelState();
		}
		const parsed = JSON.parse(raw) as Partial<PersistedRightPanelState>;
		if (parsed.version !== 1 || typeof parsed.collapsed !== "boolean") {
			return createDefaultRightPanelState();
		}
		return createStateFromPersisted({
			version: 1,
			collapsed: parsed.collapsed,
			activeKind: parsed.activeKind ?? null,
		});
	} catch (error) {
		console.warn("Unable to read right panel state.", error);
		return createDefaultRightPanelState();
	}
};

const createPersistedState = (state: RightPanelState): PersistedRightPanelState => {
	const activeKind = isWorkspaceFilesActive(state) ? "files" : (getActiveRightPanelTab(state)?.kind ?? null);
	return {
		version: 1,
		collapsed: state.collapsed,
		activeKind,
	};
};

const writePersistedState = (workspaceId: string | null | undefined, state: RightPanelState) => {
	if (!workspaceId || typeof window === "undefined") {
		return;
	}

	try {
		window.localStorage.setItem(storageKeyForWorkspace(workspaceId), JSON.stringify(createPersistedState(state)));
	} catch (error) {
		console.warn("Unable to save right panel state.", error);
	}
};

export function RightPanelProvider({ children, initialState, workspaceId = null }: RightPanelProviderProps) {
	const persistenceWorkspaceId = initialState === undefined ? workspaceId : null;
	const [scopedState, setScopedState] = useState(() => ({
		workspaceId: persistenceWorkspaceId,
		state: initialState ?? readPersistedState(persistenceWorkspaceId),
	}));
	const { isNarrowLayout } = useShellLayout();

	useEffect(() => {
		if (scopedState.workspaceId === persistenceWorkspaceId) {
			return;
		}
		setScopedState({
			workspaceId: persistenceWorkspaceId,
			state: initialState ?? readPersistedState(persistenceWorkspaceId),
		});
	}, [initialState, persistenceWorkspaceId, scopedState.workspaceId]);

	useEffect(() => {
		writePersistedState(scopedState.workspaceId, scopedState.state);
	}, [scopedState]);

	const state = scopedState.state;
	const updateState = useCallback(
		(updater: (current: RightPanelState) => RightPanelState) =>
			setScopedState((current) => ({ ...current, state: updater(current.state) })),
		[],
	);

	const value = useMemo<RightPanelContextValue>(
		() => ({
			state,
			activeTab: getActiveRightPanelTab(state),
			filesActive: isWorkspaceFilesActive(state),
			isNarrowLayout,
			selectTab: (tabId) => updateState((current) => selectRightPanelTab(current, tabId)),
			addTab: (kind) => updateState((current) => addRightPanelTab(current, kind)),
			addTabFromMenu: (item) => updateState((current) => addOrActivateRightPanelTab(current, item)),
			removeTab: (tabId) => updateState((current) => removeRightPanelTab(current, tabId)),
			toggleCollapsed: () => updateState((current) => setRightPanelCollapsed(current, !current.collapsed)),
		}),
		[state, isNarrowLayout, updateState],
	);

	return <RightPanelContext.Provider value={value}>{children}</RightPanelContext.Provider>;
}

export const useRightPanel = (): RightPanelContextValue => {
	const context = useContext(RightPanelContext);
	if (!context) {
		throw new Error("useRightPanel must be used within RightPanelProvider");
	}
	return context;
};
