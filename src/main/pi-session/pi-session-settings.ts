import {
	type AgentSession,
	createAgentSessionServices,
	type ModelRegistry,
	type SettingsManager,
} from "@earendil-works/pi-coding-agent";
import type {
	PiSessionModelOption,
	PiSessionQueuedMessage,
	PiSessionQueuedMessageId,
	PiSessionSettingsPayload,
	PiSessionThinkingLevel,
} from "../../shared/pi-session";
import { resolvePiAgentDir } from "../app-paths";

const thinkingLevels: readonly PiSessionThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh"];

const modelLabelFor = (model: { name?: string; id: string } | undefined): string => {
	if (!model) {
		return "No model";
	}
	return model.name?.trim() || model.id;
};

const toThinkingLevel = (level: string): PiSessionThinkingLevel =>
	thinkingLevels.includes(level as PiSessionThinkingLevel) ? (level as PiSessionThinkingLevel) : "off";

export const createQueuedMessageId = (queue: "steer" | "followUp", index: number): PiSessionQueuedMessageId => ({
	queue,
	index,
});

export const buildQueuedMessages = (
	steering: readonly string[],
	followUp: readonly string[],
): PiSessionQueuedMessage[] => [
	...steering.map((text, index) => ({
		id: createQueuedMessageId("steer", index),
		text,
		delivery: "steer" as const,
	})),
	...followUp.map((text, index) => ({
		id: createQueuedMessageId("followUp", index),
		text,
		delivery: "followUp" as const,
	})),
];

const buildModelOptions = async (modelRegistry: ModelRegistry): Promise<PiSessionModelOption[]> => {
	const available = await modelRegistry.getAvailable();
	return available.map((model) => ({
		provider: model.provider,
		id: model.id,
		label: modelLabelFor(model),
	}));
};

const buildSettingsPayload = async (input: {
	model: AgentSession["model"] | undefined;
	thinkingLevel: string;
	getAvailableThinkingLevels: () => string[];
	modelRegistry: ModelRegistry;
}): Promise<PiSessionSettingsPayload> => {
	const availableThinkingLevels = input
		.getAvailableThinkingLevels()
		.map((level) => toThinkingLevel(level))
		.filter((level, index, levels) => levels.indexOf(level) === index);

	return {
		modelLabel: modelLabelFor(input.model),
		modelProvider: input.model?.provider ?? null,
		modelId: input.model?.id ?? null,
		thinkingLevel: toThinkingLevel(input.thinkingLevel),
		availableModels: await buildModelOptions(input.modelRegistry),
		availableThinkingLevels: availableThinkingLevels.length > 0 ? availableThinkingLevels : [...thinkingLevels],
	};
};

export const buildSettingsFromAgentSession = async (session: AgentSession): Promise<PiSessionSettingsPayload> =>
	buildSettingsPayload({
		model: session.model,
		thinkingLevel: session.thinkingLevel,
		getAvailableThinkingLevels: () => session.getAvailableThinkingLevels(),
		modelRegistry: session.modelRegistry,
	});

type DefaultSettingsServices = {
	settingsManager: SettingsManager;
	modelRegistry: ModelRegistry;
};

const resolveDefaultServices = async (
	workspacePath: string | undefined,
	env?: NodeJS.ProcessEnv,
): Promise<DefaultSettingsServices> => {
	const cwd = workspacePath ?? process.cwd();
	const agentDir = resolvePiAgentDir(env);
	const services = await createAgentSessionServices({ cwd, agentDir });
	return {
		settingsManager: services.settingsManager,
		modelRegistry: services.modelRegistry,
	};
};

export const buildDefaultSettings = async (input?: {
	workspacePath?: string;
	env?: NodeJS.ProcessEnv;
}): Promise<PiSessionSettingsPayload> => {
	const { settingsManager, modelRegistry } = await resolveDefaultServices(input?.workspacePath, input?.env);
	const provider = settingsManager.getDefaultProvider();
	const modelId = settingsManager.getDefaultModel();
	const model =
		provider && modelId
			? (modelRegistry.find(provider, modelId) ?? undefined)
			: (await modelRegistry.getAvailable())[0];
	const thinkingLevel = settingsManager.getDefaultThinkingLevel() ?? "off";

	return buildSettingsPayload({
		model,
		thinkingLevel,
		getAvailableThinkingLevels: () => [...thinkingLevels],
		modelRegistry,
	});
};

export const setDefaultModel = async (input: {
	workspacePath?: string;
	provider: string;
	modelId: string;
	env?: NodeJS.ProcessEnv;
}): Promise<PiSessionSettingsPayload> => {
	const { settingsManager, modelRegistry } = await resolveDefaultServices(input.workspacePath, input.env);
	const model = modelRegistry.find(input.provider, input.modelId);
	if (!model) {
		throw new Error(`Model not found: ${input.provider}/${input.modelId}`);
	}
	if (!modelRegistry.hasConfiguredAuth(model)) {
		throw new Error(`No API key for ${model.provider}/${model.id}`);
	}
	settingsManager.setDefaultModelAndProvider(model.provider, model.id);
	return buildDefaultSettings({ workspacePath: input.workspacePath, env: input.env });
};

export const setDefaultThinkingLevel = async (input: {
	workspacePath?: string;
	level: PiSessionThinkingLevel;
	env?: NodeJS.ProcessEnv;
}): Promise<PiSessionSettingsPayload> => {
	const { settingsManager, modelRegistry } = await resolveDefaultServices(input.workspacePath, input.env);
	settingsManager.setDefaultThinkingLevel(input.level);
	const provider = settingsManager.getDefaultProvider();
	const modelId = settingsManager.getDefaultModel();
	const model =
		provider && modelId
			? (modelRegistry.find(provider, modelId) ?? undefined)
			: (await modelRegistry.getAvailable())[0];
	return buildSettingsPayload({
		model,
		thinkingLevel: input.level,
		getAvailableThinkingLevels: () => [...thinkingLevels],
		modelRegistry,
	});
};
