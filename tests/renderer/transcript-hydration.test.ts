import { describe, expect, it } from "vitest";
import {
	createErrorTranscriptHydration,
	createIdleTranscriptHydration,
	createLoadedTranscriptHydration,
	createLoadingTranscriptHydration,
	isTranscriptHydrationForScope,
} from "../../src/renderer/session/transcript-hydration";

describe("transcript hydration", () => {
	it("tracks loading and loaded states for a scope", () => {
		const scope = { projectId: "project:one", chatId: "chat:one" };
		const loading = createLoadingTranscriptHydration(scope);
		const loaded = createLoadedTranscriptHydration(scope);

		expect(loading.status).toBe("loading");
		expect(loaded.status).toBe("loaded");
		expect(isTranscriptHydrationForScope(loading, scope)).toBe(true);
		expect(isTranscriptHydrationForScope(loading, { projectId: "project:two", chatId: "chat:one" })).toBe(false);
	});

	it("creates idle and error states", () => {
		const scope = { projectId: null, chatId: null };
		expect(createIdleTranscriptHydration().status).toBe("idle");
		const error = createErrorTranscriptHydration(scope, "Failed");
		expect(error.status).toBe("error");
		if (error.status === "error") {
			expect(error.errorMessage).toBe("Failed");
		}
	});
});
