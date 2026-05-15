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

				const transformed = code.replaceAll("{}.url", "import.meta.url");
				return transformed === code ? null : { code: transformed, map: null };
			},
		},
	],
});
