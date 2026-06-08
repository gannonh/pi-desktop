export type RightPanelKind = "terminal" | "browser" | "files" | "changes";

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

export type RightPanelAddMenuItem = {
	[K in RightPanelKind]: {
		id: K;
		kind: K;
		label: string;
	};
}[RightPanelKind];
