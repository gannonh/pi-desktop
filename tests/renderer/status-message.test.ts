import { describe, expect, it } from "vitest";
import {
	getStatusMessageAutoDismissMs,
	getStatusMessageClassName,
	retainStatusMessageForSelection,
	type StatusMessage,
} from "../../src/renderer/status-message";

describe("status messages", () => {
	it("styles output copy success separately from destructive errors", () => {
		const message: StatusMessage = {
			source: "output",
			tone: "success",
			message: "Copied the last assistant message to the clipboard.",
		};

		expect(getStatusMessageClassName(message)).toBe(
			"project-main__status-message project-main__status-message--success",
		);
	});

	it("retains global startup errors across selection changes", () => {
		const message: StatusMessage = {
			source: "startup",
			tone: "error",
			message: "Unable to read Pi version.",
		};

		expect(retainStatusMessageForSelection(message, { projectId: "project:next", chatId: "chat:next" })).toBe(
			message,
		);
	});

	it("clears scoped output success after switching chats", () => {
		const message: StatusMessage = {
			source: "output",
			tone: "success",
			message: "Copied the last assistant message to the clipboard.",
			scope: { projectId: "project:one", chatId: "chat:one" },
		};

		expect(
			retainStatusMessageForSelection(message, { projectId: "project:one", chatId: "chat:two" }),
		).toBeUndefined();
	});

	it("auto-dismisses success messages", () => {
		const message: StatusMessage = {
			source: "project",
			tone: "success",
			message: "Forked session.",
			scope: { projectId: "project:one", chatId: "chat:one" },
		};

		expect(getStatusMessageAutoDismissMs(message)).toBe(4000);
	});
});
