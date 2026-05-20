import { describe, expect, it } from "vitest";
import { resolveComposerEnterAction } from "../../src/renderer/chat/composer-enter-key";

const base = {
	key: "Enter",
	shiftKey: false,
	altKey: false,
	running: false,
	showSendWhileRunning: false,
	sendDisabled: false,
};

describe("resolveComposerEnterAction", () => {
	it("submits on plain Enter when send is enabled", () => {
		expect(resolveComposerEnterAction({ ...base, sendDisabled: false })).toBe("submit");
	});

	it("does nothing on Enter when send is disabled", () => {
		expect(resolveComposerEnterAction({ ...base, sendDisabled: true })).toBe("none");
	});

	it("inserts a newline on Shift+Enter", () => {
		expect(resolveComposerEnterAction({ ...base, shiftKey: true })).toBe("newline");
	});

	it("queues follow-up on Option+Enter while running", () => {
		expect(resolveComposerEnterAction({ ...base, altKey: true, running: true })).toBe("followUp");
	});

	it("submits on Enter while running when send-while-running is active", () => {
		expect(
			resolveComposerEnterAction({
				...base,
				running: true,
				showSendWhileRunning: true,
			}),
		).toBe("submit");
	});
});
