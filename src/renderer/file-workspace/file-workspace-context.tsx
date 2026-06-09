import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ProjectRecord } from "../../shared/project-state";
import { confirmDiscardUnsavedChanges } from "./confirm-discard";
import {
	applyFileLoadError,
	applyFileLoadResult,
	closeFileTab,
	createInitialFileWorkspaceState,
	dirtyTabLabels,
	getActiveFileTab,
	hasDirtyTabs,
	markFileSaved,
	openDiffTab,
	openFileTab,
	resetFileWorkspaceState,
	selectExplorerPath,
	setActiveFileTab,
	setDirectoryError,
	setDirectoryLoaded,
	setDirectoryLoading,
	setFileViewMode,
	setSaveStatus,
	toggleExpandedPath,
	updateFileBuffer,
} from "./file-workspace-state";
import { registerFileWorkspaceDiscardConfirm } from "./file-workspace-guard";
import { useRightPanel } from "../right-panel/right-panel-context";
import { FILE_WORKSPACE_VIEW_ID } from "../right-panel/workspace-tab-ids";
import type { FileViewMode, FileWorkspaceState } from "./file-workspace-types";
import type { GitDiffContext, GitDiffKind, GitDiffPayload } from "../../shared/source-control/types";

type FileWorkspaceContextValue = {
	project: ProjectRecord | null;
	state: FileWorkspaceState;
	activeTab: ReturnType<typeof getActiveFileTab>;
	toggleDirectory: (relativePath: string) => void;
	selectExplorerItem: (relativePath: string, kind: "file" | "directory") => void;
	openDiff: (input: {
		relativePath: string;
		kind: GitDiffKind;
		diff: GitDiffPayload;
		suffix?: string;
		diffContext?: GitDiffContext;
	}) => void;
	setActiveTab: (tabId: string) => void;
	closeTab: (tabId: string, force?: boolean) => boolean;
	updateBuffer: (tabId: string, buffer: string) => void;
	setViewMode: (tabId: string, viewMode: FileViewMode) => void;
	saveActiveFile: () => Promise<void>;
	retryLoadDirectory: (relativePath: string) => void;
};

export const FileWorkspaceContext = createContext<FileWorkspaceContextValue | null>(null);

const errorMessageFor = (error: unknown): string => (error instanceof Error ? error.message : String(error));

interface FileWorkspaceProviderProps {
	project: ProjectRecord | null;
	children: ReactNode;
}

