import type { SlashCommandInfo, SourceInfo } from "@earendil-works/pi-coding-agent";
import type { PiSessionRuntimeCommand, PiSessionRuntimeCommandsPayload } from "../../shared/pi-session-commands";

type PromptTemplateMetadata = {
	name: string;
	argumentHint?: string;
};

type SkillMetadata = {
	name: string;
	disableModelInvocation: boolean;
};

interface BuildPiRuntimeCommandMetadataInput {
	sessionId?: string;
	commands: readonly SlashCommandInfo[];
	promptTemplates: readonly PromptTemplateMetadata[];
	skills: readonly SkillMetadata[];
}

export function buildPiRuntimeCommandMetadata({
	sessionId,
	commands,
	promptTemplates,
	skills,
}: BuildPiRuntimeCommandMetadataInput): PiSessionRuntimeCommandsPayload {
	return {
		sessionId,
		commands: commands.map((command) =>
			toRuntimeCommand({
				command,
				promptTemplate: promptTemplates.find((template) => template.name === command.name),
				skill: skills.find((skill) => `skill:${skill.name}` === command.name),
			}),
		),
	};
}

function toRuntimeCommand({
	command,
	promptTemplate,
	skill,
}: {
	command: SlashCommandInfo;
	promptTemplate: PromptTemplateMetadata | undefined;
	skill: SkillMetadata | undefined;
}): PiSessionRuntimeCommand {
	const source = command.source === "prompt" ? "prompt-template" : command.source;
	const unavailableSkill = command.source === "skill" && !skill;

	return {
		id: `runtime-command:${command.name}`,
		title: command.name,
		slashCommand: command.name,
		source,
		description: command.description,
		argumentHint:
			promptTemplate?.argumentHint ?? (command.source === "skill" && skill ? "[instructions]" : undefined),
		scope: command.sourceInfo.scope,
		provenance: toProvenance(command.sourceInfo),
		availability: unavailableSkill
			? { state: "unavailable", reason: "Skill metadata is unavailable for this command." }
			: { state: "available", reason: undefined },
	};
}

function toProvenance(sourceInfo: SourceInfo): PiSessionRuntimeCommand["provenance"] {
	return {
		path: sourceInfo.path,
		source: sourceInfo.source,
		origin: sourceInfo.origin,
		baseDir: sourceInfo.baseDir,
	};
}
