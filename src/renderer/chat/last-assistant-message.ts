import type { LiveSessionMessage } from "../session/session-state";

export function getLastAssistantMessageContent(messages: readonly LiveSessionMessage[]): string | null {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message.role !== "assistant") {
			continue;
		}
		const content = message.content.trim();
		if (content.length > 0) {
			return message.content;
		}
	}
	return null;
}
