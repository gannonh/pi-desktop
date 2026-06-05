import { createContext, useContext } from "react";

export type PendingChatRename = {
	projectId: string;
	chatId: string;
};

type ProjectSidebarPendingRenameContextValue = {
	pendingRename: PendingChatRename | null;
	clearPendingRename: () => void;
};

export const ProjectSidebarPendingRenameContext = createContext<ProjectSidebarPendingRenameContextValue | null>(null);

export function useProjectSidebarPendingRename(): ProjectSidebarPendingRenameContextValue | null {
	return useContext(ProjectSidebarPendingRenameContext);
}
