import { realpath } from "node:fs/promises";
import path from "node:path";

export class WorkspacePathError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "WorkspacePathError";
	}
}

export const normalizeRelativePath = (relativePath: string): string => {
	if (relativePath.includes("\0")) {
		throw new WorkspacePathError("Path contains invalid characters.");
	}

	if (path.isAbsolute(relativePath)) {
		throw new WorkspacePathError("Absolute paths are not allowed.");
	}

	const normalized = path.normalize(relativePath).replace(/^[/\\]+/, "");
	if (normalized === "." || normalized === "./" || normalized === "") {
		return "";
	}

	const segments = normalized.split(path.sep);
	if (segments.some((segment) => segment === "..")) {
		throw new WorkspacePathError("Path escapes the project root.");
	}

	return normalized;
};

export const resolvePathWithinProjectRoot = async (projectRoot: string, relativePath: string): Promise<string> => {
	const safeRelative = normalizeRelativePath(relativePath);
	const candidate = safeRelative.length === 0 ? projectRoot : path.join(projectRoot, safeRelative);
	const [resolvedRoot, resolvedTarget] = await Promise.all([realpath(projectRoot), realpath(candidate)]);

	const rootWithSep = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`;
	if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(rootWithSep)) {
		throw new WorkspacePathError("Path escapes the project root.");
	}

	return resolvedTarget;
};
