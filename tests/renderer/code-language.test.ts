import { describe, expect, it } from "vitest";
import { getCodeLanguageForPath } from "../../src/renderer/code-editor/code-language";

describe("getCodeLanguageForPath", () => {
	it.each([
		["src/App.tsx", "typescript", "TypeScript"],
		["src/index.ts", "typescript", "TypeScript"],
		["vite.config.mjs", "javascript", "JavaScript"],
		["script.cjs", "javascript", "JavaScript"],
		["index.html", "html", "HTML"],
		["src/styles.scss", "css", "CSS"],
		["package.json", "json", "JSON"],
		["tsconfig.jsonc", "json", "JSON"],
		["docker-compose.yaml", "yaml", "YAML"],
		["src/main.rs", "rust", "Rust"],
		["scripts/build.py", "python", "Python"],
		["cmd/server.go", "go", "Go"],
		["scripts/bootstrap.sh", "shell", "Shell"],
		["scripts/login.zsh", "shell", "Shell"],
		["migrations/init.sql", "sql", "SQL"],
		["feed.xml", "xml", "XML"],
	])("maps %s to %s", (relativePath, id, label) => {
		expect(getCodeLanguageForPath(relativePath)).toEqual({ id, label });
	});

	it.each([
		["notes.txt"],
		[".env"],
		[".env.local"],
		["config/settings.toml"],
		["Makefile"],
		["Dockerfile"],
		["README"],
		["LICENSE"],
		["unknown.custom"],
	])("falls back to plain text for %s", (relativePath) => {
		expect(getCodeLanguageForPath(relativePath)).toEqual({ id: "plain-text", label: "Plain text" });
	});
});
