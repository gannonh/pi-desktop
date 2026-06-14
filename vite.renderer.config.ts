import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { suppressWorkspaceFileDevReload, workspaceDevWatchIgnored } from "./vite/workspace-dev-watch";

export default defineConfig({
	plugins: [react(), tailwindcss(), suppressWorkspaceFileDevReload()],
	server: {
		// Bind IPv4 explicitly so Electron's `http://localhost:<port>` load succeeds on Linux VMs
		// where Vite otherwise listens on ::1 only and the window stays blank (#0a0a0a).
		host: "127.0.0.1",
		watch: {
			// Workspace saves (docs, markdown, etc.) must not trigger a full renderer reload in dev.
			ignored: [...workspaceDevWatchIgnored],
		},
	},
	resolve: {
		preserveSymlinks: false,
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
});
