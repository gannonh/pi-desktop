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

	it("returns visible deferral or out-of-scope notices for discovery commands", () => {
		const byId = Object.fromEntries(getMetaCommandPaletteEntries().map((entry) => [entry.id, entry]));

		expect(byId["meta.hotkeys"]?.handler()).toEqual({
			type: "showNotice",
			message: META_HOTKEYS_DEFERRAL_MESSAGE,
		});
		expect(byId["meta.changelog"]?.handler()).toEqual({
			type: "showNotice",
			message: META_CHANGELOG_DEFERRAL_MESSAGE,
		});
	});

	it("returns visible deferral or out-of-scope notices for reload and quit", () => {
		const byId = Object.fromEntries(getMetaCommandPaletteEntries().map((entry) => [entry.id, entry]));

		expect(byId["meta.reload"]?.handler()).toEqual({
			type: "showNotice",
			message: META_RELOAD_DEFERRAL_MESSAGE,
		});
		expect(byId["meta.quit"]?.handler()).toEqual({
			type: "showNotice",
			message: META_QUIT_OUT_OF_SCOPE_MESSAGE,
		});
	});
});
