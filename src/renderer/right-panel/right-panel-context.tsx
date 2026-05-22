import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { RightPanelAddMenuItem } from "./right-panel-add-menu";
import {
	addOrActivateRightPanelTab,
	addRightPanelTab,
	createDefaultRightPanelState,
	getActiveRightPanelTab,
	removeRightPanelTab,
	selectRightPanelTab,
	setRightPanelCollapsed,
} from "./right-panel-state";
import type { RightPanelKind, RightPanelState, RightPanelTab } from "./right-panel-types";
import { useShellLayout } from "../shell/shell-layout-context";

type RightPanelContextValue = {
	state: RightPanelState;
	activeTab: RightPanelTab | null;
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
}

export function RightPanelProvider({
	children,
	initialState = createDefaultRightPanelState(),
}: RightPanelProviderProps) {
	const [state, setState] = useState(initialState);
	const { isNarrowLayout } = useShellLayout();

	const value = useMemo<RightPanelContextValue>(
		() => ({
			state,
			activeTab: getActiveRightPanelTab(state),
			isNarrowLayout,
			selectTab: (tabId) => setState((current) => selectRightPanelTab(current, tabId)),
			addTab: (kind) => setState((current) => addRightPanelTab(current, kind)),
			addTabFromMenu: (item) => setState((current) => addOrActivateRightPanelTab(current, item)),
			removeTab: (tabId) => setState((current) => removeRightPanelTab(current, tabId)),
			toggleCollapsed: () => setState((current) => setRightPanelCollapsed(current, !current.collapsed)),
		}),
		[state, isNarrowLayout],
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
