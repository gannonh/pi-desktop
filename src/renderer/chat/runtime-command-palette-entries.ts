import type { PiSessionRuntimeCommand } from "../../shared/pi-session-commands";
import type { CommandPaletteEntry } from "./command-palette-registry";

const runtimeSourceLabels: Record<PiSessionRuntimeCommand["source"], string> = {
	extension: "Extension",
	"prompt-template": "Prompt template",
	skill: "Skill",
};

export function createRuntimeCommandPaletteEntries(
	commands: readonly PiSessionRuntimeCommand[],
): CommandPaletteEntry[] {
	return commands.map((command) => {
		const available = command.availability.state === "available";
		return {
			id: command.id,
			sectionId: "meta",
			icon: "CircleHelp",
			title: `/${command.slashCommand}`,
			description: formatRuntimeCommandDescription(command),
			slashCommand: available ? command.slashCommand : undefined,
			scopeTag: available
				? runtimeSourceLabels[command.source]
				: `Unavailable ${runtimeSourceLabels[command.source].toLowerCase()}`,
			detail: formatRuntimeCommandDetail(command),
			handler: () =>
				available
					? { type: "insertPrompt", prompt: `/${command.slashCommand}` }
					: { type: "notice", message: command.availability.reason ?? "Command is unavailable." },
		} satisfies CommandPaletteEntry;
	});
}

function formatRuntimeCommandDescription(command: PiSessionRuntimeCommand): string {
	const description = command.description?.trim() || "Runtime-discovered command";
	const withArguments = command.argumentHint ? `${description} Arguments: ${command.argumentHint}` : description;
	return command.availability.state === "available"
		? withArguments
		: `${withArguments} ${command.availability.reason ?? "Command is unavailable."}`;
}

function formatRuntimeCommandDetail(command: PiSessionRuntimeCommand): string {
	return `${command.scope} · ${command.provenance.source} · ${command.provenance.path}`;
}
