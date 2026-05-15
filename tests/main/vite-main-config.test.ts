import { describe, expect, it } from "vitest";
import mainViteConfig from "../../vite.main.config";

const hasPluginName = (plugin: unknown): plugin is { name: string } =>
	plugin !== null && plugin !== undefined && typeof plugin === "object" && "name" in plugin;

describe("main Vite package config", () => {
	it("bundles the Pi SDK into an Electron main bundle with dynamic require support", () => {
		const external = mainViteConfig.build?.rollupOptions?.external;
		const externalPackages = Array.isArray(external) ? external : [];
		const output = mainViteConfig.build?.rollupOptions?.output;
		const banner = Array.isArray(output) ? output[0]?.banner : output?.banner;
		const mainBanner = typeof banner === "function" ? banner({ fileName: "main.js" } as never) : banner;
		const chunkBanner = typeof banner === "function" ? banner({ fileName: "chunk-test.cjs" } as never) : "";
		const pluginNames = (mainViteConfig.plugins ?? [])
			.flat()
			.filter(hasPluginName)
			.map((plugin) => plugin.name);

		expect(externalPackages).not.toContain("@earendil-works/pi-coding-agent");
		expect(mainViteConfig.build?.commonjsOptions?.ignoreDynamicRequires).toBe(true);
		expect(mainBanner).toContain("createRequire");
		expect(chunkBanner).toBe("");
		expect(pluginNames).toContain("preserve-main-import-meta-url");
	});
});
