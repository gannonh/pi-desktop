import { describe, expect, it } from "vitest";
import mainViteConfig from "../../vite.main.config";

type NamedPlugin = { name: string };
type RenderChunkPlugin = {
	name: string;
	renderChunk: (code: string, chunk: { fileName: string }, options?: never) => { code: string; map: null } | null;
};
type TransformPlugin = {
	name: string;
	transform: (code: string, id: string) => { code: string; map: null } | null;
};

const pluginOptions = () => ((mainViteConfig.plugins ?? []) as unknown[]).flat(Number.POSITIVE_INFINITY) as unknown[];

const hasPluginName = (plugin: unknown): plugin is NamedPlugin =>
	plugin !== null && plugin !== undefined && typeof plugin === "object" && "name" in plugin;

const hasRenderChunk = (plugin: unknown): plugin is RenderChunkPlugin =>
	hasPluginName(plugin) &&
	"renderChunk" in plugin &&
	typeof (plugin as { renderChunk?: unknown }).renderChunk === "function";

const hasTransform = (plugin: unknown): plugin is TransformPlugin =>
	hasPluginName(plugin) &&
	"transform" in plugin &&
	typeof (plugin as { transform?: unknown }).transform === "function";

const getMainRenderChunkPlugin = () => {
	const plugin = pluginOptions()
		.filter(hasRenderChunk)
		.find((candidate) => candidate.name === "preserve-main-import-meta-url");

	if (!plugin) {
		throw new Error("preserve-main-import-meta-url plugin not found.");
	}

	return plugin;
};

const getTransformPlugin = (name: string) => {
	const plugin = pluginOptions()
		.filter(hasTransform)
		.find((candidate) => candidate.name === name);

	if (!plugin) {
		throw new Error(`${name} plugin not found.`);
	}

	return plugin;
};

describe("main Vite package config", () => {
	it("bundles the Pi SDK into an Electron main bundle with dynamic require support", () => {
		const external = mainViteConfig.build?.rollupOptions?.external;
		const externalPackages = Array.isArray(external) ? external : [];
		const output = mainViteConfig.build?.rollupOptions?.output;
		const banner = Array.isArray(output) ? output[0]?.banner : output?.banner;
		const mainBanner = typeof banner === "function" ? banner({ fileName: "main.js" } as never) : banner;
		const chunkBanner = typeof banner === "function" ? banner({ fileName: "chunk-test.cjs" } as never) : "";
		const pluginNames = pluginOptions()
			.filter(hasPluginName)
			.map((plugin) => plugin.name);

		expect(externalPackages).not.toContain("@earendil-works/pi-coding-agent");
		expect(mainViteConfig.build?.commonjsOptions?.ignoreDynamicRequires).toBe(true);
		expect(mainBanner).toContain("createRequire");
		expect(chunkBanner).toBe("");
		expect(pluginNames).toContain("preserve-main-import-meta-url");
	});

	it("rewrites only Rollup import.meta.url shim shapes in the main bundle", () => {
		const plugin = getMainRenderChunkPlugin();

		expect(
			plugin.renderChunk('const a=(void 0).url; const b=({}).url; const c={}.url; const d="{}.url";', {
				fileName: "main.js",
			})?.code,
		).toBe('const a=import.meta.url; const b=import.meta.url; const c=import.meta.url; const d="{}.url";');
		expect(plugin.renderChunk("const a=({}).url;", { fileName: "chunk.js" })).toBeNull();
	});

	it("rewrites Rollup import.meta.resolve shim shapes so Pi extensions can resolve package imports", () => {
		const plugin = getMainRenderChunkPlugin();

		expect(
			plugin.renderChunk(
				[
					"const a=(void 0).resolve(specifier);",
					"const b=({}).resolve(specifier);",
					"const c={}.resolve(anotherSpecifier);",
					'const d="{}.resolve";',
				].join(" "),
				{ fileName: "main.js" },
			)?.code,
		).toBe(
			[
				"const a=import.meta.resolve(specifier);",
				"const b=import.meta.resolve(specifier);",
				"const c=import.meta.resolve(anotherSpecifier);",
				'const d="{}.resolve";',
			].join(" "),
		);
		expect(plugin.renderChunk("const a=({}).resolve(specifier);", { fileName: "chunk.js" })).toBeNull();
	});

	it("uses virtual extension modules in Electron main bundles so packaged apps can load Pi extensions", () => {
		const plugin = getTransformPlugin("use-virtual-extension-modules-in-electron-main");
		const source = [
			"const VIRTUAL_MODULES = {",
			'"@earendil-works/pi-coding-agent": _bundledPiCodingAgent,',
			'"@mariozechner/pi-coding-agent": _bundledPiCodingAgent,',
			"};",
			"async function loadExtensionModule(extensionPath) {",
			"const jiti = createJiti(import.meta.url, {",
			"moduleCache: false,",
			"...(isBunBinary ? { virtualModules: VIRTUAL_MODULES, tryNative: false } : { alias: getAliases() }),",
			"});",
			"}",
		].join("\n");

		const result = plugin.transform(
			source,
			"/repo/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/loader.js",
		);

		expect(result?.code).toContain('import.meta.url.includes("/.vite/build/")');
		expect(result?.code).toContain('get "@earendil-works/pi-coding-agent"()');
		expect(result?.code).toContain('get "@mariozechner/pi-coding-agent"()');
		expect(result?.code).toContain("virtualModules: VIRTUAL_MODULES");
		expect(result?.code).toContain("alias: getAliases()");
		expect(plugin.transform(source, "/repo/src/main/index.ts")).toBeNull();
	});
});
