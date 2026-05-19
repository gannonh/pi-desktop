import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TranscriptPanel } from "../../src/renderer/components/transcript-panel";
import { createInitialSessionState } from "../../src/renderer/session/session-state";
import {
	createErrorTranscriptHydration,
	createLoadedTranscriptHydration,
	createLoadingTranscriptHydration,
} from "../../src/renderer/session/transcript-hydration";

const scope = { projectId: "project:one", chatId: "chat:one" };

describe("TranscriptPanel", () => {
	it("renders the live transcript while history hydrates when the session already has output", () => {
		const markup = renderToStaticMarkup(
			createElement(TranscriptPanel, {
				session: {
					...createInitialSessionState(),
					status: "running",
					messages: [{ id: "assistant:1", role: "assistant", content: "Working…", streaming: true }],
				},
				hydration: createLoadingTranscriptHydration(scope),
				scope,
				expectHistory: true,
			}),
		);

		expect(markup).toContain("Pi session transcript");
		expect(markup).not.toContain("Loading conversation");
	});

	it("renders a loading placeholder while history hydrates", () => {
		const markup = renderToStaticMarkup(
			createElement(TranscriptPanel, {
				session: createInitialSessionState(),
				hydration: createLoadingTranscriptHydration(scope),
				scope,
				expectHistory: true,
			}),
		);

		expect(markup).toContain("Loading conversation");
	});

	it("renders a hydration error in the transcript panel", () => {
		const markup = renderToStaticMarkup(
			createElement(TranscriptPanel, {
				session: createInitialSessionState(),
				hydration: createErrorTranscriptHydration(scope, "History failed"),
				scope,
				expectHistory: true,
			}),
		);

		expect(markup).toContain("History failed");
	});

	it("renders the default history error when no message is provided", () => {
		const markup = renderToStaticMarkup(
			createElement(TranscriptPanel, {
				session: createInitialSessionState(),
				hydration: createErrorTranscriptHydration(scope, ""),
				scope,
				expectHistory: true,
			}),
		);

		expect(markup).toContain("Unable to load conversation history.");
	});

	it("renders the live transcript when messages are present", () => {
		const markup = renderToStaticMarkup(
			createElement(TranscriptPanel, {
				session: {
					...createInitialSessionState(),
					messages: [{ id: "assistant:1", role: "assistant", content: "Hello", streaming: false }],
				},
				hydration: createLoadedTranscriptHydration(scope),
				scope,
				expectHistory: true,
			}),
		);

		expect(markup).toContain("Pi session transcript");
		expect(markup).toContain("Hello");
	});
});