export function FileWorkspaceProvider({ project, children }: FileWorkspaceProviderProps) {
	const { selectTab, state: rightPanelState } = useRightPanel();
	const [state, setState] = useState<FileWorkspaceState>(() => createInitialFileWorkspaceState());
	const stateRef = useRef(state);
	stateRef.current = state;
	const projectIdRef = useRef<string | null>(project?.id ?? null);
	const loadGenerationRef = useRef(0);

	const isLoadCurrent = useCallback(
		(generation: number, expectedProjectId: string) =>
			generation === loadGenerationRef.current && projectIdRef.current === expectedProjectId,
		[],
	);

	const confirmDiscardUnsavedIfNeeded = useCallback(() => {
		const current = stateRef.current;
		if (!hasDirtyTabs(current)) {
			return true;
		}
		return confirmDiscardUnsavedChanges(dirtyTabLabels(current));
	}, []);

	useEffect(() => {
		registerFileWorkspaceDiscardConfirm(confirmDiscardUnsavedIfNeeded);
		return () => registerFileWorkspaceDiscardConfirm(null);
	}, [confirmDiscardUnsavedIfNeeded]);

	useEffect(() => {
		if (projectIdRef.current === (project?.id ?? null)) {
			return;
		}
		projectIdRef.current = project?.id ?? null;
		loadGenerationRef.current += 1;
		setState(resetFileWorkspaceState());
	}, [project?.id]);

	const loadDirectory = useCallback(
		async (relativePath: string) => {
			if (!project || project.availability.status !== "available") {
				return;
			}

			const generation = loadGenerationRef.current;
			const projectId = project.id;

			setState((current) => setDirectoryLoading(current, relativePath));
			let result: Awaited<ReturnType<typeof window.piDesktop.workspaceFiles.listDirectory>>;
			try {
				result = await window.piDesktop.workspaceFiles.listDirectory({
					projectId,
					relativePath,
				});
			} catch (error) {
				if (isLoadCurrent(generation, projectId)) {
					setState((current) => setDirectoryError(current, relativePath, errorMessageFor(error)));
				}
				return;
			}
			if (!isLoadCurrent(generation, projectId)) {
				return;
			}
			if (!result.ok) {
				setState((current) => setDirectoryError(current, relativePath, result.error.message));
				return;
			}
			setState((current) => setDirectoryLoaded(current, relativePath, result.data.entries));
		},
		[isLoadCurrent, project],
	);

	const loadFile = useCallback(
		async (relativePath: string) => {
			if (!project || project.availability.status !== "available") {
				return;
			}

			const generation = loadGenerationRef.current;
			const projectId = project.id;

			let result: Awaited<ReturnType<typeof window.piDesktop.workspaceFiles.readFile>>;
			try {
				result = await window.piDesktop.workspaceFiles.readFile({
					projectId,
					relativePath,
				});
			} catch (error) {
				if (isLoadCurrent(generation, projectId)) {
					setState((current) => applyFileLoadError(current, relativePath, errorMessageFor(error)));
				}
				return;
			}
			if (!isLoadCurrent(generation, projectId)) {
				return;
			}
			if (!result.ok) {
				setState((current) => applyFileLoadError(current, relativePath, result.error.message));
				return;
			}
			setState((current) => applyFileLoadResult(current, relativePath, result.data));
		},
		[isLoadCurrent, project],
	);

	const toggleDirectory = useCallback(
		(relativePath: string) => {
			setState((current) => {
				const next = toggleExpandedPath(current, relativePath);
				if (next.expandedPaths.includes(relativePath)) {
					const cached = next.directoryEntries[relativePath];
					if (!cached || cached.status === "error") {
						void loadDirectory(relativePath);
					}
				}
				return next;
			});
		},
		[loadDirectory],
	);

	useEffect(() => {
		if (!project || project.availability.status !== "available") {
			return;
		}
		void loadDirectory("");
	}, [loadDirectory, project]);

	const selectWorkspaceTab = useCallback(
		(tabId: string) => {
			selectTab(tabId);
		},
		[selectTab],
	);

	const selectExplorerItem = useCallback(
		(relativePath: string, kind: "file" | "directory") => {
			if (kind === "directory") {
				toggleDirectory(relativePath);
				setState((current) => selectExplorerPath(current, relativePath));
				return;
			}

			const existing = stateRef.current.tabs.find((tab) => tab.relativePath === relativePath);
			setState((current) => {
				const next = openFileTab(current, relativePath);
				if (next.activeTabId) {
					selectWorkspaceTab(next.activeTabId);
				}
				return next;
			});
			if (!existing?.dirty) {
				void loadFile(relativePath);
			}
		},
		[loadFile, selectWorkspaceTab, toggleDirectory],
	);

	const closeTab = useCallback(
		(tabId: string, force = false) => {
			const tab = stateRef.current.tabs.find((candidate) => candidate.id === tabId);
			if (!tab) {
				return false;
			}
			if (!force && tab.dirty && !confirmDiscardUnsavedChanges([tab.title])) {
				return false;
			}
			setState((current) => {
				const next = closeFileTab(current, tabId);
				if (rightPanelState.activeTabId === tabId) {
					const fallback =
						next.activeTabId ?? (next.tabs.length > 0 ? next.tabs.at(-1)?.id : null) ?? FILE_WORKSPACE_VIEW_ID;
					selectWorkspaceTab(fallback);
				}
				return next;
			});
			return true;
		},
		[rightPanelState.activeTabId, selectWorkspaceTab],
	);

	const saveActiveFile = useCallback(async () => {
		if (!project || project.availability.status !== "available") {
			return;
		}

		const tab = getActiveFileTab(stateRef.current);
		if (!tab || tab.kind === "diff" || tab.readOnly || !tab.dirty) {
			return;
		}

		const generation = loadGenerationRef.current;
		const projectId = project.id;

		const savedBuffer = tab.buffer;
		setState((current) => setSaveStatus(current, "saving"));

		let result: Awaited<ReturnType<typeof window.piDesktop.workspaceFiles.writeFile>>;
		try {
			result = await window.piDesktop.workspaceFiles.writeFile({
				projectId,
				relativePath: tab.relativePath,
				content: savedBuffer,
			});
		} catch (error) {
			if (isLoadCurrent(generation, projectId)) {
				setState((current) => setSaveStatus(current, "error", errorMessageFor(error)));
			}
			return;
		}
		if (!isLoadCurrent(generation, projectId)) {
			return;
		}
		if (!result.ok) {
			setState((current) => setSaveStatus(current, "error", result.error.message));
			return;
		}
		const currentTab = stateRef.current.tabs.find((candidate) => candidate.id === tab.id);
		if (!currentTab || currentTab.buffer !== savedBuffer) {
			setState((current) => setSaveStatus(current, "idle"));
			return;
		}
		setState((current) => markFileSaved(current, tab.id, savedBuffer));
	}, [isLoadCurrent, project]);

	const value = useMemo<FileWorkspaceContextValue>(
		() => ({
			project,
			state,
			activeTab: getActiveFileTab(state),
			toggleDirectory,
			selectExplorerItem,
			openDiff: (input) => {
				setState((current) => {
					const next = openDiffTab(current, input);
					if (next.activeTabId) {
						selectWorkspaceTab(next.activeTabId);
					}
					return next;
				});
			},
			setActiveTab: (tabId) => {
				setState((current) => setActiveFileTab(current, tabId));
				selectWorkspaceTab(tabId);
			},
			closeTab,
			updateBuffer: (tabId, buffer) => setState((current) => updateFileBuffer(current, tabId, buffer)),
			setViewMode: (tabId, viewMode) => setState((current) => setFileViewMode(current, tabId, viewMode)),
			saveActiveFile,
			retryLoadDirectory: (relativePath) => {
				void loadDirectory(relativePath);
			},
		}),
		[
			closeTab,
			loadDirectory,
			project,
			saveActiveFile,
			selectExplorerItem,
			selectWorkspaceTab,
			state,
			toggleDirectory,
		],
	);

	return <FileWorkspaceContext.Provider value={value}>{children}</FileWorkspaceContext.Provider>;
}

export const useFileWorkspace = (): FileWorkspaceContextValue => {
	const context = useContext(FileWorkspaceContext);
	if (!context) {
		throw new Error("useFileWorkspace must be used within FileWorkspaceProvider");
	}
	return context;
};
