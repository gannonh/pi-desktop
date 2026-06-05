import { describe, expect, it } from "vitest";
import {
	buildConfigCommandPaletteEntries,
	CONFIG_PALETTE_DEFERRAL_MESSAGES,
} from "../../src/renderer/chat/config-command-palette-entries";
import { getDefaultCommandPaletteEntries } from "../../src/renderer/chat/command-palette-default-entries";

describe("config command palette entries", () => {
	it("registers stable S012 matrix entry IDs under the config section", () => {
		const entries = buildConfigCommandPaletteEntries();

		expect(entries.map((entry) => entry.id)).toEqual([
			"config.model",
			"config.scoped-models",
			"config.settings",
			"config.login",
			"config.logout",
		]);
		expect(entries.every((entry) => entry.sectionId === "config")).toBe(true);
	});

	it("returns openModelPicker for change model without inserting draft text", () => {
		const modelEntry = buildConfigCommandPaletteEntries().find((entry) => entry.id === "config.model");

		expect(modelEntry?.handler()).toEqual({ type: "openModelPicker" });
	});

	it("returns notice actions for scoped models, settings, and auth commands", () => {
		const entries = buildConfigCommandPaletteEntries();

		expect(entries.find((entry) => entry.id === "config.scoped-models")?.handler()).toEqual({
			type: "notice",
			message: CONFIG_PALETTE_DEFERRAL_MESSAGES.scopedModels,
		});
		expect(entries.find((entry) => entry.id === "config.settings")?.handler()).toEqual({
			type: "notice",
			message: CONFIG_PALETTE_DEFERRAL_MESSAGES.settings,
		});
		expect(entries.find((entry) => entry.id === "config.login")?.handler()).toEqual({
			type: "notice",
			message: CONFIG_PALETTE_DEFERRAL_MESSAGES.login,
		});
		expect(entries.find((entry) => entry.id === "config.logout")?.handler()).toEqual({
			type: "notice",
			message: CONFIG_PALETTE_DEFERRAL_MESSAGES.logout,
		});
	});

	it("does not embed provider secrets in palette entry data", () => {
		const entries = buildConfigCommandPaletteEntries();
		const serialized = JSON.stringify(entries);

		expect(serialized).not.toMatch(/api[_-]?key|token|secret|password|bearer/i);
		expect(entries.find((entry) => entry.id === "config.login")?.description).toContain("/login");
	});

	it("replaces the config section stub in the default registry", () => {
		const entries = getDefaultCommandPaletteEntries();
		const configEntries = entries.filter((entry) => entry.sectionId === "config");

		expect(configEntries.some((entry) => entry.id === "config.stub")).toBe(false);
		expect(configEntries).toHaveLength(5);
	});
});
