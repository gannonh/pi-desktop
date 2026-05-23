import { Braces, File, FileCode2, FileImage, FileJson2, FileText, Settings2, type LucideIcon } from "lucide-react";

export function getExplorerFileIcon(fileName: string): LucideIcon {
	const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : undefined;

	switch (extension) {
		case "md":
		case "mdx":
		case "txt":
			return FileText;
		case "json":
		case "jsonc":
			return FileJson2;
		case "ts":
		case "tsx":
		case "js":
		case "jsx":
		case "mjs":
		case "cjs":
		case "py":
		case "go":
		case "rs":
		case "java":
		case "css":
		case "scss":
		case "html":
		case "vue":
		case "svelte":
			return FileCode2;
		case "png":
		case "jpg":
		case "jpeg":
		case "gif":
		case "webp":
		case "svg":
		case "ico":
			return FileImage;
		case "yaml":
		case "yml":
		case "toml":
			return Settings2;
		case "lock":
			return Braces;
		default:
			return File;
	}
}
