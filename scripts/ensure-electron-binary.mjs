import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const electronDir = path.dirname(require.resolve("electron/package.json"));
const electronRequire = createRequire(path.join(electronDir, "package.json"));
const { version } = electronRequire("./package.json");
const extract = electronRequire("extract-zip");
const { downloadArtifact, ElectronDownloadCacheMode } = await import(
	pathToFileURL(electronRequire.resolve("@electron/get")).href
);

const pathTxt = path.join(electronDir, "path.txt");
const distDir = path.join(electronDir, "dist");
const platformPath = getPlatformPath();
const electronPath = process.env.ELECTRON_OVERRIDE_DIST_PATH
	? path.join(process.env.ELECTRON_OVERRIDE_DIST_PATH, platformPath)
	: path.join(distDir, platformPath);

if (!isInstalled()) {
	fs.rmSync(distDir, { recursive: true, force: true });
	fs.rmSync(pathTxt, { force: true });
	await installElectronBinary();
}

if (!isInstalled()) {
	console.error(`Electron binary is still missing at ${electronPath}`);
	console.error(`Electron path.txt is expected at ${pathTxt}`);
	process.exit(1);
}

function isInstalled() {
	try {
		const installedVersion = fs.readFileSync(path.join(distDir, "version"), "utf8").replace(/^v/, "");
		const installedPath = fs.readFileSync(pathTxt, "utf8");
		return installedVersion === version && installedPath === platformPath && fs.existsSync(electronPath);
	} catch {
		return false;
	}
}

async function installElectronBinary() {
	const zipPath = await downloadArtifact({
		version,
		artifactName: "electron",
		cacheMode: ElectronDownloadCacheMode.WriteOnly,
		cacheRoot: process.env.electron_config_cache,
		checksums:
			process.env.electron_use_remote_checksums || process.env.npm_config_electron_use_remote_checksums
				? undefined
				: electronRequire("./checksums.json"),
		platform: process.env.ELECTRON_INSTALL_PLATFORM || process.env.npm_config_platform || process.platform,
		arch: getInstallArch(),
	});

	await extract(zipPath, { dir: distDir });

	const typeDefinitionPath = path.join(distDir, "electron.d.ts");
	if (fs.existsSync(typeDefinitionPath)) {
		fs.renameSync(typeDefinitionPath, path.join(electronDir, "electron.d.ts"));
	}

	await fs.promises.writeFile(pathTxt, platformPath);
}

function getInstallArch() {
	const arch = process.env.ELECTRON_INSTALL_ARCH || process.env.npm_config_arch || process.arch;
	const platform = process.env.ELECTRON_INSTALL_PLATFORM || process.env.npm_config_platform || process.platform;
	if (platform !== "darwin" || process.platform !== "darwin" || arch !== "x64") {
		return arch;
	}

	try {
		return execSync("sysctl -in sysctl.proc_translated").toString().trim() === "1" ? "arm64" : arch;
	} catch {
		return arch;
	}
}

function getPlatformPath() {
	const platform = process.env.ELECTRON_INSTALL_PLATFORM || process.env.npm_config_platform || os.platform();

	switch (platform) {
		case "mas":
		case "darwin":
			return "Electron.app/Contents/MacOS/Electron";
		case "freebsd":
		case "openbsd":
		case "linux":
			return "electron";
		case "win32":
			return "electron.exe";
		default:
			throw new Error(`Electron builds are not available on platform: ${platform}`);
	}
}
