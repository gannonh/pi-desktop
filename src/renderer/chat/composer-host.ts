import type { PiSessionDelivery, PiSessionQueuedMessage, PiSessionQueuedMessageId } from "../../shared/pi-session";

export type ComposerHostProps = {
	onSubmitPrompt: (prompt: string, delivery?: PiSessionDelivery) => Promise<boolean> | boolean;
	onSelectProject: (projectId: string) => void;
	onSelectModel: (provider: string, modelId: string) => void;
	onSelectThinkingLevel: (level: string) => void;
	onToggleQueuedDelivery: (messageId: PiSessionQueuedMessageId) => void;
	onRemoveQueuedMessage: (messageId: PiSessionQueuedMessageId) => void;
	onEditQueuedMessage: (message: PiSessionQueuedMessage) => void;
	pendingComposerDelivery: PiSessionDelivery;
	composerDraft: string;
	onComposerDraftApplied: () => void;
};

export type { ComposerHostProps as ComposerInteractions };
