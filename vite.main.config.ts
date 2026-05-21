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
