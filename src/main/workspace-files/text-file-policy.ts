import path from "node:path";
import { WORKSPACE_FILES_MAX_BYTES } from "../../shared/workspace-files";

const TEXT_EXTENSIONS = new Set([
	".md",
	".markdown",
	".txt",
	".json",
	".jsonc",
	".js",
	".jsx",
	".ts",
	".tsx",
	".mjs",
	".cjs",
	".css",
	".scss",
	".html",
	".htm",
	".xml",
	".yml",
	".yaml",
	".toml",
	".ini",
	".env",
	".sh",
	".bash",
	".zsh",
	".py",
	".rb",
	".go",
	".rs",
	".java",
	".kt",
	".swift",
	".c",
	".h",
	".cpp",
	".hpp",
	".cs",
	".sql",
	".graphql",
	".gitignore",
	".dockerignore",
	".editorconfig",
	".prettierrc",
]);

const TEXT_BASENAMES = new Set([
	"AGENTS.md",
	"README",
	"LICENSE",
	"Makefile",
	"Dockerfile",
	".gitignore",
	".env",
	".npmrc",
]);

export const isSupportedTextFile = (relativePath: string): boolean => {
	const basename = path.basename(relativePath);
	if (TEXT_BASENAMES.has(basename)) {
		return true;
	}

	const extension = path.extname(relativePath).toLowerCase();
	if (extension.length === 0) {
		return false;
	}

	return TEXT_EXTENSIONS.has(extension);
};

export const containsNullByte = (buffer: Buffer): boolean => buffer.includes(0);

export const assertWritableSize = (byteLength: number): void => {
	if (byteLength > WORKSPACE_FILES_MAX_BYTES) {
		throw new Error(`File exceeds the ${WORKSPACE_FILES_MAX_BYTES} byte limit.`);
	}
};
