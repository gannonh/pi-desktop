import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const electronDir = path.dirname(require.resolve("electron/package.json"));
const pathTxt = path.join(electronDir, "path.txt");
const distDir = path.join(electronDir, "dist");
const installScript = path.join(electronDir, "install.js");

const runInstall = (force = false) => {
	const result = spawnSync(process.execPath, [installScript], {
		stdio: "inherit",
		env: force ? { ...process.env, force_no_cache: "true" } : process.env,
	});
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
};

if (!fs.existsSync(pathTxt)) {
	if (fs.existsSync(distDir)) {
		fs.rmSync(distDir, { recursive: true, force: true });
	}
	runInstall(true);
}

if (!fs.existsSync(pathTxt)) {
	console.error(`Electron path.txt is still missing at ${pathTxt}`);
	process.exit(1);
}
