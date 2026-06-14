import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { suppressWorkspaceFileDevReload, workspaceDevWatchIgnored } from "./vite/workspace-dev-watch";

export default defineConfig({
	plugins: [react(), tailwindcss(), suppressWorkspaceFileDevReload()],
	server: {
		// On Linux dev, bind IPv4 so Electron's `http://localhost:<port>` load succeeds when Vite
		// would otherwise listen on ::1 only. Override with PI_DESKTOP_VITE_HOST when needed.
		host: process.env.PI_DESKTOP_VITE_HOST ?? (process.platform === "linux" ? "127.0.0.1" : undefined),
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
