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

const plainTextLanguage: CodeLanguage = { id: "plain-text", label: "Plain text" };

const extensionLanguages = new Map<string, CodeLanguage>([
	["ts", { id: "typescript", label: "TypeScript" }],
	["tsx", { id: "typescript", label: "TypeScript" }],
	["js", { id: "javascript", label: "JavaScript" }],
	["jsx", { id: "javascript", label: "JavaScript" }],
	["mjs", { id: "javascript", label: "JavaScript" }],
	["cjs", { id: "javascript", label: "JavaScript" }],
	["html", { id: "html", label: "HTML" }],
	["htm", { id: "html", label: "HTML" }],
	["css", { id: "css", label: "CSS" }],
	["scss", { id: "css", label: "CSS" }],
	["json", { id: "json", label: "JSON" }],
	["jsonc", { id: "json", label: "JSON" }],
	["yml", { id: "yaml", label: "YAML" }],
	["yaml", { id: "yaml", label: "YAML" }],
	["rs", { id: "rust", label: "Rust" }],
	["py", { id: "python", label: "Python" }],
	["go", { id: "go", label: "Go" }],
	["sh", { id: "shell", label: "Shell" }],
	["bash", { id: "shell", label: "Shell" }],
	["zsh", { id: "shell", label: "Shell" }],
	["sql", { id: "sql", label: "SQL" }],
	["xml", { id: "xml", label: "XML" }],
]);

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

export function getCodeLanguageForPath(relativePath: string): CodeLanguage {
	const basename = relativePath.split("/").pop()?.trim() ?? "";
	const normalizedBasename = basename.toLowerCase();

	if (normalizedBasename === ".env" || normalizedBasename.startsWith(".env.")) {
		return plainTextLanguage;
	}

	if (plainTextBasenames.has(normalizedBasename)) {
		return plainTextLanguage;
	}

	const extension = normalizedBasename.includes(".") ? normalizedBasename.split(".").pop() : undefined;
	return extension ? (extensionLanguages.get(extension) ?? plainTextLanguage) : plainTextLanguage;
}
