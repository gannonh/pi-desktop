import { describe, expect, it } from "vitest";
import {
	getStatusMessageAutoDismissMs,
	getStatusMessageClassName,
	retainStatusMessageAfterProjectStateResult,
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

		expect(getStatusMessageAutoDismissMs(message)).toBe(10000);
	});

	it("keeps pending messages visible until the action resolves", () => {
		const message: StatusMessage = {
			source: "project",
			tone: "pending",
			message: "Forking session…",
		};

		expect(getStatusMessageClassName(message)).toBe(
			"project-main__status-message project-main__status-message--pending",
		);
		expect(getStatusMessageAutoDismissMs(message)).toBeNull();
	});

	it("retains pending project messages after unrelated project-state refreshes", () => {
		const message: StatusMessage = {
			source: "project",
			tone: "pending",
			message: "Starting new session…",
			scope: { projectId: "project:one", chatId: "chat:one" },
		};

		expect(retainStatusMessageAfterProjectStateResult(message)).toBe(message);
	});

	it("clears completed project messages after project-state refreshes", () => {
		const message: StatusMessage = {
			source: "project",
			tone: "success",
			message: "Started new session.",
			scope: { projectId: "project:one", chatId: "chat:one" },
		};

		expect(retainStatusMessageAfterProjectStateResult(message)).toBeUndefined();
	});
});
