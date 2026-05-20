import { describe, expect, it } from "vitest";
import { createComposerState } from "../../src/renderer/chat/composer-state";

describe("createComposerState", () => {
	it("disables send when text is empty so empty prompts cannot be submitted", () => {
		expect(createComposerState({ text: "", runtimeAvailable: true, disabledReason: "" })).toEqual({
			sendDisabled: true,
			showSendWhileRunning: false,
			statusLabel: "",
		});
	});

	it("enables send when text exists and runtime is available", () => {
		expect(
			createComposerState({
				text: "Review this project",
				runtimeAvailable: true,
				disabledReason: "",
			}),
		).toEqual({
			sendDisabled: false,
			showSendWhileRunning: false,
			statusLabel: "",
		});
	});

	it("enables send while running when text is present", () => {
		expect(
			createComposerState({
				text: "Steer this",
				runtimeAvailable: true,
				disabledReason: "",
				running: true,
			}),
		).toEqual({
			sendDisabled: false,
			showSendWhileRunning: true,
			statusLabel: "",
		});
	});

	it("disables send and exposes the runtime reason when runtime is unavailable", () => {
		expect(
			createComposerState({
				text: "Review this project",
				runtimeAvailable: false,
				disabledReason: "Pi runtime unavailable until Milestone 3.",
			}),
		).toEqual({
			sendDisabled: true,
			showSendWhileRunning: false,
			statusLabel: "Pi runtime unavailable until Milestone 3.",
		});
	});

	it("trims whitespace before deciding whether send is available", () => {
		expect(createComposerState({ text: "   ", runtimeAvailable: true, disabledReason: "" })).toEqual({
			sendDisabled: true,
			showSendWhileRunning: false,
			statusLabel: "",
		});
	});
});
