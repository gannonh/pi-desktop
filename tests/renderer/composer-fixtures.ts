import type { ComposerContext } from "../../src/renderer/chat/chat-view-model";
import type { PiSessionSettingsPayload } from "../../src/shared/pi-session";
import { createInitialSessionState } from "../../src/renderer/session/session-state";

export const previewComposerSettings: PiSessionSettingsPayload = {
	modelLabel: "5.5 High",
	modelProvider: "openai",
	modelId: "gpt-5.5",
	thinkingLevel: "high",
	availableModels: [{ provider: "openai", id: "gpt-5.5", label: "5.5 High" }],
	availableThinkingLevels: ["off", "low", "medium", "high"],
};

export const idleSession = createInitialSessionState();

export const createComposerContext = (overrides: Partial<ComposerContext> = {}): ComposerContext => ({
	projectSelectorLabel: "Work in a project",
	modeLabel: "Work locally",
	modelLabel: "No model",
	thinkingLabel: "Off",
	runtimeAvailable: true,
	disabledReason: "",
	showProjectMenu: false,
	projectOptions: [],
	modelOptions: [],
	thinkingOptions: [],
	...overrides,
});

export const createComposerHost = () => ({
	onSubmitPrompt: async () => true,
	onSelectProject: () => {},
	onSelectModel: () => {},
	onSelectThinkingLevel: () => {},
	onToggleQueuedDelivery: () => {},
	onRemoveQueuedMessage: () => {},
	onEditQueuedMessage: () => {},
	pendingComposerDelivery: "steer" as const,
	composerDraft: "",
	onComposerDraftApplied: () => {},
});
