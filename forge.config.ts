import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerZIP } from "@electron-forge/maker-zip";
import { VitePlugin } from "@electron-forge/plugin-vite";

const config: ForgeConfig = {
	packagerConfig: {
		asar: true,
		name: "pi-desktop",
		executableName: "pi-desktop",
	},
	rebuildConfig: {},
	makers: [new MakerZIP({}, ["darwin"])],
	plugins: [
		new VitePlugin({
			build: [
				{
					entry: {
						main: "src/main/index.ts",
					},
					config: "vite.main.config.ts",
					target: "main",
				},
				{
					entry: {
						preload: "src/preload/index.ts",
					},
					config: "vite.preload.config.ts",
					target: "preload",
				},
			],
			renderer: [
				{
					name: "main_window",
					config: "vite.renderer.config.ts",
				},
			],
		}),
	],
};

export default config;
