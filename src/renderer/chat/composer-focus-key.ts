export function formatComposerFocusKey(scope: { projectId: string | null; chatId: string | null }): string {
	return `${scope.projectId ?? "standalone"}:${scope.chatId ?? "none"}`;
}
