export type StartChatRenameResult = "started" | "chat-not-found";

export type ProjectSidebarActions = {
	startChatRename: (projectId: string, chatId: string) => StartChatRenameResult;
};
