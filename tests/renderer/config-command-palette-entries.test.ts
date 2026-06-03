import { describe, expect, it, vi } from "vitest";
import {
	buildConfigCommandPaletteEntries,
	CONFIG_PALETTE_DEFERRAL_MESSAGES,
} from "../../src/renderer/chat/config-command-palette-entries";
import { getDefaultCommandPaletteEntries } from "../../src/renderer/chat/command-palette-registry";

describe("config command palette entries", () => {
	it("registers stable S012 matrix entry IDs under the config section", () => {
		const deps = {
			onOpenModelPicker: vi.fn(),
			onShowPaletteNotice: vi.fn(),
		};
		const entries = buildConfigCommandPaletteEntries(deps);

		expect(entries.map((entry) => entry.id)).toEqual([
			"config.model",
			"config.scoped-models",
			"config.settings",
			"config.login",
			"config.logout",
		]);
		expect(entries.every((entry) => entry.sectionId === "config")).toBe(true);
	});

	it("opens the model picker without inserting draft text", () => {
		const onOpenModelPicker = vi.fn();
		const onShowPaletteNotice = vi.fn();
		const modelEntry = buildConfigCommandPaletteEntries({ onOpenModelPicker, onShowPaletteNotice }).find(
			(entry) => entry.id === "config.model",
		);

		expect(modelEntry?.handler()).toEqual({ type: "handled" });
		expect(onOpenModelPicker).toHaveBeenCalledOnce();
		expect(onShowPaletteNotice).not.toHaveBeenCalled();
	});

	it("shows visible deferrals for scoped models, settings, and auth commands", () => {
		const onOpenModelPicker = vi.fn();
		const onShowPaletteNotice = vi.fn();
		const entries = buildConfigCommandPaletteEntries({ onOpenModelPicker, onShowPaletteNotice });

		for (const entry of entries.filter((candidate) => candidate.id !== "config.model")) {
			expect(entry.handler()).toEqual({ type: "handled" });
		}

		expect(onShowPaletteNotice).toHaveBeenCalledWith(CONFIG_PALETTE_DEFERRAL_MESSAGES.scopedModels);
		expect(onShowPaletteNotice).toHaveBeenCalledWith(CONFIG_PALETTE_DEFERRAL_MESSAGES.settings);
		expect(onShowPaletteNotice).toHaveBeenCalledWith(CONFIG_PALETTE_DEFERRAL_MESSAGES.login);
		expect(onShowPaletteNotice).toHaveBeenCalledWith(CONFIG_PALETTE_DEFERRAL_MESSAGES.logout);
	});

	it("does not embed provider secrets in palette entry data", () => {
		const entries = buildConfigCommandPaletteEntries({
			onOpenModelPicker: () => {},
			onShowPaletteNotice: () => {},
		});
		const serialized = JSON.stringify(entries);

		expect(serialized).not.toMatch(/api[_-]?key|token|secret|password|bearer/i);
		expect(entries.find((entry) => entry.id === "config.login")?.description).toContain("/login");
	});

	it("replaces the config section stub in the default registry", () => {
		const entries = getDefaultCommandPaletteEntries({
			onOpenModelPicker: () => {},
			onShowPaletteNotice: () => {},
		});
		const configEntries = entries.filter((entry) => entry.sectionId === "config");

		expect(configEntries.some((entry) => entry.id === "config.stub")).toBe(false);
		expect(configEntries).toHaveLength(5);
	});
});
