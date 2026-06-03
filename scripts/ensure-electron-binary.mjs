import { execSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const electronDir = path.dirname(require.resolve("electron/package.json"));
const electronRequire = createRequire(path.join(electronDir, "package.json"));
const { version } = electronRequire("./package.json");
const checksums = electronRequire("./checksums.json");

const pathTxt = path.join(electronDir, "path.txt");
const distDir = path.join(electronDir, "dist");
const installPlatform = process.env.ELECTRON_INSTALL_PLATFORM || process.env.npm_config_platform || process.platform;
const installArch = getInstallArch(installPlatform);
const platformPath = getPlatformPath(installPlatform);
const electronPath = process.env.ELECTRON_OVERRIDE_DIST_PATH
	? path.join(process.env.ELECTRON_OVERRIDE_DIST_PATH, platformPath)
	: path.join(distDir, platformPath);

if (!isInstalled()) {
	fs.rmSync(distDir, { recursive: true, force: true });
	fs.rmSync(pathTxt, { force: true });
	installElectronBinary();
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

function installElectronBinary() {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-electron-"));
	try {
		const zipPath = downloadElectronZip(tempDir);
		extractElectronZip(zipPath);

		const typeDefinitionPath = path.join(distDir, "electron.d.ts");
		if (fs.existsSync(typeDefinitionPath)) {
			fs.renameSync(typeDefinitionPath, path.join(electronDir, "electron.d.ts"));
		}

		fs.writeFileSync(pathTxt, platformPath);
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}
}

function downloadElectronZip(tempDir) {
	const fileName = `electron-v${version}-${installPlatform}-${installArch}.zip`;
	const expectedChecksum = checksums[fileName];
	if (!expectedChecksum) {
		throw new Error(`Missing Electron checksum for ${fileName}`);
	}

	const cachePath = path.join(getElectronCacheRoot(), fileName);
	if (fs.existsSync(cachePath) && checksumFile(cachePath) === expectedChecksum) {
		return cachePath;
	}

	fs.mkdirSync(path.dirname(cachePath), { recursive: true });
	const downloadPath = path.join(tempDir, fileName);
	const url = `${getElectronDownloadBaseUrl()}/v${version}/${fileName}`;
	const result = spawnSync("curl", ["--fail", "--location", "--retry", "3", "--output", downloadPath, url], {
		stdio: "inherit",
	});
	if (result.status !== 0) {
		throw new Error(`Failed to download Electron from ${url}`);
	}

	const actualChecksum = checksumFile(downloadPath);
	if (actualChecksum !== expectedChecksum) {
		throw new Error(
			`Electron checksum mismatch for ${fileName}: expected ${expectedChecksum}, got ${actualChecksum}`,
		);
	}

	fs.copyFileSync(downloadPath, cachePath);
	return cachePath;
}

function extractElectronZip(zipPath) {
	fs.mkdirSync(distDir, { recursive: true });
	const command = process.platform === "darwin" ? "ditto" : "unzip";
	const args = process.platform === "darwin" ? ["-x", "-k", zipPath, distDir] : ["-q", zipPath, "-d", distDir];
	const result = spawnSync(command, args, { stdio: "inherit" });
	if (result.status !== 0) {
		throw new Error(`Failed to extract Electron from ${zipPath}`);
	}
}

function checksumFile(filePath) {
	return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function getElectronCacheRoot() {
	if (process.env.electron_config_cache) {
		return process.env.electron_config_cache;
	}
	if (process.platform === "darwin") {
		return path.join(os.homedir(), "Library", "Caches", "electron");
	}
	return path.join(os.homedir(), ".cache", "electron");
}

function getElectronDownloadBaseUrl() {
	return (
		process.env.ELECTRON_MIRROR ||
		process.env.NPM_CONFIG_ELECTRON_MIRROR ||
		process.env.npm_config_electron_mirror ||
		"https://github.com/electron/electron/releases/download"
	).replace(/\/$/, "");
}

function getInstallArch(platform) {
	const arch = process.env.ELECTRON_INSTALL_ARCH || process.env.npm_config_arch || process.arch;
	if (platform !== "darwin" || process.platform !== "darwin" || arch !== "x64") {
		return arch;
	}

	try {
		return execSync("sysctl -in sysctl.proc_translated").toString().trim() === "1" ? "arm64" : arch;
	} catch {
		return arch;
	}
}

function getPlatformPath(platform) {
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
