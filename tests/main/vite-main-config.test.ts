import { describe, expect, it } from "vitest";
import mainViteConfig from "../../vite.main.config";

const hasPluginName = (plugin: unknown): plugin is { name: string } =>
	plugin !== null && plugin !== undefined && typeof plugin === "object" && "name" in plugin;

const hasRenderChunk = (
	plugin: unknown,
): plugin is {
	name: string;
	renderChunk: (code: string, chunk: { fileName: string }) => { code: string; map: null } | null;
} => hasPluginName(plugin) && "renderChunk" in plugin && typeof plugin.renderChunk === "function";

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

	it("rewrites only Rollup import.meta.url shim shapes in the main bundle", () => {
		const plugin = (mainViteConfig.plugins ?? [])
			.flat()
			.filter(hasRenderChunk)
			.find((candidate) => candidate.name === "preserve-main-import-meta-url");

		if (!plugin) {
			throw new Error("preserve-main-import-meta-url plugin not found.");
		}

		expect(
			plugin.renderChunk('const a=(void 0).url; const b=({}).url; const c={}.url; const d="{}.url";', {
				fileName: "main.js",
			})?.code,
		).toBe('const a=import.meta.url; const b=import.meta.url; const c=import.meta.url; const d="{}.url";');
		expect(plugin.renderChunk("const a=({}).url;", { fileName: "chunk.js" })).toBeNull();
	});
});
