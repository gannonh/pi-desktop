import { describe, expect, it } from "vitest";
import { createComposerState } from "../../src/renderer/chat/composer-state";

describe("createComposerState", () => {
	it("disables send when text is empty so empty prompts cannot be submitted", () => {
		expect(createComposerState({ text: "", runtimeAvailable: true })).toEqual({
			sendDisabled: true,
		});
	});

	it("enables send when text exists and runtime is available", () => {
		expect(createComposerState({ text: "Review this project", runtimeAvailable: true })).toEqual({
			sendDisabled: false,
		});
	});

	it("disables send when runtime is unavailable", () => {
		expect(
			createComposerState({
				text: "Review this project",
				runtimeAvailable: false,
			}),
		).toEqual({
			sendDisabled: true,
		});
	});

	it("trims whitespace before deciding whether send is available", () => {
		expect(createComposerState({ text: "   ", runtimeAvailable: true })).toEqual({
			sendDisabled: true,
		});
	});
});
