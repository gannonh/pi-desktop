import path from "node:path";
import type { Plugin } from "vite";

/** Paths edited in the workspace file panel that should not restart the dev renderer. */
const SUPPRESS_DEV_RELOAD_PATTERNS = [
	/(^|\/)docs\//,
	/(^|\/)coverage\//,
	/(^|\/)\.agents\//,
	/\.mdx?$/i,
	/\.markdown$/i,
] as const;

export const workspaceDevWatchIgnored = [
	"**/docs/**",
	"**/.agents/**",
	"**/coverage/**",
	"**/*.md",
	"**/*.mdx",
	"**/*.markdown",
] as const;

export const shouldSuppressDevReloadForPath = (filePath: string, root: string): boolean => {
	const relative = path.relative(root, filePath).replaceAll("\\", "/");
	if (relative.startsWith("..")) {
		return false;
	}
	return SUPPRESS_DEV_RELOAD_PATTERNS.some((pattern) => pattern.test(relative));
};

export const suppressWorkspaceFileDevReload = (): Plugin => ({
	name: "pi-suppress-workspace-file-dev-reload",
	apply: "serve",
	handleHotUpdate(ctx) {
		if (shouldSuppressDevReloadForPath(ctx.file, ctx.server.config.root)) {
			return [];
		}
	},
});
