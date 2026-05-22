import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useWorkspaceLayout } from "../right-panel/use-workspace-layout";
import {
	clampSidebarWidth,
	clampWorkspaceWidth,
	resolveDefaultWorkspaceWidth,
	SIDEBAR_WIDTH_DEFAULT,
} from "./shell-layout";

type ShellLayoutContextValue = {
	sidebarWidth: number;
	workspaceWidth: number;
	isNarrowLayout: boolean;
	setSidebarWidth: (width: number) => void;
	setWorkspaceWidth: (width: number) => void;
};

const ShellLayoutContext = createContext<ShellLayoutContextValue | null>(null);

interface ShellLayoutProviderProps {
	children: ReactNode;
	initialSidebarWidth?: number;
	initialWorkspaceWidth?: number;
}

export function ShellLayoutProvider({
	children,
	initialSidebarWidth = SIDEBAR_WIDTH_DEFAULT,
	initialWorkspaceWidth = resolveDefaultWorkspaceWidth(),
}: ShellLayoutProviderProps) {
	const [sidebarWidth, setSidebarWidthState] = useState(() => clampSidebarWidth(initialSidebarWidth));
	const [workspaceWidth, setWorkspaceWidthState] = useState(() => clampWorkspaceWidth(initialWorkspaceWidth));
	const { isNarrow: isNarrowLayout } = useWorkspaceLayout();

	const setSidebarWidth = useCallback((width: number) => setSidebarWidthState(clampSidebarWidth(width)), []);
	const setWorkspaceWidth = useCallback((width: number) => setWorkspaceWidthState(clampWorkspaceWidth(width)), []);

	const value = useMemo<ShellLayoutContextValue>(
		() => ({
			sidebarWidth,
			workspaceWidth,
			isNarrowLayout,
			setSidebarWidth,
			setWorkspaceWidth,
		}),
		[sidebarWidth, workspaceWidth, isNarrowLayout, setSidebarWidth, setWorkspaceWidth],
	);

	return <ShellLayoutContext.Provider value={value}>{children}</ShellLayoutContext.Provider>;
}

export const useShellLayout = (): ShellLayoutContextValue => {
	const context = useContext(ShellLayoutContext);
	if (!context) {
		throw new Error("useShellLayout must be used within ShellLayoutProvider");
	}
	return context;
};
