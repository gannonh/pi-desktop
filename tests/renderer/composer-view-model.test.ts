import { describe, expect, it } from "vitest";
import {
	formatQueuedMessageDeliveryLabel,
	formatQueuedMessageSwitchLabel,
	formatQueueStatusLabel,
	mapComposerBlockedReason,
} from "../../src/renderer/chat/composer-view-model";
import { createInitialSessionState } from "../../src/renderer/session/session-state";
import type { ProjectStateView } from "../../src/shared/project-state";

const emptyView: ProjectStateView = {
	projects: [],
	standaloneChats: [],
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
};

describe("composer view model helpers", () => {
	it("maps auth failures into composer blocked reasons", () => {
		expect(
			mapComposerBlockedReason({
				projectState: emptyView,
				session: { ...createInitialSessionState(), errorMessage: "No API key for openai/gpt-5.5" },
				routeKind: "project-start",
			}),
		).toBe("No API key for openai/gpt-5.5");
	});

	it("labels queued delivery and switch actions separately", () => {
		expect(formatQueuedMessageDeliveryLabel("followUp")).toBe("Follow-up");
		expect(formatQueuedMessageSwitchLabel("followUp")).toBe("Switch to steering");
		expect(formatQueuedMessageDeliveryLabel("steer")).toBe("Steering");
		expect(formatQueuedMessageSwitchLabel("steer")).toBe("Switch to follow-up");
	});

	it("formats queue status labels without interrupt wording", () => {
		expect(
			formatQueueStatusLabel([
				{ id: { queue: "steer", index: 0 }, text: "Fix tests", delivery: "steer" },
				{ id: { queue: "followUp", index: 0 }, text: "After", delivery: "followUp" },
			]),
		).toBe("2 queued");
	});
});
