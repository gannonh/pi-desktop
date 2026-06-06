import { showPaletteNoticeAction, type CommandPaletteEntry } from "./command-palette-registry";

export const META_HOTKEYS_DEFERRAL_MESSAGE =
	"Keyboard shortcuts reference is not available in Pi Desktop yet. A future keybindings milestone will add an in-app shortcuts surface.";

export const META_CHANGELOG_DEFERRAL_MESSAGE =
	"In-app changelog is not available in Pi Desktop yet. See repository release notes or your package distribution for version history.";

export const META_RELOAD_DEFERRAL_MESSAGE =
	"Extension, skill, and theme hot-reload is not available in Pi Desktop yet. Restart the app when resources change, or wait for the extensibility milestone.";

export const META_QUIT_OUT_OF_SCOPE_MESSAGE =
	"Quit is handled by the OS window close control (macOS red button or Cmd+Q). Pi Desktop does not duplicate the CLI /quit command in the palette.";

export type MetaCommandPaletteActions = {
	onReloadResources?: () => void;
};

const META_COMMAND_DEFINITIONS = [
	{
		id: "meta.hotkeys",
		title: "/hotkeys",
		description: "Show keyboard shortcuts",
		message: META_HOTKEYS_DEFERRAL_MESSAGE,
	},
	{
		id: "meta.changelog",
		title: "/changelog",
		description: "Show changelog entries",
		message: META_CHANGELOG_DEFERRAL_MESSAGE,
	},
	{
		id: "meta.reload",
		title: "/reload",
		description: "Reload keybindings, extensions, skills, prompts, and themes",
		message: META_RELOAD_DEFERRAL_MESSAGE,
	},
	{
		id: "meta.quit",
		title: "/quit",
		description: "Quit Pi",
		message: META_QUIT_OUT_OF_SCOPE_MESSAGE,
	},
] as const;

export function getMetaCommandPaletteEntries(actions?: MetaCommandPaletteActions): CommandPaletteEntry[] {
	return META_COMMAND_DEFINITIONS.map((definition) => ({
		id: definition.id,
		sectionId: "meta",
		icon: "CircleHelp",
		title: definition.title,
		description: definition.description,
		handler: () => {
			if (definition.id === "meta.reload" && actions?.onReloadResources) {
				actions.onReloadResources();
				return { type: "handled" };
			}
			return showPaletteNoticeAction(definition.message);
		},
	}));
}
