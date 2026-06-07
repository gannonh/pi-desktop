import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { decodeGitCQuotedPath } from "../../shared/git-cquoted-path";
import { removeSafeUntrackedDiscardTarget, removeSafeUntrackedDiscardTargets } from "../../shared/git-discard-path-safety";
import type {
	GitConflictOperation,
	GitFileStatus,
	GitStatusEntry,
	GitStatusResult,
	GitUpstreamStatus,
} from "../../shared/source-control/types";
import { gitExecFileAsync, gitOptionalLocksDisabledEnv } from "./runner";

const BULK_CHUNK_SIZE = 100;

export type GetStatusOptions = {
	includeIgnored?: boolean;
};

export const getStatus = async (worktreePath: string, options: GetStatusOptions = {}): Promise<GitStatusResult> => {
	const entries: GitStatusEntry[] = [];
	const ignoredPaths: string[] = [];
	let head: string | undefined;
	let branch: string | undefined;
	let upstreamName: string | undefined;
	let upstreamAheadBehind: { ahead: number; behind: number } | null = null;
	let statusSucceeded = false;

	const conflictPromise = detectConflictOperation(worktreePath);
	const statusArgs = [
		"-c",
		"core.quotePath=false",
		"status",
		"--porcelain=v2",
		"--branch",
		"--untracked-files=all",
	];
	if (options.includeIgnored) {
		statusArgs.push("--ignored=matching");
	}
	const statusPromise = gitExecFileAsync(statusArgs, {
		cwd: worktreePath,
		env: gitOptionalLocksDisabledEnv(),
	});
	const conflictOperation = await conflictPromise;

	try {
		const { stdout } = await statusPromise;

		for (const line of stdout.split(/\r?\n/)) {
			if (!line) {
				continue;
			}

			if (line.startsWith("# branch.oid ")) {
				head = line.slice("# branch.oid ".length).trim();
				continue;
			}

			if (line.startsWith("# branch.head ")) {
				const branchHead = line.slice("# branch.head ".length).trim();
				branch = branchHead && branchHead !== "(detached)" ? `refs/heads/${branchHead}` : undefined;
				continue;
			}

			if (line.startsWith("# branch.upstream ")) {
				upstreamName = line.slice("# branch.upstream ".length).trim() || undefined;
				continue;
			}

			if (line.startsWith("# branch.ab ")) {
				upstreamAheadBehind = parseBranchAheadBehind(line);
				continue;
			}

			if (line.startsWith("1 ") || line.startsWith("2 ")) {
				const parts = line.split(" ");
				const xy = parts[1];
				const indexStatus = xy[0];
				const worktreeStatus = xy[1];

				if (line.startsWith("2 ")) {
					const tabParts = line.split("\t");
					const filePath = decodeGitCQuotedPath(tabParts[0].split(" ").slice(9).join(" "));
					const oldPath = decodeGitCQuotedPath(tabParts.slice(1).join("\t"));
					if (indexStatus !== ".") {
						entries.push({ path: filePath, status: parseStatusChar(indexStatus), area: "staged", oldPath });
					}
					if (worktreeStatus !== ".") {
						entries.push({
							path: filePath,
							status: parseStatusChar(worktreeStatus),
							area: "unstaged",
							oldPath,
						});
					}
				} else {
					const filePath = decodeGitCQuotedPath(parts.slice(8).join(" "));
					if (indexStatus !== ".") {
						entries.push({ path: filePath, status: parseStatusChar(indexStatus), area: "staged" });
					}
					if (worktreeStatus !== ".") {
						entries.push({ path: filePath, status: parseStatusChar(worktreeStatus), area: "unstaged" });
					}
				}
			} else if (line.startsWith("? ")) {
				const filePath = decodeGitCQuotedPath(line.slice(2));
				entries.push({ path: filePath, status: "untracked", area: "untracked" });
			} else if (line.startsWith("! ")) {
				ignoredPaths.push(decodeGitCQuotedPath(line.slice(2)));
			}
		}
		statusSucceeded = true;
	} catch {
		// Not a git repo or git not available.
	}

	const upstreamStatus: GitUpstreamStatus | undefined = statusSucceeded
		? upstreamName
			? {
					hasUpstream: true,
					upstreamName,
					ahead: upstreamAheadBehind?.ahead ?? 0,
					behind: upstreamAheadBehind?.behind ?? 0,
				}
			: { hasUpstream: false, ahead: 0, behind: 0 }
		: undefined;

	return {
		entries,
		conflictOperation,
		head,
		branch,
		...(options.includeIgnored ? { ignoredPaths } : {}),
		...(upstreamStatus ? { upstreamStatus } : {}),
	};
};

