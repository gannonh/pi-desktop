import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
	WorkspaceDirectoryEntry,
	WorkspaceListDirectoryPayload,
	WorkspaceReadFileStatusPayload,
	WorkspaceWriteFilePayload,
} from "../../shared/workspace-files";
import { WORKSPACE_FILES_MAX_BYTES } from "../../shared/workspace-files";
import { normalizeRelativePath, resolvePathWithinProjectRoot, WorkspacePathError } from "./path-guard";
import { assertWritableSize, containsNullByte, isSupportedTextFile } from "./text-file-policy";

const SKIP_DIRECTORY_NAMES = new Set(["node_modules"]);

const shouldSkipEntry = (name: string): boolean => name.startsWith(".") || SKIP_DIRECTORY_NAMES.has(name);

const toPosixRelativePath = (parentRelative: string, name: string): string =>
	parentRelative.length === 0 ? name : `${parentRelative}/${name}`;

const sortEntries = (entries: WorkspaceDirectoryEntry[]): WorkspaceDirectoryEntry[] =>
	[...entries].sort((left, right) => {
		if (left.kind !== right.kind) {
			return left.kind === "directory" ? -1 : 1;
		}
		return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
	});

export const listDirectory = async (
	projectRoot: string,
	relativePath: string,
): Promise<WorkspaceListDirectoryPayload> => {
	const safeRelative = normalizeRelativePath(relativePath);
	const directoryPath = await resolvePathWithinProjectRoot(projectRoot, safeRelative);
	const directoryStat = await stat(directoryPath);
	if (!directoryStat.isDirectory()) {
		throw new WorkspacePathError("Path is not a directory.");
	}

	const names = await readdir(directoryPath);
	const entries: WorkspaceDirectoryEntry[] = [];

	for (const name of names) {
		if (shouldSkipEntry(name)) {
			continue;
		}

		const entryPath = path.join(directoryPath, name);
		const entryStat = await stat(entryPath);
		entries.push({
			name,
			relativePath: toPosixRelativePath(safeRelative, name),
			kind: entryStat.isDirectory() ? "directory" : "file",
		});
	}

	return { entries: sortEntries(entries) };
};

export const readWorkspaceFile = async (
	projectRoot: string,
	relativePath: string,
): Promise<WorkspaceReadFileStatusPayload> => {
	const safeRelative = normalizeRelativePath(relativePath);
	if (safeRelative.length === 0) {
		throw new WorkspacePathError("Cannot read the project root as a file.");
	}

	if (!isSupportedTextFile(safeRelative)) {
		return { kind: "unsupported" };
	}

	const filePath = await resolvePathWithinProjectRoot(projectRoot, safeRelative);
	let fileStat: Awaited<ReturnType<typeof stat>>;
	try {
		fileStat = await stat(filePath);
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return { kind: "not_found" };
		}
		throw error;
	}

	if (!fileStat.isFile()) {
		return { kind: "unsupported" };
	}

	if (fileStat.size > WORKSPACE_FILES_MAX_BYTES) {
		return { kind: "too_large", size: fileStat.size };
	}

	const buffer = await readFile(filePath);
	if (containsNullByte(buffer)) {
		return { kind: "binary" };
	}

	return {
		kind: "text",
		content: buffer.toString("utf8"),
		size: buffer.byteLength,
	};
};

export const writeWorkspaceFile = async (
	projectRoot: string,
	relativePath: string,
	content: string,
): Promise<WorkspaceWriteFilePayload> => {
	const safeRelative = normalizeRelativePath(relativePath);
	if (safeRelative.length === 0) {
		throw new WorkspacePathError("Cannot write the project root as a file.");
	}

	if (!isSupportedTextFile(safeRelative)) {
		throw new WorkspacePathError("File type is not supported for editing.");
	}

	const bytes = Buffer.from(content, "utf8");
	assertWritableSize(bytes.byteLength);
	if (containsNullByte(bytes)) {
		throw new WorkspacePathError("File content is not valid text.");
	}

	const filePath = await resolvePathWithinProjectRoot(projectRoot, safeRelative);
	await writeFile(filePath, bytes, "utf8");

	return {
		relativePath: safeRelative,
		size: bytes.byteLength,
	};
};
