import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ProjectRecord } from "../../shared/project-state";
import {
	applyFileLoadError,
	applyFileLoadResult,
	closeFileTab,
	createInitialFileWorkspaceState,
	getActiveFileTab,
	markFileSaved,
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
import type { FileViewMode, FileWorkspaceState } from "./file-workspace-types";

type FileWorkspaceContextValue = {
	project: ProjectRecord | null;
	state: FileWorkspaceState;
	activeTab: ReturnType<typeof getActiveFileTab>;
	toggleDirectory: (relativePath: string) => void;
	selectExplorerItem: (relativePath: string, kind: "file" | "directory") => void;
	setActiveTab: (tabId: string) => void;
	closeTab: (tabId: string, force?: boolean) => boolean;
	updateBuffer: (tabId: string, buffer: string) => void;
	setViewMode: (tabId: string, viewMode: FileViewMode) => void;
	saveActiveFile: () => Promise<void>;
	retryLoadDirectory: (relativePath: string) => void;
};

const FileWorkspaceContext = createContext<FileWorkspaceContextValue | null>(null);

const confirmDiscard = (titles: string[]) => {
	if (titles.length === 0) {
		return true;
	}
	return window.confirm(`Discard unsaved changes in ${titles.join(", ")}?`);
};

interface FileWorkspaceProviderProps {
	project: ProjectRecord | null;
	children: ReactNode;
}

export function FileWorkspaceProvider({ project, children }: FileWorkspaceProviderProps) {
	const [state, setState] = useState<FileWorkspaceState>(() => createInitialFileWorkspaceState());
	const projectIdRef = useRef<string | null>(project?.id ?? null);

	useEffect(() => {
		if (projectIdRef.current === (project?.id ?? null)) {
			return;
		}
		projectIdRef.current = project?.id ?? null;
		setState(resetFileWorkspaceState());
	}, [project?.id]);

	const loadDirectory = useCallback(
		async (relativePath: string) => {
			if (!project || project.availability.status !== "available") {
				return;
			}

			setState((current) => setDirectoryLoading(current, relativePath));
			const result = await window.piDesktop.workspaceFiles.listDirectory({
				projectId: project.id,
				relativePath,
			});
			if (!result.ok) {
				setState((current) => setDirectoryError(current, relativePath, result.error.message));
				return;
			}
			setState((current) => setDirectoryLoaded(current, relativePath, result.data.entries));
		},
		[project],
	);

	const loadFile = useCallback(
		async (relativePath: string) => {
			if (!project || project.availability.status !== "available") {
				return;
			}

			const result = await window.piDesktop.workspaceFiles.readFile({
				projectId: project.id,
				relativePath,
			});
			if (!result.ok) {
				setState((current) => applyFileLoadError(current, relativePath, result.error.message));
				return;
			}
			setState((current) => applyFileLoadResult(current, relativePath, result.data));
		},
		[project],
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

	const selectExplorerItem = useCallback(
		(relativePath: string, kind: "file" | "directory") => {
			if (kind === "directory") {
				toggleDirectory(relativePath);
				setState((current) => selectExplorerPath(current, relativePath));
				return;
			}

			setState((current) => openFileTab(current, relativePath));
			void loadFile(relativePath);
		},
		[loadFile, toggleDirectory],
	);

	const closeTab = useCallback(
		(tabId: string, force = false) => {
			const tab = state.tabs.find((candidate) => candidate.id === tabId);
			if (!tab) {
				return false;
			}
			if (!force && tab.dirty && !confirmDiscard([tab.title])) {
				return false;
			}
			setState((current) => closeFileTab(current, tabId));
			return true;
		},
		[state.tabs],
	);

	const saveActiveFile = useCallback(async () => {
		const tab = getActiveFileTab(state);
		if (!project || !tab || tab.readOnly || !tab.dirty) {
			return;
		}

		setState((current) => setSaveStatus(current, "saving"));
		const result = await window.piDesktop.workspaceFiles.writeFile({
			projectId: project.id,
			relativePath: tab.relativePath,
			content: tab.buffer,
		});
		if (!result.ok) {
			setState((current) => setSaveStatus(current, "error", result.error.message));
			return;
		}
		setState((current) => markFileSaved(current, tab.id, tab.buffer));
	}, [project, state]);

	const value = useMemo<FileWorkspaceContextValue>(
		() => ({
			project,
			state,
			activeTab: getActiveFileTab(state),
			toggleDirectory,
			selectExplorerItem,
			setActiveTab: (tabId) => setState((current) => setActiveFileTab(current, tabId)),
			closeTab,
			updateBuffer: (tabId, buffer) => setState((current) => updateFileBuffer(current, tabId, buffer)),
			setViewMode: (tabId, viewMode) => setState((current) => setFileViewMode(current, tabId, viewMode)),
			saveActiveFile,
			retryLoadDirectory: (relativePath) => {
				void loadDirectory(relativePath);
			},
		}),
		[closeTab, loadDirectory, project, saveActiveFile, selectExplorerItem, state, toggleDirectory],
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
