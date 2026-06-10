import { completeSimple } from "@earendil-works/pi-ai";
import { createAgentSessionServices } from "@earendil-works/pi-coding-agent";
import { resolvePiAgentDir } from "../app-paths";

export class SourceControlGenerationCancelledError extends Error {
	constructor() {
		super("Generation was cancelled.");
		this.name = "SourceControlGenerationCancelledError";
	}
}

export type SourceControlTextGeneratorInput = {
	workspacePath: string;
	systemPrompt: string;
	userPrompt: string;
	signal: AbortSignal;
	env?: NodeJS.ProcessEnv;
};

export type SourceControlTextGenerator = {
	generate: (input: SourceControlTextGeneratorInput) => Promise<string>;
};

const assertNotAborted = (signal: AbortSignal): void => {
	if (signal.aborted) {
		throw new SourceControlGenerationCancelledError();
	}
};

const extractText = (content: Array<{ type?: string; text?: string }>): string =>
	content
		.filter(
			(block): block is { type: "text"; text: string } => block.type === "text" && typeof block.text === "string",
		)
		.map((block) => block.text)
		.join("\n")
		.trim();

export const createPiSourceControlTextGenerator = (deps?: { env?: NodeJS.ProcessEnv }): SourceControlTextGenerator => ({
	generate: async ({ workspacePath, systemPrompt, userPrompt, signal, env = deps?.env }) => {
		assertNotAborted(signal);

		const agentDir = resolvePiAgentDir(env);
		const services = await createAgentSessionServices({ cwd: workspacePath, agentDir });
		const provider = services.settingsManager.getDefaultProvider();
		const modelId = services.settingsManager.getDefaultModel();
		const model =
			provider && modelId
				? (services.modelRegistry.find(provider, modelId) ?? undefined)
				: (await services.modelRegistry.getAvailable())[0];

		if (!model) {
			throw new Error("No Pi model is configured for this project.");
		}
		if (!services.modelRegistry.hasConfiguredAuth(model)) {
			throw new Error(`No API key for ${model.provider}/${model.id}.`);
		}

		const auth = await services.modelRegistry.getApiKeyAndHeaders(model);
		if (!auth.ok) {
			throw new Error(auth.error);
		}

		assertNotAborted(signal);

		const response = await completeSimple(
			model,
			{
				systemPrompt,
				messages: [
					{
						role: "user",
						content: [{ type: "text", text: userPrompt }],
						timestamp: Date.now(),
					},
				],
			},
			{
				apiKey: auth.apiKey,
				headers: auth.headers,
				signal,
				maxTokens: 1024,
			},
		);

		assertNotAborted(signal);

		const text = extractText(response.content);
		if (!text) {
			throw new Error("Pi returned an empty generation result.");
		}
		return text;
	},
});

export type SourceControlGenerationRegistry = {
	start: (requestId: string) => AbortController;
	cancel: (requestId: string) => boolean;
	finish: (requestId: string) => void;
};

export const createSourceControlGenerationRegistry = (): SourceControlGenerationRegistry => {
	const active = new Map<string, AbortController>();

	return {
		start(requestId) {
			const existing = active.get(requestId);
			existing?.abort();
			const controller = new AbortController();
			active.set(requestId, controller);
			return controller;
		},
		cancel(requestId) {
			const controller = active.get(requestId);
			if (!controller) {
				return false;
			}
			controller.abort();
			active.delete(requestId);
			return true;
		},
		finish(requestId) {
			active.delete(requestId);
		},
	};
};
