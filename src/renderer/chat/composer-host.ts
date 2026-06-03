import type {
	PiSessionDelivery,
	PiSessionImageContent,
	PiSessionQueuedMessage,
	PiSessionQueuedMessageId,
} from "../../shared/pi-session";
import type { CommandPaletteDeps } from "./build-command-palette-entries";

export type ComposerHostProps = {
	onSubmitPrompt: (
		prompt: string,
		delivery?: PiSessionDelivery,
		images?: PiSessionImageContent[],
	) => Promise<boolean> | boolean;
	onSelectProject: (projectId: string) => void;
	onSelectModel: (provider: string, modelId: string) => void;
	onSelectThinkingLevel: (level: string) => void;
	onToggleQueuedDelivery: (messageId: PiSessionQueuedMessageId) => void;
	onRemoveQueuedMessage: (messageId: PiSessionQueuedMessageId) => void;
	onEditQueuedMessage: (message: PiSessionQueuedMessage) => void;
	pendingComposerDelivery: PiSessionDelivery;
	composerDraft: string;
	onComposerDraftApplied: () => void;
	commandPaletteDeps?: CommandPaletteDeps;
};
