import { defineConfig } from "vite";

export default defineConfig({
	build: {
		lib: {
			entry: {
				main: "src/main/index.ts",
			},
			fileName: () => "[name].js",
			formats: ["es"],
		},
		target: "node24",
	},
});
