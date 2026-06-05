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
	return commands.filter(isAvailableCommand).map((command) => ({
		id: command.id,
		sectionId: "meta",
		icon: "CircleHelp",
		title: `/${command.slashCommand}`,
		description: formatRuntimeCommandDescription(command),
		slashCommand: command.slashCommand,
		scopeTag: runtimeSourceLabels[command.source],
		handler: () => ({ type: "insertPrompt", prompt: `/${command.slashCommand}` }),
	}));
}

function isAvailableCommand(command: PiSessionRuntimeCommand): boolean {
	return command.availability.state === "available";
}

function formatRuntimeCommandDescription(command: PiSessionRuntimeCommand): string {
	const description = command.description?.trim() || "Runtime-discovered command";
	return command.argumentHint ? `${description} Arguments: ${command.argumentHint}` : description;
}
