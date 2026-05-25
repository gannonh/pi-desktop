import { isMarkdownRelativePath } from "./file-workspace-paths";
import type { FileEditorTab, FileViewMode, FileWorkspaceState } from "./file-workspace-types";

export const createInitialFileWorkspaceState = (): FileWorkspaceState => ({
	expandedPaths: [],
	selectedPath: null,
	loadingPaths: [],
	directoryEntries: {},
	tabs: [],
	activeTabId: null,
	saveStatus: "idle",
});

const tabIdForPath = (relativePath: string) => `file:${relativePath}`;

const basename = (relativePath: string) => relativePath.split("/").at(-1) ?? relativePath;

export const toggleExpandedPath = (state: FileWorkspaceState, relativePath: string): FileWorkspaceState => {
	const expanded = state.expandedPaths.includes(relativePath)
		? state.expandedPaths.filter((path) => path !== relativePath)
		: [...state.expandedPaths, relativePath];
	return { ...state, expandedPaths: expanded };
};

export const setDirectoryLoading = (state: FileWorkspaceState, relativePath: string): FileWorkspaceState => ({
	...state,
	loadingPaths: state.loadingPaths.includes(relativePath) ? state.loadingPaths : [...state.loadingPaths, relativePath],
	directoryEntries: {
		...state.directoryEntries,
		[relativePath]: { status: "loading" },
	},
});

export const setDirectoryLoaded = (
	state: FileWorkspaceState,
	relativePath: string,
	entries: { name: string; relativePath: string; kind: "file" | "directory" }[],
): FileWorkspaceState => ({
	...state,
	loadingPaths: state.loadingPaths.filter((path) => path !== relativePath),
	directoryEntries: {
		...state.directoryEntries,
		[relativePath]: { status: "loaded", entries },
	},
});

export const setDirectoryError = (
	state: FileWorkspaceState,
	relativePath: string,
	message: string,
): FileWorkspaceState => ({
	...state,
	loadingPaths: state.loadingPaths.filter((path) => path !== relativePath),
	directoryEntries: {
		...state.directoryEntries,
		[relativePath]: { status: "error", message },
	},
});

export const selectExplorerPath = (state: FileWorkspaceState, relativePath: string | null): FileWorkspaceState => ({
	...state,
	selectedPath: relativePath,
});

export const openFileTab = (state: FileWorkspaceState, relativePath: string): FileWorkspaceState => {
	const existing = state.tabs.find((tab) => tab.relativePath === relativePath);
	if (existing) {
		return {
			...state,
			selectedPath: relativePath,
			activeTabId: existing.id,
			tabs: state.tabs.map((tab) =>
				tab.id === existing.id ? { ...tab, status: tab.status === "loaded" ? tab.status : "loading" } : tab,
			),
		};
	}

	const tab: FileEditorTab = {
		id: tabIdForPath(relativePath),
		relativePath,
		title: basename(relativePath),
		dirty: false,
		savedContent: null,
		buffer: "",
		status: "loading",
		viewMode: isMarkdownRelativePath(relativePath) ? "preview" : "source",
		readOnly: false,
	};

	return {
		...state,
		selectedPath: relativePath,
		tabs: [...state.tabs, tab],
		activeTabId: tab.id,
	};
};

export const setActiveFileTab = (state: FileWorkspaceState, tabId: string): FileWorkspaceState => {
	const tab = state.tabs.find((candidate) => candidate.id === tabId);
	if (!tab) {
		return state;
	}
	return {
		...state,
		activeTabId: tabId,
		selectedPath: tab.relativePath,
	};
};

export const applyFileLoadResult = (
	state: FileWorkspaceState,
	relativePath: string,
	result: { kind: "text"; content: string } | { kind: "binary" | "too_large" | "not_found" | "unsupported" },
): FileWorkspaceState => ({
	...state,
	tabs: state.tabs.map((tab) => {
		if (tab.relativePath !== relativePath) {
			return tab;
		}

		if (tab.dirty) {
			return tab;
		}

		if (result.kind !== "text") {
			return {
				...tab,
				status: "loaded",
				loadKind: result.kind,
				readOnly: true,
				buffer: "",
				savedContent: "",
			};
		}

		return {
			...tab,
			status: "loaded",
			loadKind: "text",
			readOnly: false,
			buffer: result.content,
			savedContent: result.content,
			dirty: false,
		};
	}),
});

export const applyFileLoadError = (
	state: FileWorkspaceState,
	relativePath: string,
	message: string,
): FileWorkspaceState => ({
	...state,
	tabs: state.tabs.map((tab) =>
		tab.relativePath === relativePath ? { ...tab, status: "error", errorMessage: message } : tab,
	),
});

export const updateFileBuffer = (state: FileWorkspaceState, tabId: string, buffer: string): FileWorkspaceState => ({
	...state,
	tabs: state.tabs.map((tab) => {
		if (tab.id !== tabId) {
			return tab;
		}
		const dirty = tab.savedContent !== null ? buffer !== tab.savedContent : buffer.length > 0;
		return {
			...tab,
			buffer,
			dirty,
		};
	}),
	saveStatus: "idle",
});

export const setFileViewMode = (
	state: FileWorkspaceState,
	tabId: string,
	viewMode: FileViewMode,
): FileWorkspaceState => ({
	...state,
	tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, viewMode } : tab)),
});

export const markFileSaved = (state: FileWorkspaceState, tabId: string, content: string): FileWorkspaceState => {
	const savedTab = state.tabs.find((tab) => tab.id === tabId);
	const savedCurrentBuffer = savedTab?.buffer === content;
	return {
		...state,
		saveStatus: "idle",
		saveMessage: undefined,
		tabs: state.tabs.map((tab) =>
			tab.id === tabId
				? {
						...tab,
						buffer: savedCurrentBuffer ? content : tab.buffer,
						savedContent: content,
						dirty: !savedCurrentBuffer,
					}
				: tab,
		),
	};
};

export const setSaveStatus = (
	state: FileWorkspaceState,
	saveStatus: FileWorkspaceState["saveStatus"],
	saveMessage?: string,
): FileWorkspaceState => ({
	...state,
	saveStatus,
	saveMessage,
});

export const closeFileTab = (state: FileWorkspaceState, tabId: string): FileWorkspaceState => {
	const removedIndex = state.tabs.findIndex((tab) => tab.id === tabId);
	if (removedIndex === -1) {
		return state;
	}

	const tabs = state.tabs.filter((tab) => tab.id !== tabId);
	const nextActive = tabs[removedIndex] ?? tabs[removedIndex - 1] ?? tabs[0] ?? null;

	return {
		...state,
		tabs,
		activeTabId: nextActive?.id ?? null,
		selectedPath: nextActive?.relativePath ?? state.selectedPath,
	};
};

export const resetFileWorkspaceState = (): FileWorkspaceState => createInitialFileWorkspaceState();

export const getActiveFileTab = (state: FileWorkspaceState): FileEditorTab | null => {
	if (!state.activeTabId) {
		return null;
	}
	return state.tabs.find((tab) => tab.id === state.activeTabId) ?? null;
};

export const hasDirtyTabs = (state: FileWorkspaceState): boolean => state.tabs.some((tab) => tab.dirty);

export const dirtyTabLabels = (state: FileWorkspaceState): string[] =>
	state.tabs.filter((tab) => tab.dirty).map((tab) => tab.title);
