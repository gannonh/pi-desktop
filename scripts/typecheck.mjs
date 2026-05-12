import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const roots = ["src", "tests", "scripts"];
const rootFiles = [
	"forge.config.ts",
	"playwright.config.ts",
	"vite.main.config.ts",
	"vite.preload.config.ts",
	"vite.renderer.config.ts",
	"vitest.config.ts",
];
const typeScriptExtensions = [".ts", ".tsx", ".mts", ".cts"];

const hasTypeScriptFile = async (path) => {
	try {
		const entries = await readdir(path, { withFileTypes: true });

		for (const entry of entries) {
			const entryPath = join(path, entry.name);

			if (entry.isDirectory()) {
				if (await hasTypeScriptFile(entryPath)) {
					return true;
				}
				continue;
			}

			if (entry.isFile() && typeScriptExtensions.some((extension) => entry.name.endsWith(extension))) {
				return true;
			}
		}
	} catch (error) {
		if (error?.code === "ENOENT") {
			return false;
		}

		throw error;
	}

	return false;
};

const hasConfiguredInputs =
	rootFiles.some((file) => existsSync(file)) ||
	(await Promise.all(roots.map((root) => hasTypeScriptFile(root)))).some(Boolean);

if (hasConfiguredInputs) {
	execFileSync("tsc", ["--noEmit"], { stdio: "inherit" });
} else {
	const tempDirectory = mkdtempSync(join(process.cwd(), ".typecheck-"));

	try {
		writeFileSync(join(tempDirectory, "input.ts"), "export {};\n");
		writeFileSync(
			join(tempDirectory, "tsconfig.json"),
			JSON.stringify({ extends: join(process.cwd(), "tsconfig.json"), files: ["input.ts"] }),
		);
		execFileSync("tsc", ["--noEmit", "--project", join(tempDirectory, "tsconfig.json")], { stdio: "inherit" });
	} finally {
		rmSync(tempDirectory, { force: true, recursive: true });
	}
}
