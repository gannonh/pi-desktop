export type RightPanelKind = "terminal" | "browser" | "files" | "diffs";

export type RightPanelTab = {
	id: string;
	kind: RightPanelKind;
	title: string;
	subtitle?: string;
	mock: boolean;
};

export type RightPanelState = {
	tabs: RightPanelTab[];
	activeTabId: string | null;
	collapsed: boolean;
};
