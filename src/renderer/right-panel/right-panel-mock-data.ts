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
		diffs: { title: "PR #11", subtitle: "feat/right-panel-shell" },
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
	createMockTab("diffs"),
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

export type DiffsPanelMockData = {
	prTitle: string;
	status: string;
	changedFiles: string[];
	checks: { name: string; status: string }[];
	summaryRows: { path: string; additions: number; deletions: number }[];
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

export const resolveDiffsMock = (_tab: RightPanelTab): DiffsPanelMockData => ({
	prTitle: "M07A.2 right panel tab shell",
	status: "Open · 3 files changed",
	changedFiles: [
		"src/renderer/components/chat-shell.tsx",
		"src/renderer/styles.css",
		"tests/renderer/chat-shell.test.ts",
	],
	checks: [
		{ name: "typecheck", status: "passing" },
		{ name: "unit tests", status: "passing" },
		{ name: "smoke", status: "pending" },
	],
	summaryRows: [
		{ path: "chat-shell.tsx", additions: 4, deletions: 2 },
		{ path: "styles.css", additions: 120, deletions: 18 },
		{ path: "chat-shell.test.ts", additions: 12, deletions: 8 },
	],
});
