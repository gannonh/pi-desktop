import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { suppressWorkspaceFileDevReload, workspaceDevWatchIgnored } from "./vite/workspace-dev-watch";

export default defineConfig({
	plugins: [react(), tailwindcss(), suppressWorkspaceFileDevReload()],
	server: {
		watch: {
			// Workspace saves (docs, markdown, etc.) must not trigger a full renderer reload in dev.
			ignored: [...workspaceDevWatchIgnored],
		},
	},
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
});
