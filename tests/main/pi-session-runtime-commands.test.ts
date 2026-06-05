import { describe, expect, it } from "vitest";
import { buildPiRuntimeCommandMetadata } from "../../src/main/pi-session/pi-session-runtime-commands";
import { PiSessionRuntimeCommandsPayloadSchema } from "../../src/shared/pi-session-commands";

const projectSource = {
	path: "/workspace/.pi/prompts/review.md",
	source: "project",
	scope: "project",
	origin: "top-level",
} as const;

const extensionSource = {
	path: "/workspace/.pi/extensions/demo.ts",
	source: "demo-extension",
	scope: "project",
	origin: "top-level",
} as const;

const userSource = {
	path: "/Users/me/.pi/skills/summarize/SKILL.md",
	source: "user",
	scope: "user",
	origin: "top-level",
	baseDir: "/Users/me/.pi/skills/summarize",
} as const;

describe("pi session runtime commands", () => {
	it("models extension, prompt-template, and skill command metadata from Pi runtime resources", () => {
		const payload = buildPiRuntimeCommandMetadata({
			commands: [
				{
					name: "demo:run",
					description: "Run the demo extension command",
					source: "extension",
					sourceInfo: extensionSource,
				},
				{
					name: "review",
					description: "Review the current change set",
					source: "prompt",
					sourceInfo: projectSource,
				},
				{
					name: "skill:summarize",
					description: "Summarize a code path",
					source: "skill",
					sourceInfo: userSource,
				},
			],
			promptTemplates: [
				{
					name: "review",
					argumentHint: "[path]",
				},
			],
			skills: [
				{
					name: "summarize",
					disableModelInvocation: false,
				},
			],
		});

		expect(PiSessionRuntimeCommandsPayloadSchema.parse(payload).commands).toEqual([
			{
				id: "runtime-command:demo:run",
				title: "demo:run",
				slashCommand: "demo:run",
				source: "extension",
				description: "Run the demo extension command",
				argumentHint: undefined,
				scope: "project",
				provenance: {
					path: "/workspace/.pi/extensions/demo.ts",
					source: "demo-extension",
					origin: "top-level",
					baseDir: undefined,
				},
				availability: { state: "available", reason: undefined },
			},
			{
				id: "runtime-command:review",
				title: "review",
				slashCommand: "review",
				source: "prompt-template",
				description: "Review the current change set",
				argumentHint: "[path]",
				scope: "project",
				provenance: {
					path: "/workspace/.pi/prompts/review.md",
					source: "project",
					origin: "top-level",
					baseDir: undefined,
				},
				availability: { state: "available", reason: undefined },
			},
			{
				id: "runtime-command:skill:summarize",
				title: "skill:summarize",
				slashCommand: "skill:summarize",
				source: "skill",
				description: "Summarize a code path",
				argumentHint: "[instructions]",
				scope: "user",
				provenance: {
					path: "/Users/me/.pi/skills/summarize/SKILL.md",
					source: "user",
					origin: "top-level",
					baseDir: "/Users/me/.pi/skills/summarize",
				},
				availability: { state: "available", reason: undefined },
			},
		]);
	});

	it("marks skills unavailable when Pi reports the command without a loadable skill", () => {
		const payload = buildPiRuntimeCommandMetadata({
			commands: [
				{
					name: "skill:missing",
					description: "Missing skill",
					source: "skill",
					sourceInfo: userSource,
				},
			],
			promptTemplates: [],
			skills: [],
		});

		expect(payload.commands[0]).toMatchObject({
			source: "skill",
			availability: {
				state: "unavailable",
				reason: "Skill metadata is unavailable for this command.",
			},
		});
	});
});
