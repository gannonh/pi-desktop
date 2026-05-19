import { describe, expect, it } from "vitest";
import { formatChatDisplayLabel } from "../../src/shared/format-chat-display-label";

describe("formatChatDisplayLabel", () => {
	it("formats Pi skill invocation prefixes", () => {
		expect(
			formatChatDisplayLabel(
				'<skill name="kata-progress" location="/Users/gannonhall/.agents/skills/kata-progress/SKILL.md">',
			),
		).toBe("Skill: kata-progress");
	});

	it("formats truncated skill invocation titles", () => {
		expect(
			formatChatDisplayLabel('‹skill name="kata-progress" location="/Users/gannonhall/.agents/skills/kata-p'),
		).toBe("Skill: kata-progress");
	});

	it("formats compact skill labels", () => {
		expect(formatChatDisplayLabel("[skill] kata-progress")).toBe("Skill: kata-progress");
	});

	it("leaves ordinary chat titles unchanged", () => {
		expect(formatChatDisplayLabel("Plan project home milestone")).toBe("Plan project home milestone");
	});

	it("does not relabel titles that only mention a skill tag later in the string", () => {
		expect(formatChatDisplayLabel('Notes about <skill name="kata-progress"> work')).toBe(
			'Notes about <skill name="kata-progress"> work',
		);
	});

	it("does not double-format skill labels", () => {
		expect(formatChatDisplayLabel("Skill: kata-progress")).toBe("Skill: kata-progress");
	});
});
