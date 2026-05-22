import { createElement, type ReactNode } from "react";
import { RightPanelProvider } from "../../src/renderer/right-panel/right-panel-context";
import type { RightPanelState } from "../../src/renderer/right-panel/right-panel-types";
import { ShellLayoutProvider } from "../../src/renderer/shell/shell-layout-context";

type ShellTestProvidersProps = {
	children: ReactNode;
	initialRightPanelState?: RightPanelState;
};

export function ShellTestProviders({ children, initialRightPanelState }: ShellTestProvidersProps) {
	const rightPanelProps =
		initialRightPanelState === undefined ? { children } : { initialState: initialRightPanelState, children };

	return createElement(ShellLayoutProvider, null, createElement(RightPanelProvider, rightPanelProps));
}
