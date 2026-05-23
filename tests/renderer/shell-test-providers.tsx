import { createElement, type ReactNode } from "react";
import { FileWorkspaceProvider } from "../../src/renderer/file-workspace/file-workspace-context";
import { RightPanelProvider } from "../../src/renderer/right-panel/right-panel-context";
import type { RightPanelState } from "../../src/renderer/right-panel/right-panel-types";
import type { ProjectRecord } from "../../src/shared/project-state";
import { ShellLayoutProvider } from "../../src/renderer/shell/shell-layout-context";

type ShellTestProvidersProps = {
	children: ReactNode;
	initialRightPanelState?: RightPanelState;
	project?: ProjectRecord | null;
};

export function ShellTestProviders({
	children,
	initialRightPanelState,
	project = null,
}: ShellTestProvidersProps) {
	const rightPanelProps =
		initialRightPanelState === undefined
			? { children: createElement(FileWorkspaceProvider, { project, children }) }
			: {
					initialState: initialRightPanelState,
					children: createElement(FileWorkspaceProvider, { project, children }),
				};

	return createElement(ShellLayoutProvider, null, createElement(RightPanelProvider, rightPanelProps));
}
