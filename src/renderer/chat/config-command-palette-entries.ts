import type { CommandPaletteAction, CommandPaletteEntry } from "./command-palette-registry";

export interface ConfigCommandPaletteDeps {
	onOpenModelPicker: () => void;
	onShowPaletteNotice: (message: string) => void;
}

export const CONFIG_PALETTE_DEFERRAL_MESSAGES = {
	scopedModels:
		"Scoped model cycling is not available in Desktop yet. Use the composer model picker to change the active model.",
	settings: "Settings are not available in Desktop yet. Model and thinking controls live in the composer action row.",
	login: "Provider login is not available in Desktop yet. Configure authentication in ~/.pi/agent; credentials stay in the main process.",
	logout: "Provider logout is not available in Desktop yet. Remove credentials through ~/.pi/agent or the Pi CLI.",
} as const;

function handledWithNotice(deps: ConfigCommandPaletteDeps, message: string): () => CommandPaletteAction {
	return () => {
		deps.onShowPaletteNotice(message);
		return { type: "handled" };
	};
}

export function buildConfigCommandPaletteEntries(deps: ConfigCommandPaletteDeps): CommandPaletteEntry[] {
	return [
		{
			id: "config.model",
			sectionId: "config",
			icon: "Settings",
			title: "Change model",
			description: "Open the composer model picker (/model)",
			scopeTag: "Config",
			handler: () => {
				deps.onOpenModelPicker();
				return { type: "handled" };
			},
		},
		{
			id: "config.scoped-models",
			sectionId: "config",
			icon: "Settings",
			title: "Scoped models",
			description: "Configure Ctrl+P model cycling set (/scoped-models)",
			scopeTag: "Config",
			handler: handledWithNotice(deps, CONFIG_PALETTE_DEFERRAL_MESSAGES.scopedModels),
		},
		{
			id: "config.settings",
			sectionId: "config",
			icon: "Settings",
			title: "Settings",
			description: "Open Desktop settings (/settings)",
			scopeTag: "Config",
			handler: handledWithNotice(deps, CONFIG_PALETTE_DEFERRAL_MESSAGES.settings),
		},
		{
			id: "config.login",
			sectionId: "config",
			icon: "Settings",
			title: "Log in",
			description: "Configure provider authentication (/login)",
			scopeTag: "Config",
			handler: handledWithNotice(deps, CONFIG_PALETTE_DEFERRAL_MESSAGES.login),
		},
		{
			id: "config.logout",
			sectionId: "config",
			icon: "Settings",
			title: "Log out",
			description: "Remove provider authentication (/logout)",
			scopeTag: "Config",
			handler: handledWithNotice(deps, CONFIG_PALETTE_DEFERRAL_MESSAGES.logout),
		},
	];
}
