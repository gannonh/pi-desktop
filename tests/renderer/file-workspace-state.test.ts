import { describe, expect, it } from "vitest";
import {
	applyFileLoadError,
	applyFileLoadResult,
	closeFileTab,
	createInitialFileWorkspaceState,
	dirtyTabLabels,
	hasDirtyTabs,
	openFileTab,
	setDirectoryError,
	setDirectoryLoaded,
	setDirectoryLoading,
	setFileViewMode,
	toggleExpandedPath,
	updateFileBuffer,
} from "../../src/renderer/file-workspace/file-workspace-state";

describe("file workspace state", () => {
	it("tracks explorer expansion and directory cache state", () => {
		let state = setDirectoryLoading(createInitialFileWorkspaceState(), "");
		state = setDirectoryLoaded(state, "", [
			{ name: "docs", relativePath: "docs", kind: "directory" },
			{ name: "README.md", relativePath: "README.md", kind: "file" },
		]);
		state = toggleExpandedPath(state, "docs");
		state = setDirectoryError(state, "docs", "Permission denied");

		expect(state.directoryEntries[""]?.status).toBe("loaded");
		expect(state.expandedPaths).toContain("docs");
		expect(state.directoryEntries.docs).toEqual({ status: "error", message: "Permission denied" });
	});

	it("opens a file tab and loads text content", () => {
		const opened = openFileTab(createInitialFileWorkspaceState(), "AGENTS.md");
		const loaded = applyFileLoadResult(opened, "AGENTS.md", { kind: "text", content: "# Agent\n" });

		expect(loaded.tabs).toHaveLength(1);
		expect(loaded.tabs[0]?.dirty).toBe(false);
		expect(loaded.tabs[0]?.buffer).toBe("# Agent\n");
	});

	it("records non-text load results as read-only tabs", () => {
		const opened = openFileTab(createInitialFileWorkspaceState(), "big.bin");
		const loaded = applyFileLoadResult(opened, "big.bin", { kind: "too_large" });
		expect(loaded.tabs[0]?.readOnly).toBe(true);
		expect(loaded.tabs[0]?.loadKind).toBe("too_large");
	});

	it("records load errors on tabs", () => {
		const opened = openFileTab(createInitialFileWorkspaceState(), "missing.txt");
		const errored = applyFileLoadError(opened, "missing.txt", "File not found");
		expect(errored.tabs[0]?.status).toBe("error");
	});

	it("marks a tab dirty when the buffer changes", () => {
		const opened = openFileTab(createInitialFileWorkspaceState(), "README.md");
		const loaded = applyFileLoadResult(opened, "README.md", { kind: "text", content: "hello" });
		const tabId = loaded.tabs[0]?.id;
		expect(tabId).toBeTruthy();
		if (!tabId) {
			return;
		}

		const dirty = updateFileBuffer(loaded, tabId, "hello!");
		expect(dirty.tabs[0]?.dirty).toBe(true);
	});

	it("tracks dirty tab labels and view mode changes", () => {
		let state = openFileTab(createInitialFileWorkspaceState(), "notes.md");
		state = applyFileLoadResult(state, "notes.md", { kind: "text", content: "draft" });
		const tabId = state.tabs[0]?.id;
		expect(tabId).toBeTruthy();
		if (!tabId) {
			return;
		}

		state = updateFileBuffer(state, tabId, "draft 2");
		expect(hasDirtyTabs(state)).toBe(true);
		expect(dirtyTabLabels(state)).toEqual(["notes.md"]);
		state = setFileViewMode(state, tabId, "source");
		expect(state.tabs[0]?.viewMode).toBe("source");
	});

	it("selects a neighbor tab when closing the active tab", () => {
		let state = openFileTab(createInitialFileWorkspaceState(), "a.txt");
		state = openFileTab(state, "b.txt");
		const closing = state.tabs[0]?.id;
		expect(closing).toBeTruthy();
		if (!closing) {
			return;
		}

		const next = closeFileTab(state, closing);
		expect(next.tabs).toHaveLength(1);
		expect(next.activeTabId).toBe(next.tabs[0]?.id);
	});
});
