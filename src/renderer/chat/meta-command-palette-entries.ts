import type { CommandPaletteEntry } from "./command-palette-registry";

export const META_HOTKEYS_DEFERRAL_MESSAGE =
	"Keyboard shortcuts reference is not available in Pi Desktop yet. A future keybindings milestone will add an in-app shortcuts surface.";

export const META_CHANGELOG_DEFERRAL_MESSAGE =
	"In-app changelog is not available in Pi Desktop yet. See repository release notes or your package distribution for version history.";

export const META_RELOAD_DEFERRAL_MESSAGE =
	"Extension, skill, and theme hot-reload is not available in Pi Desktop yet. Restart the app when resources change, or wait for the extensibility milestone.";

export const META_QUIT_OUT_OF_SCOPE_MESSAGE =
	"Quit is handled by the OS window close control (macOS red button or Cmd+Q). Pi Desktop does not duplicate the CLI /quit command in the palette.";

export function getMetaCommandPaletteEntries(): CommandPaletteEntry[] {
	return [
		{
			id: "meta.hotkeys",
			sectionId: "meta",
			icon: "CircleHelp",
			title: "/hotkeys",
			description: "Show keyboard shortcuts",
			handler: () => ({ type: "showNotice", message: META_HOTKEYS_DEFERRAL_MESSAGE }),
		},
		{
			id: "meta.changelog",
			sectionId: "meta",
			icon: "CircleHelp",
			title: "/changelog",
			description: "Show changelog entries",
			handler: () => ({ type: "showNotice", message: META_CHANGELOG_DEFERRAL_MESSAGE }),
		},
		{
			id: "meta.reload",
			sectionId: "meta",
			icon: "CircleHelp",
			title: "/reload",
			description: "Reload keybindings, extensions, skills, prompts, and themes",
			handler: () => ({ type: "showNotice", message: META_RELOAD_DEFERRAL_MESSAGE }),
		},
		{
			id: "meta.quit",
			sectionId: "meta",
			icon: "CircleHelp",
			title: "/quit",
			description: "Quit Pi",
			handler: () => ({ type: "showNotice", message: META_QUIT_OUT_OF_SCOPE_MESSAGE }),
		},
	];
}