const parseBranchAheadBehind = (line: string): { ahead: number; behind: number } | null => {
	const match = line.match(/^# branch\.ab \+(\d+) -(\d+)$/);
	if (!match) {
		return null;
	}
	return {
		ahead: Number.parseInt(match[1], 10),
		behind: Number.parseInt(match[2], 10),
	};
};

const parseStatusChar = (char: string): GitFileStatus => {
	switch (char) {
		case "M":
			return "modified";
		case "A":
			return "added";
		case "D":
			return "deleted";
		case "R":
			return "renamed";
		case "C":
			return "copied";
		default:
			return "modified";
	}
};

export const detectConflictOperation = async (worktreePath: string): Promise<GitConflictOperation> => {
	const gitDir = await resolveGitDir(worktreePath);
	const mergeHead = path.join(gitDir, "MERGE_HEAD");
	const cherryPickHead = path.join(gitDir, "CHERRY_PICK_HEAD");
	const rebaseMergeDir = path.join(gitDir, "rebase-merge");
	const rebaseApplyDir = path.join(gitDir, "rebase-apply");

	try {
		if (existsSync(mergeHead)) {
			return "merge";
		}
		if (existsSync(rebaseMergeDir) || existsSync(rebaseApplyDir)) {
			return "rebase";
		}
		if (existsSync(cherryPickHead)) {
			return "cherry-pick";
		}
	} catch {
		return "unknown";
	}

	return "unknown";
};

export const resolveGitDir = async (worktreePath: string): Promise<string> => {
	const dotGitPath = path.join(worktreePath, ".git");

	try {
		const dotGitContents = await readFile(dotGitPath, "utf8");
		const match = dotGitContents.match(/^gitdir:\s*(.+)\s*$/m);
		if (match) {
			return path.resolve(worktreePath, match[1]);
		}
	} catch {
		// `.git` is likely a directory in a non-worktree checkout.
	}

	return dotGitPath;
};

export const isWithinWorktree = (
	pathApi: Pick<typeof path, "isAbsolute" | "relative" | "sep">,
	resolvedWorktree: string,
	resolvedTarget: string,
): boolean => {
	const relativeTarget = pathApi.relative(resolvedWorktree, resolvedTarget);
	return !(
		relativeTarget === "" ||
		relativeTarget === ".." ||
		relativeTarget.startsWith(`..${pathApi.sep}`) ||
		pathApi.isAbsolute(relativeTarget)
	);
};

const assertPathWithinWorktree = (worktreePath: string, filePath: string): void => {
	const resolvedWorktree = path.resolve(worktreePath);
	const resolvedTarget = path.resolve(worktreePath, filePath);
	if (!isWithinWorktree(path, resolvedWorktree, resolvedTarget)) {
		throw new Error(`Path "${filePath}" resolves outside the worktree`);
	}
};

const literalPathspec = (filePath: string): string => `:(literal)${filePath}`;

export const stageFile = async (worktreePath: string, filePath: string): Promise<void> => {
	assertPathWithinWorktree(worktreePath, filePath);
	await gitExecFileAsync(["add", "--", literalPathspec(filePath)], { cwd: worktreePath });
};

export const unstageFile = async (worktreePath: string, filePath: string): Promise<void> => {
	assertPathWithinWorktree(worktreePath, filePath);
	await gitExecFileAsync(["restore", "--staged", "--", literalPathspec(filePath)], { cwd: worktreePath });
};

export const discardChanges = async (worktreePath: string, filePath: string): Promise<void> => {
	assertPathWithinWorktree(worktreePath, filePath);

	let tracked = false;
	try {
		await gitExecFileAsync(["ls-files", "--error-unmatch", "--", literalPathspec(filePath)], {
			cwd: worktreePath,
		});
		tracked = true;
	} catch {
		// File is not tracked by git.
	}

	if (tracked) {
		await gitExecFileAsync(["restore", "--worktree", "--source=HEAD", "--", literalPathspec(filePath)], {
			cwd: worktreePath,
		});
		return;
	}

	await removeSafeUntrackedDiscardTarget(worktreePath, filePath, (targetPath) =>
		cleanUntrackedPaths(worktreePath, [targetPath]),
	);
};

const normalizeGitPathForCompare = (filePath: string): string => filePath.replace(/\\/g, "/").replace(/\/+$/, "");

const isTrackedPathSpec = (filePath: string, trackedPaths: readonly string[]): boolean => {
	const normalized = normalizeGitPathForCompare(filePath);
	return trackedPaths.some((trackedPath) => {
		const normalizedTracked = normalizeGitPathForCompare(trackedPath);
		return normalizedTracked === normalized || normalizedTracked.startsWith(`${normalized}/`);
	});
};

const listTrackedPathSpecs = async (worktreePath: string, filePaths: readonly string[]): Promise<string[]> => {
	const trackedPaths: string[] = [];
	for (let i = 0; i < filePaths.length; i += BULK_CHUNK_SIZE) {
		const chunk = filePaths.slice(i, i + BULK_CHUNK_SIZE);
		const { stdout } = await gitExecFileAsync(["ls-files", "-z", "--", ...chunk.map(literalPathspec)], {
			cwd: worktreePath,
		});
		for (const trackedPath of stdout.split("\0")) {
			if (trackedPath) {
				trackedPaths.push(trackedPath);
			}
		}
	}
	return trackedPaths;
};

const cleanUntrackedPaths = async (worktreePath: string, filePaths: readonly string[]): Promise<void> => {
	for (let i = 0; i < filePaths.length; i += BULK_CHUNK_SIZE) {
		const chunk = filePaths.slice(i, i + BULK_CHUNK_SIZE);
		if (chunk.length > 0) {
			await gitExecFileAsync(["clean", "-ffdx", "--", ...chunk.map(literalPathspec)], { cwd: worktreePath });
		}
	}
};

export const bulkDiscardChanges = async (worktreePath: string, filePaths: string[]): Promise<void> => {
	if (filePaths.length === 0) {
		return;
	}

	for (const filePath of filePaths) {
		assertPathWithinWorktree(worktreePath, filePath);
	}

	const trackedPathSpecs = await listTrackedPathSpecs(worktreePath, filePaths);
	const trackedPaths = filePaths.filter((filePath) => isTrackedPathSpec(filePath, trackedPathSpecs));
	const untrackedPaths = filePaths.filter((filePath) => !isTrackedPathSpec(filePath, trackedPathSpecs));

	await removeSafeUntrackedDiscardTargets(
		worktreePath,
		untrackedPaths,
		(targetPaths) => cleanUntrackedPaths(worktreePath, targetPaths),
		async () => {
			for (let i = 0; i < trackedPaths.length; i += BULK_CHUNK_SIZE) {
				const chunk = trackedPaths.slice(i, i + BULK_CHUNK_SIZE);
				await gitExecFileAsync(
					["restore", "--worktree", "--source=HEAD", "--", ...chunk.map(literalPathspec)],
					{ cwd: worktreePath },
				);
			}
		},
	);
};

export const bulkStageFiles = async (worktreePath: string, filePaths: string[]): Promise<void> => {
	if (filePaths.length === 0) {
		return;
	}
	for (const filePath of filePaths) {
		assertPathWithinWorktree(worktreePath, filePath);
	}
	for (let i = 0; i < filePaths.length; i += BULK_CHUNK_SIZE) {
		const chunk = filePaths.slice(i, i + BULK_CHUNK_SIZE);
		await gitExecFileAsync(["add", "--", ...chunk.map(literalPathspec)], { cwd: worktreePath });
	}
};

export const bulkUnstageFiles = async (worktreePath: string, filePaths: string[]): Promise<void> => {
	if (filePaths.length === 0) {
		return;
	}
	for (const filePath of filePaths) {
		assertPathWithinWorktree(worktreePath, filePath);
	}
	for (let i = 0; i < filePaths.length; i += BULK_CHUNK_SIZE) {
		const chunk = filePaths.slice(i, i + BULK_CHUNK_SIZE);
		await gitExecFileAsync(["restore", "--staged", "--", ...chunk.map(literalPathspec)], { cwd: worktreePath });
	}
};
