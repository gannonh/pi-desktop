import type { RightPanelKind, RightPanelTab } from "./right-panel-types";

let nextTabId = 1;

export const resetRightPanelTabIdCounter = () => {
	nextTabId = 1;
};

const createTabId = (kind: RightPanelKind) => `right-panel:${kind}:${nextTabId++}`;

export const createMockTab = (
	kind: RightPanelKind,
	overrides: Partial<Pick<RightPanelTab, "id" | "title" | "subtitle">> = {},
): RightPanelTab => {
	const defaults: Record<RightPanelKind, Pick<RightPanelTab, "title" | "subtitle">> = {
		terminal: { title: "Terminal", subtitle: "~/pi-desktop" },
		browser: { title: "Browser", subtitle: "localhost:5173" },
		files: { title: "Files", subtitle: "Project workspace" },
		changes: { title: "Changes", subtitle: "Source control" },
	};

	return {
		id: createTabId(kind),
		kind,
		mock: true,
		...defaults[kind],
		...overrides,
	};
};

export const createDefaultMockTabs = (): RightPanelTab[] => [
	createMockTab("changes"),
	createMockTab("terminal"),
	createMockTab("browser"),
];

export type TerminalPanelMockData = {
	cwd: string;
	prompt: string;
	output: string;
};

export type BrowserPanelMockData = {
	url: string;
	title: string;
};

export type MarkdownPanelMockData = {
	path: string;
	heading: string;
	content: string;
};


export const resolveTerminalMock = (tab: RightPanelTab): TerminalPanelMockData => ({
	cwd: tab.subtitle ?? "~/pi-desktop",
	prompt: "$ pnpm test",
	output: [
		"> pi-desktop@0.0.0 test",
		"> vitest run",
		"",
		" PASS  tests/renderer/right-panel-state.test.ts",
		" Tests  4 passed (4)",
	].join("\n"),
});

export const resolveBrowserMock = (tab: RightPanelTab): BrowserPanelMockData => ({
	url: `https://${tab.subtitle ?? "localhost:5173"}`,
	title: tab.title,
});

export const resolveMarkdownMock = (tab: RightPanelTab): MarkdownPanelMockData => ({
	path: tab.subtitle ?? tab.title,
	heading: "Pi Desktop",
	content: [
		"# Pi Desktop",
		"",
		"Local graphical command center for Pi coding-agent work.",
		"",
		"- Projects and sessions on the left",
		"- Conversation in the center",
		"- Tabbed work surfaces on the right",
	].join("\n"),
});

