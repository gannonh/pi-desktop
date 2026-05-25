import { css } from "@codemirror/lang-css";
import { go } from "@codemirror/lang-go";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import type { Extension } from "@codemirror/state";

export type CodeLanguageId =
	| "typescript"
	| "javascript"
	| "html"
	| "css"
	| "json"
	| "yaml"
	| "rust"
	| "python"
	| "go"
	| "shell"
	| "sql"
	| "xml"
	| "plain-text";

export type CodeLanguage = {
	id: CodeLanguageId;
	label: string;
};

type CodeLanguageDescriptor = CodeLanguage & {
	extensions: readonly string[];
	createExtensions: (relativePath: string) => Extension[];
};

const codeLanguageDescriptors: Record<CodeLanguageId, CodeLanguageDescriptor> = {
	typescript: {
		id: "typescript",
		label: "TypeScript",
		extensions: ["ts", "tsx"],
		createExtensions: (relativePath) => [
			javascript({ typescript: true, jsx: relativePath.toLowerCase().endsWith(".tsx") }),
		],
	},
	javascript: {
		id: "javascript",
		label: "JavaScript",
		extensions: ["js", "jsx", "mjs", "cjs"],
		createExtensions: (relativePath) => [javascript({ jsx: relativePath.toLowerCase().endsWith(".jsx") })],
	},
	html: { id: "html", label: "HTML", extensions: ["html", "htm"], createExtensions: () => [html()] },
	css: { id: "css", label: "CSS", extensions: ["css", "scss"], createExtensions: () => [css()] },
	json: { id: "json", label: "JSON", extensions: ["json", "jsonc"], createExtensions: () => [json()] },
	yaml: { id: "yaml", label: "YAML", extensions: ["yml", "yaml"], createExtensions: () => [yaml()] },
	rust: { id: "rust", label: "Rust", extensions: ["rs"], createExtensions: () => [rust()] },
	python: { id: "python", label: "Python", extensions: ["py"], createExtensions: () => [python()] },
	go: { id: "go", label: "Go", extensions: ["go"], createExtensions: () => [go()] },
	shell: {
		id: "shell",
		label: "Shell",
		extensions: ["sh", "bash", "zsh"],
		createExtensions: () => [StreamLanguage.define(shell)],
	},
	sql: { id: "sql", label: "SQL", extensions: ["sql"], createExtensions: () => [sql()] },
	xml: { id: "xml", label: "XML", extensions: ["xml"], createExtensions: () => [xml()] },
	"plain-text": { id: "plain-text", label: "Plain text", extensions: [], createExtensions: () => [] },
};

const extensionLanguages = new Map<string, CodeLanguageDescriptor>(
	Object.values(codeLanguageDescriptors).flatMap((language) =>
		language.extensions.map((extension) => [extension, language] as const),
	),
);

const plainTextBasenames = new Set([
	".dockerignore",
	".editorconfig",
	".gitignore",
	".prettierrc",
	"dockerfile",
	"license",
	"makefile",
	"readme",
]);

function toCodeLanguage(descriptor: CodeLanguageDescriptor): CodeLanguage {
	return { id: descriptor.id, label: descriptor.label };
}

function getCodeLanguageDescriptorForPath(relativePath: string): CodeLanguageDescriptor {
	const basename = relativePath.split("/").pop()?.trim() ?? "";
	const normalizedBasename = basename.toLowerCase();

	if (normalizedBasename === ".env" || normalizedBasename.startsWith(".env.")) {
		return codeLanguageDescriptors["plain-text"];
	}

	if (plainTextBasenames.has(normalizedBasename)) {
		return codeLanguageDescriptors["plain-text"];
	}

	const extension = normalizedBasename.includes(".") ? normalizedBasename.split(".").pop() : undefined;
	return extension
		? (extensionLanguages.get(extension) ?? codeLanguageDescriptors["plain-text"])
		: codeLanguageDescriptors["plain-text"];
}

export function getCodeLanguageForPath(relativePath: string): CodeLanguage {
	return toCodeLanguage(getCodeLanguageDescriptorForPath(relativePath));
}

export function createCodeLanguageExtensions(language: CodeLanguage, relativePath: string): Extension[] {
	return codeLanguageDescriptors[language.id].createExtensions(relativePath);
}
