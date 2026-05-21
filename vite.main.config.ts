import { defineConfig } from "vite";

export default defineConfig({
	build: {
		commonjsOptions: {
			ignoreDynamicRequires: true,
		},
		rollupOptions: {
			output: {
				banner: (chunk) =>
					chunk.fileName === "main.js"
						? [
								'import { createRequire as __piCreateRequire } from "node:module";',
								"const require = __piCreateRequire(import.meta.url);",
							].join("\n")
						: "",
			},
		},
		target: "node24",
	},
	plugins: [
		{
			name: "use-virtual-extension-modules-in-electron-main",
			transform(code, id) {
				if (!id.includes("@earendil-works/pi-coding-agent") || !id.endsWith("/dist/core/extensions/loader.js")) {
					return null;
				}

				const bundledMainCondition = 'isBunBinary || import.meta.url.includes("/.vite/build/")';
				const transformed = code
					.replace(
						"...(isBunBinary ? { virtualModules: VIRTUAL_MODULES, tryNative: false } : { alias: getAliases() }),",
						`...(${bundledMainCondition} ? { virtualModules: VIRTUAL_MODULES, tryNative: false } : { alias: getAliases() }),`,
					)
					.replace(
						'"@earendil-works/pi-coding-agent": _bundledPiCodingAgent,',
						'get "@earendil-works/pi-coding-agent"() { return _bundledPiCodingAgent; },',
					)
					.replace(
						'"@mariozechner/pi-coding-agent": _bundledPiCodingAgent,',
						'get "@mariozechner/pi-coding-agent"() { return _bundledPiCodingAgent; },',
					);
				if (transformed === code) {
					this.warn(
						"Pi extension loader transform did not match compiled SDK output; packaged extension loading may fail.",
					);
					return null;
				}
				return { code: transformed, map: null };
			},
		},
		{
			name: "preserve-main-import-meta-url",
			renderChunk(code, chunk) {
				if (chunk.fileName !== "main.js") {
					return null;
				}

				const transformed = code
					.replaceAll("(void 0).url", "import.meta.url")
					.replaceAll("(void 0).resolve", "import.meta.resolve")
					.replace(/\(\s*\{\s*\}\s*\)\.url\b/g, "import.meta.url")
					.replace(/\(\s*\{\s*\}\s*\)\.resolve\b/g, "import.meta.resolve")
					.replace(/(^|[^\w$"'`])\{\}\.url\b/g, "$1import.meta.url")
					.replace(/(^|[^\w$"'`])\{\}\.resolve\b/g, "$1import.meta.resolve");
				return transformed === code ? null : { code: transformed, map: null };
			},
		},
	],
});
