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
import {
	WORKSPACE_COLUMN_WIDTH_DEFAULT,
	clampWorkspaceColumnWidth,
} from "./use-workspace-column-resize";
import { useWorkspaceLayout } from "./use-workspace-layout";

type RightPanelContextValue = {
	state: RightPanelState;
	activeTab: RightPanelTab | null;
	workspaceWidth: number;
	isNarrowLayout: boolean;
	selectTab: (tabId: string) => void;
	addTab: (kind: RightPanelKind) => void;
	addTabFromMenu: (item: RightPanelAddMenuItem) => void;
	removeTab: (tabId: string) => void;
	toggleCollapsed: () => void;
	setWorkspaceWidth: (width: number) => void;
};

const RightPanelContext = createContext<RightPanelContextValue | null>(null);

interface RightPanelProviderProps {
	children: ReactNode;
	initialState?: RightPanelState;
	initialWorkspaceWidth?: number;
}

export function RightPanelProvider({
	children,
	initialState = createDefaultRightPanelState(),
	initialWorkspaceWidth = WORKSPACE_COLUMN_WIDTH_DEFAULT,
}: RightPanelProviderProps) {
	const [state, setState] = useState(initialState);
	const [workspaceWidth, setWorkspaceWidthState] = useState(() =>
		clampWorkspaceColumnWidth(initialWorkspaceWidth),
	);
	const { isNarrow: isNarrowLayout } = useWorkspaceLayout();

	const setWorkspaceWidth = (width: number) => setWorkspaceWidthState(clampWorkspaceColumnWidth(width));

	const value = useMemo<RightPanelContextValue>(
		() => ({
			state,
			activeTab: getActiveRightPanelTab(state),
			workspaceWidth,
			isNarrowLayout,
			selectTab: (tabId) => setState((current) => selectRightPanelTab(current, tabId)),
			addTab: (kind) => setState((current) => addRightPanelTab(current, kind)),
			addTabFromMenu: (item) => setState((current) => addOrActivateRightPanelTab(current, item)),
			removeTab: (tabId) => setState((current) => removeRightPanelTab(current, tabId)),
			toggleCollapsed: () => setState((current) => setRightPanelCollapsed(current, !current.collapsed)),
			setWorkspaceWidth,
		}),
		[state, workspaceWidth, isNarrowLayout],
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
