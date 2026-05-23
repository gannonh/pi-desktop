export const FILE_WORKSPACE_VIEW_ID = "file-workspace:view";

export const isWorkspaceFileTabId = (tabId: string | null | undefined): boolean =>
	tabId !== null && tabId !== undefined && (tabId.startsWith("file:") || tabId === FILE_WORKSPACE_VIEW_ID);
