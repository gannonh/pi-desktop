import type { CommandPaletteAction, CommandPaletteEntry } from "./command-palette-registry";

export interface ConfigCommandPaletteDeps {
	onOpenModelPicker: () => void;
	onShowPaletteNotice: (message: string) => void;
}

export const NOOP_CONFIG_PALETTE_DEPS: ConfigCommandPaletteDeps = {
	onOpenModelPicker: () => {},
	onShowPaletteNotice: () => {},
};

export const CONFIG_PALETTE_DEFERRAL_MESSAGES = {
	scopedModels:
		"Scoped model cycling is not available in Desktop yet. Use the composer model picker to change the active model.",
	settings: "Settings are not available in Desktop yet. Model and thinking controls live in the composer action row.",
	login: "Provider login is not available in Desktop yet. Configure authentication in ~/.pi/agent; credentials stay in the main process.",
	logout: "Provider logout is not available in Desktop yet. Remove credentials through ~/.pi/agent or the Pi CLI.",
} as const;

function configPaletteEntry(
	entry: Pick<CommandPaletteEntry, "id" | "title" | "description" | "handler">,
): CommandPaletteEntry {
	return {
		sectionId: "config",
		icon: "Settings",
		scopeTag: "Config",
		...entry,
	};
}

function handledWithNotice(deps: ConfigCommandPaletteDeps, message: string): () => CommandPaletteAction {
	return () => {
		deps.onShowPaletteNotice(message);
		return { type: "handled" };
	};
}

export function buildConfigCommandPaletteEntries(deps: ConfigCommandPaletteDeps): CommandPaletteEntry[] {
	return [
		configPaletteEntry({
			id: "config.model",
			title: "Change model",
			description: "Open the composer model picker (/model)",
			handler: () => {
				deps.onOpenModelPicker();
				return { type: "handled" };
			},
		}),
		configPaletteEntry({
			id: "config.scoped-models",
			title: "Scoped models",
			description: "Configure Ctrl+P model cycling set (/scoped-models)",
			handler: handledWithNotice(deps, CONFIG_PALETTE_DEFERRAL_MESSAGES.scopedModels),
		}),
		configPaletteEntry({
			id: "config.settings",
			title: "Settings",
			description: "Open Desktop settings (/settings)",
			handler: handledWithNotice(deps, CONFIG_PALETTE_DEFERRAL_MESSAGES.settings),
		}),
		configPaletteEntry({
			id: "config.login",
			title: "Log in",
			description: "Configure provider authentication (/login)",
			handler: handledWithNotice(deps, CONFIG_PALETTE_DEFERRAL_MESSAGES.login),
		}),
		configPaletteEntry({
			id: "config.logout",
			title: "Log out",
			description: "Remove provider authentication (/logout)",
			handler: handledWithNotice(deps, CONFIG_PALETTE_DEFERRAL_MESSAGES.logout),
		}),
	];
}
