import { describe, expect, it } from "vitest";
import {
	getMetaCommandPaletteEntries,
	META_CHANGELOG_DEFERRAL_MESSAGE,
	META_HOTKEYS_DEFERRAL_MESSAGE,
	META_QUIT_OUT_OF_SCOPE_MESSAGE,
	META_RELOAD_DEFERRAL_MESSAGE,
} from "../../src/renderer/chat/meta-command-palette-entries";

describe("meta command palette entries", () => {
	it("exposes stable matrix IDs for all S014 meta commands", () => {
		expect(getMetaCommandPaletteEntries().map((entry) => entry.id)).toEqual([
			"meta.hotkeys",
			"meta.changelog",
			"meta.reload",
			"meta.quit",
		]);
	});

	it.each([
		["meta.hotkeys", META_HOTKEYS_DEFERRAL_MESSAGE],
		["meta.changelog", META_CHANGELOG_DEFERRAL_MESSAGE],
		["meta.reload", META_RELOAD_DEFERRAL_MESSAGE],
		["meta.quit", META_QUIT_OUT_OF_SCOPE_MESSAGE],
	] as const)("returns notice for %s", (entryId, message) => {
		const entry = getMetaCommandPaletteEntries().find((candidate) => candidate.id === entryId);

		expect(entry?.handler()).toEqual({ type: "notice", message });
	});
});
