import type { CommandPaletteAction, CommandPaletteEntry } from "./command-palette-registry";

export const CONFIG_PALETTE_DEFERRAL_MESSAGES = {
	scopedModels:
		"Scoped model cycling is not available in Desktop yet. Use the composer model picker to change the active model.",
	settings: "Settings are not available in Desktop yet. Model and thinking controls live in the composer action row.",
	login: "Provider login is not available in Desktop yet. Configure authentication in ~/.pi/agent; credentials stay in the main process.",
	logout: "Provider logout is not available in Desktop yet. Remove credentials through ~/.pi/agent or the Pi CLI.",
} as const;

const DEFERRED_CONFIG_COMMANDS = [
	{
		id: "config.scoped-models",
		title: "Scoped models",
		description: "Configure Ctrl+P model cycling set (/scoped-models)",
		slashCommand: "scoped-models",
		message: CONFIG_PALETTE_DEFERRAL_MESSAGES.scopedModels,
	},
	{
		id: "config.settings",
		title: "Settings",
		description: "Open Desktop settings (/settings)",
		slashCommand: "settings",
		message: CONFIG_PALETTE_DEFERRAL_MESSAGES.settings,
	},
	{
		id: "config.login",
		title: "Log in",
		description: "Configure provider authentication (/login)",
		slashCommand: "login",
		message: CONFIG_PALETTE_DEFERRAL_MESSAGES.login,
	},
	{
		id: "config.logout",
		title: "Log out",
		description: "Remove provider authentication (/logout)",
		slashCommand: "logout",
		message: CONFIG_PALETTE_DEFERRAL_MESSAGES.logout,
	},
] as const;

function configPaletteEntry(
	entry: Pick<CommandPaletteEntry, "id" | "title" | "description" | "handler" | "slashCommand">,
): CommandPaletteEntry {
	return {
		sectionId: "config",
		icon: "Settings",
		scopeTag: "Config",
		...entry,
	};
}

function deferralHandler(message: string): () => CommandPaletteAction {
	return () => ({ type: "notice", message });
}

export function buildConfigCommandPaletteEntries(): CommandPaletteEntry[] {
	return [
		configPaletteEntry({
			id: "config.model",
			title: "Change model",
			description: "Open the composer model picker (/model)",
			slashCommand: "model",
			handler: () => ({ type: "openModelPicker" }),
		}),
		...DEFERRED_CONFIG_COMMANDS.map((command) =>
			configPaletteEntry({
				id: command.id,
				title: command.title,
				description: command.description,
				slashCommand: command.slashCommand,
				handler: deferralHandler(command.message),
			}),
		),
	];
}
