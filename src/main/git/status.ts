import { access, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { decodeGitCQuotedPath } from "../../shared/git-cquoted-path";
import { removeSafeUntrackedDiscardTarget } from "../../shared/git-discard-path-safety";
import type {
	GitBranchCompareResult,
	GitCommitResult,
	GitConflictKind,
	GitConflictOperation,
	GitDiffPayload,
	GitFileStatus,
	GitStagingArea,
	GitStatusEntry,
	GitStatusResult,
	GitUpstreamRelation,
	GitUpstreamStatus,
	SourceControlPullRequestInfo,
} from "../../shared/source-control/types";
import { gitExecFileAsync, gitOptionalLocksDisabledEnv } from "./runner";
import { assertGhCommandSucceeded } from "./gh-auth";

const BULK_CHUNK_SIZE = 100;
const MAX_TEXT_DIFF_BYTES = 512 * 1024;

export type GetStatusOptions = {
	includeIgnored?: boolean;
};

const pathExists = (filePath: string): Promise<boolean> =>
	access(filePath).then(
		() => true,
		() => false,
	);

export const getStatus = async (worktreePath: string, options: GetStatusOptions = {}): Promise<GitStatusResult> => {
	const entries: GitStatusEntry[] = [];
	const ignoredPaths: string[] = [];
	let head: string | undefined;
	let branch: string | undefined;
	let upstreamName: string | undefined;
	let upstreamAheadBehind: { ahead: number; behind: number } | null = null;

	const conflictPromise = detectConflictOperation(worktreePath);
	const statusArgs = ["-c", "core.quotePath=false", "status", "--porcelain=v2", "--branch", "--untracked-files=all"];
	if (options.includeIgnored) {
		statusArgs.push("--ignored=matching");
	}
	const statusPromise = gitExecFileAsync(statusArgs, {
		cwd: worktreePath,
		env: gitOptionalLocksDisabledEnv(),
	});
	const conflictOperation = await conflictPromise;

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

		if (line.startsWith("u ")) {
			const parts = line.split(" ");
			const conflictStatus = parts[1] ?? "UU";
			const filePath = decodeGitCQuotedPath(parts.slice(10).join(" "));
			entries.push({
				path: filePath,
				status: parseConflictStatus(conflictStatus),
				area: "unstaged",
				conflictKind: parseConflictKind(conflictStatus),
			});
		} else if (line.startsWith("1 ") || line.startsWith("2 ")) {
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
	await applyLineStats(worktreePath, entries);

	const configuredUpstreamStatus: GitUpstreamStatus | null = upstreamName
		? makeUpstreamStatus({
				hasUpstream: true,
				upstreamName,
				ahead: upstreamAheadBehind?.ahead ?? 0,
				behind: upstreamAheadBehind?.behind ?? 0,
				isConfigured: true,
			})
		: null;
	const upstreamStatus =
		configuredUpstreamStatus ??
		(await resolveSameNameOriginUpstream(worktreePath, branch)) ??
		makeUpstreamStatus({ hasUpstream: false, ahead: 0, behind: 0, isConfigured: false });

	return {
		entries,
		conflictOperation,
		head,
		branch,
		...(options.includeIgnored ? { ignoredPaths } : {}),
		upstreamStatus,
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

const classifyUpstreamRelation = (
	status: Pick<GitUpstreamStatus, "hasUpstream" | "ahead" | "behind">,
): GitUpstreamRelation => {
	if (!status.hasUpstream) {
		return "none";
	}
	if (status.ahead > 0 && status.behind > 0) {
		return "diverged";
	}
	if (status.ahead > 0) {
		return "ahead";
	}
	if (status.behind > 0) {
		return "behind";
	}
	return "up_to_date";
};

const makeUpstreamStatus = (status: Omit<GitUpstreamStatus, "relation">): GitUpstreamStatus => ({
	...status,
	relation: classifyUpstreamRelation(status),
});

const branchNameFromRef = (branch: string | undefined): string | null => {
	const prefix = "refs/heads/";
	if (!branch?.startsWith(prefix)) {
		return null;
	}
	return branch.slice(prefix.length) || null;
};

const countAheadBehind = async (
	worktreePath: string,
	baseRef: string,
	headRef: string,
): Promise<{ ahead: number; behind: number }> => {
	const { stdout } = await gitExecFileAsync(["rev-list", "--left-right", "--count", `${baseRef}...${headRef}`], {
		cwd: worktreePath,
	});
	const [behindRaw, aheadRaw] = stdout.trim().split(/\s+/);
	return {
		ahead: Number.parseInt(aheadRaw || "0", 10),
		behind: Number.parseInt(behindRaw || "0", 10),
	};
};

const resolveSameNameOriginUpstream = async (
	worktreePath: string,
	branch: string | undefined,
): Promise<GitUpstreamStatus | null> => {
	const branchName = branchNameFromRef(branch);
	if (!branchName) {
		return null;
	}
	const remoteRef = `refs/remotes/origin/${branchName}`;
	try {
		await gitExecFileAsync(["show-ref", "--verify", "--quiet", remoteRef], { cwd: worktreePath });
		const { ahead, behind } = await countAheadBehind(worktreePath, `origin/${branchName}`, "HEAD");
		return makeUpstreamStatus({
			hasUpstream: true,
			upstreamName: `origin/${branchName}`,
			ahead,
			behind,
			isConfigured: false,
		});
	} catch {
		return null;
	}
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

type LineStats = { added: number; removed: number };

const parseNumstatCount = (value: string): number | null => {
	if (value === "-") {
		return null;
	}
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : null;
};

const parseNumstatOutput = (output: string): Map<string, LineStats> => {
	const fields = output.split("\0").filter((field) => field.length > 0);
	const statsByPath = new Map<string, LineStats>();
	for (let index = 0; index < fields.length; ) {
		const header = fields[index];
		index += 1;
		const [addedRaw, removedRaw, inlinePath = ""] = header.split("\t");
		const added = parseNumstatCount(addedRaw ?? "");
		const removed = parseNumstatCount(removedRaw ?? "");
		if (added === null || removed === null) {
			if (!inlinePath) {
				index += 2;
			}
			continue;
		}

		let filePath = inlinePath;
		if (!filePath) {
			// With --numstat -z, renamed and copied paths are emitted as: stats\0old\0new\0.
			filePath = fields[index + 1] ?? "";
			index += 2;
		}
		if (filePath) {
			statsByPath.set(filePath, { added, removed });
		}
	}
	return statsByPath;
};

const readLineStats = async (worktreePath: string, area: Extract<GitStagingArea, "staged" | "unstaged">) => {
	const args =
		area === "staged"
			? ["diff", "--cached", "--numstat", "-z", "--find-renames"]
			: ["diff", "--numstat", "-z", "--find-renames"];
	const { stdout } = await gitExecFileAsync(args, { cwd: worktreePath, env: gitOptionalLocksDisabledEnv() });
	return parseNumstatOutput(stdout);
};

const applyLineStats = async (worktreePath: string, entries: GitStatusEntry[]): Promise<void> => {
	const hasStagedEntries = entries.some((entry) => entry.area === "staged");
	const hasUnstagedEntries = entries.some((entry) => entry.area === "unstaged");
	const [stagedStats, unstagedStats] = await Promise.all([
		hasStagedEntries
			? readLineStats(worktreePath, "staged")
			: Promise.resolve(new Map<string, { added: number; removed: number }>()),
		hasUnstagedEntries
			? readLineStats(worktreePath, "unstaged")
			: Promise.resolve(new Map<string, { added: number; removed: number }>()),
	]);
	for (const entry of entries) {
		const stats = entry.area === "staged" ? stagedStats.get(entry.path) : unstagedStats.get(entry.path);
		if (stats) {
			entry.added = stats.added;
			entry.removed = stats.removed;
		}
	}
};

const parseConflictKind = (status: string): GitConflictKind => {
	switch (status) {
		case "DD":
			return "both_deleted";
		case "AU":
			return "added_by_us";
		case "UD":
			return "deleted_by_them";
		case "UA":
			return "added_by_them";
		case "DU":
			return "deleted_by_us";
		case "AA":
			return "both_added";
		default:
			return "both_modified";
	}
};

const parseConflictStatus = (status: string): GitFileStatus => {
	switch (status) {
		case "DD":
		case "DU":
		case "UD":
			return "deleted";
		case "AA":
		case "AU":
		case "UA":
			return "added";
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
		if (await pathExists(mergeHead)) {
			return "merge";
		}
		if ((await pathExists(rebaseMergeDir)) || (await pathExists(rebaseApplyDir))) {
			return "rebase";
		}
		if (await pathExists(cherryPickHead)) {
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

const hasHead = async (worktreePath: string): Promise<boolean> => {
	try {
		await gitExecFileAsync(["rev-parse", "--verify", "HEAD"], { cwd: worktreePath });
		return true;
	} catch {
		return false;
	}
};

const hasUnstagedChange = async (worktreePath: string, filePath: string): Promise<boolean> => {
	try {
		await gitExecFileAsync(["diff", "--quiet", "--", literalPathspec(filePath)], { cwd: worktreePath });
		return false;
	} catch (error) {
		if (typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 1) {
			return true;
		}
		throw error;
	}
};

const restoreStagedPathFromHead = async (
	worktreePath: string,
	filePath: string,
	options: { preserveWorktree: boolean },
): Promise<void> => {
	const args = options.preserveWorktree
		? ["restore", "--staged", "--source=HEAD", "--", literalPathspec(filePath)]
		: ["restore", "--staged", "--worktree", "--source=HEAD", "--", literalPathspec(filePath)];
	await gitExecFileAsync(args, { cwd: worktreePath });
};

export const stageFile = async (worktreePath: string, filePath: string): Promise<void> => {
	assertPathWithinWorktree(worktreePath, filePath);
	await gitExecFileAsync(["add", "--", literalPathspec(filePath)], { cwd: worktreePath });
};

export const unstageFile = async (worktreePath: string, filePath: string): Promise<void> => {
	assertPathWithinWorktree(worktreePath, filePath);
	if (!(await hasHead(worktreePath))) {
		await gitExecFileAsync(["rm", "--cached", "-r", "--", literalPathspec(filePath)], { cwd: worktreePath });
		return;
	}
	const renameEntry = findStagedRenameEntry(await getStatus(worktreePath), filePath);
	await gitExecFileAsync(["restore", "--staged", "--", ...stagedPathspecsFor(filePath, renameEntry)], {
		cwd: worktreePath,
	});
};

const normalizeGitPathForCompare = (filePath: string): string => filePath.replace(/\\/g, "/").replace(/\/+$/, "");

const isTrackedPathSpec = (filePath: string, trackedPaths: readonly string[]): boolean => {
	const normalized = normalizeGitPathForCompare(filePath);
	return trackedPaths.some((trackedPath) => {
		const normalizedTracked = normalizeGitPathForCompare(trackedPath);
		return normalizedTracked === normalized || normalizedTracked.startsWith(`${normalized}/`);
	});
};

const listHeadPathSpecs = async (worktreePath: string, filePaths: readonly string[]): Promise<string[]> => {
	const trackedPaths: string[] = [];
	for (let i = 0; i < filePaths.length; i += BULK_CHUNK_SIZE) {
		const chunk = filePaths.slice(i, i + BULK_CHUNK_SIZE);
		const { stdout } = await gitExecFileAsync(
			["ls-tree", "-r", "-z", "--name-only", "HEAD", "--", ...chunk.map(literalPathspec)],
			{
				cwd: worktreePath,
			},
		);
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
			await gitExecFileAsync(["clean", "-ffd", "--", ...chunk.map(literalPathspec)], { cwd: worktreePath });
		}
	}
};

const findStagedRenameEntry = (status: GitStatusResult, filePath: string): GitStatusEntry | undefined =>
	status.entries.find(
		(entry) => entry.area === "staged" && entry.status === "renamed" && entry.path === filePath && entry.oldPath,
	);

const stagedPathspecsFor = (filePath: string, renameEntry?: GitStatusEntry): string[] => {
	if (renameEntry?.oldPath) {
		return [literalPathspec(renameEntry.oldPath), literalPathspec(filePath)];
	}
	return [literalPathspec(filePath)];
};

export const discardChanges = async (
	worktreePath: string,
	filePath: string,
	area: GitStagingArea,
	options: { status?: GitStatusResult } = {},
): Promise<void> => {
	assertPathWithinWorktree(worktreePath, filePath);

	if (area === "untracked") {
		await removeSafeUntrackedDiscardTarget(worktreePath, filePath, (targetPath) =>
			cleanUntrackedPaths(worktreePath, [targetPath]),
		);
		return;
	}

	if (area === "unstaged") {
		await gitExecFileAsync(["restore", "--worktree", "--", literalPathspec(filePath)], { cwd: worktreePath });
		return;
	}

	const headExists = await hasHead(worktreePath);
	const renameEntry = findStagedRenameEntry(options.status ?? (await getStatus(worktreePath)), filePath);
	if (renameEntry?.oldPath) {
		const preserveWorktree = await hasUnstagedChange(worktreePath, filePath);
		assertPathWithinWorktree(worktreePath, renameEntry.oldPath);
		await gitExecFileAsync(["restore", "--staged", "--", ...stagedPathspecsFor(filePath, renameEntry)], {
			cwd: worktreePath,
		});
		await gitExecFileAsync(["restore", "--worktree", "--source=HEAD", "--", literalPathspec(renameEntry.oldPath)], {
			cwd: worktreePath,
		});
		if (!preserveWorktree) {
			await removeSafeUntrackedDiscardTarget(worktreePath, filePath, (targetPath) =>
				cleanUntrackedPaths(worktreePath, [targetPath]),
			);
		}
		return;
	}

	let trackedInIndex = false;
	try {
		await gitExecFileAsync(["ls-files", "--error-unmatch", "--", literalPathspec(filePath)], {
			cwd: worktreePath,
		});
		trackedInIndex = true;
	} catch {
		// File is not tracked by git.
	}

	const trackedInHead = headExists && isTrackedPathSpec(filePath, await listHeadPathSpecs(worktreePath, [filePath]));
	if (trackedInHead) {
		await restoreStagedPathFromHead(worktreePath, filePath, {
			preserveWorktree: await hasUnstagedChange(worktreePath, filePath),
		});
		return;
	}

	if (trackedInIndex) {
		const preserveWorktree = await hasUnstagedChange(worktreePath, filePath);
		await unstageFile(worktreePath, filePath);
		if (!preserveWorktree) {
			await removeSafeUntrackedDiscardTarget(worktreePath, filePath, (targetPath) =>
				cleanUntrackedPaths(worktreePath, [targetPath]),
			);
		}
		return;
	}

	await removeSafeUntrackedDiscardTarget(worktreePath, filePath, (targetPath) =>
		cleanUntrackedPaths(worktreePath, [targetPath]),
	);
};

export const bulkDiscardChanges = async (
	worktreePath: string,
	entries: { relativePath: string; area: GitStagingArea }[],
): Promise<void> => {
	if (entries.length === 0) {
		return;
	}

	const status = entries.some((entry) => entry.area === "staged") ? await getStatus(worktreePath) : undefined;
	for (const entry of entries) {
		await discardChanges(worktreePath, entry.relativePath, entry.area, { status });
	}
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
	const headExists = await hasHead(worktreePath);
	const status = headExists ? await getStatus(worktreePath) : undefined;
	for (let i = 0; i < filePaths.length; i += BULK_CHUNK_SIZE) {
		const chunk = filePaths.slice(i, i + BULK_CHUNK_SIZE);
		if (headExists) {
			const pathspecs = chunk.flatMap((filePath) =>
				stagedPathspecsFor(filePath, status && findStagedRenameEntry(status, filePath)),
			);
			await gitExecFileAsync(["restore", "--staged", "--", ...pathspecs], { cwd: worktreePath });
		} else {
			await gitExecFileAsync(["rm", "--cached", "-r", "--", ...chunk.map(literalPathspec)], { cwd: worktreePath });
		}
	}
};

const currentBranchName = async (worktreePath: string): Promise<string> => {
	const { stdout } = await gitExecFileAsync(["branch", "--show-current"], { cwd: worktreePath });
	const branch = stdout.trim();
	if (!branch) {
		throw new Error("Cannot determine the current branch.");
	}
	return branch;
};

export type GetDiffInput =
	| { relativePath: string; kind: "unstaged" | "staged" | "untracked" }
	| { relativePath: string; kind: "branch"; baseRef: string; headRef: string }
	| { relativePath: string; kind: "commit"; commitRef: string };

const isMaxBufferError = (error: unknown): boolean =>
	typeof error === "object" &&
	error !== null &&
	"code" in error &&
	(error as { code?: string }).code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";

const diffArgsForInput = (input: GetDiffInput): string[] => {
	const pathspec = literalPathspec(input.relativePath);
	switch (input.kind) {
		case "staged":
			return ["diff", "--cached", "--binary", "--", pathspec];
		case "unstaged":
			return ["diff", "--binary", "--", pathspec];
		case "untracked":
			return [];
		case "branch":
			return ["diff", "--binary", `${input.baseRef}...${input.headRef}`, "--", pathspec];
		case "commit":
			return ["show", "--format=", "--binary", input.commitRef, "--", pathspec];
		default:
			return assertNever(input);
	}
};

const titleForDiff = (input: GetDiffInput): string => {
	switch (input.kind) {
		case "staged":
			return `${input.relativePath} (staged)`;
		case "unstaged":
			return `${input.relativePath} (unstaged)`;
		case "untracked":
			return `${input.relativePath} (untracked)`;
		case "branch":
			return `${input.relativePath} (${input.baseRef}...${input.headRef})`;
		case "commit":
			return `${input.relativePath} (${input.commitRef})`;
		default:
			return assertNever(input);
	}
};

export const getDiff = async (worktreePath: string, input: GetDiffInput): Promise<GitDiffPayload> => {
	assertPathWithinWorktree(worktreePath, input.relativePath);
	const title = titleForDiff(input);

	if (input.kind === "branch") {
		await assertSafeGitRevision(worktreePath, input.baseRef);
		await assertSafeGitRevision(worktreePath, input.headRef);
	}
	if (input.kind === "commit") {
		await assertSafeGitRevision(worktreePath, input.commitRef);
	}

	if (input.kind === "untracked") {
		return {
			kind: "unsupported",
			path: input.relativePath,
			title,
			diffKind: input.kind,
			message: "Untracked file diffs are not displayed yet.",
		};
	}

	let stdout: string;
	try {
		({ stdout } = await gitExecFileAsync(diffArgsForInput(input), {
			cwd: worktreePath,
			maxBuffer: MAX_TEXT_DIFF_BYTES + 1024,
		}));
	} catch (error) {
		if (isMaxBufferError(error)) {
			return {
				kind: "too_large",
				path: input.relativePath,
				title,
				diffKind: input.kind,
				message: "This diff is too large to display.",
			};
		}
		throw error;
	}

	if (
		stdout.includes("GIT binary patch") ||
		/^Binary files /m.test(stdout) ||
		/^diff --git .+\n(?:.*\n)*?Binary files /m.test(stdout)
	) {
		return {
			kind: "binary",
			path: input.relativePath,
			title,
			diffKind: input.kind,
			message: "Binary file diffs are not displayed.",
		};
	}

	if (Buffer.byteLength(stdout, "utf8") > MAX_TEXT_DIFF_BYTES) {
		return {
			kind: "too_large",
			path: input.relativePath,
			title,
			diffKind: input.kind,
			message: "This diff is too large to display.",
		};
	}

	return { kind: "text", path: input.relativePath, title, patch: stdout, diffKind: input.kind };
};

export const getUpstreamStatus = async (worktreePath: string): Promise<GitUpstreamStatus> => {
	const status = await getStatus(worktreePath);
	return status.upstreamStatus ?? makeUpstreamStatus({ hasUpstream: false, ahead: 0, behind: 0, isConfigured: false });
};

const stripCredentialsFromGitOutput = (output: string): string => output.replace(/(?<=\/\/)([^@\s/]+)@/g, "***@");

const gitErrorOutput = (error: unknown): string => {
	if (typeof error !== "object" || error === null) {
		return String(error);
	}
	const output = [
		"stderr" in error ? (error as { stderr?: unknown }).stderr : undefined,
		"stdout" in error ? (error as { stdout?: unknown }).stdout : undefined,
	]
		.map((value) => (Buffer.isBuffer(value) ? value.toString("utf8") : typeof value === "string" ? value : ""))
		.join("\n")
		.trim();
	const message = output || (error instanceof Error ? error.message : String(error));
	return stripCredentialsFromGitOutput(message);
};

const actionableGitErrorMessage = (action: string, error: unknown): string => {
	const output = gitErrorOutput(error);
	const normalized = output.toLowerCase();
	if (normalized.includes("authentication failed") || normalized.includes("permission denied")) {
		return `${action} failed because git authentication was rejected. Check the remote credentials and try again.\n\n${output}`;
	}
	if (normalized.includes("no upstream branch") || normalized.includes("no tracking information")) {
		return `${action} needs an upstream branch. Publish this branch or set an upstream before retrying.\n\n${output}`;
	}
	if (normalized.includes("non-fast-forward") || normalized.includes("fetch first")) {
		return `${action} was rejected because the remote has commits that are not local. Fetch and rebase or merge before pushing.\n\n${output}`;
	}
	if (normalized.includes("not possible to fast-forward") || normalized.includes("divergent branches")) {
		return `${action} could not fast-forward. Fetch and rebase or merge before retrying.\n\n${output}`;
	}
	if (normalized.includes("conflict") || normalized.includes("could not apply")) {
		return `${action} stopped because of conflicts. Resolve the conflicts, then continue or abort the operation.\n\n${output}`;
	}
	return `${action} failed.\n\n${output}`;
};

const runRemoteOperation = async (action: string, operation: () => Promise<void>): Promise<void> => {
	try {
		await operation();
	} catch (error) {
		throw new Error(actionableGitErrorMessage(action, error));
	}
};

export const commitStagedChanges = async (worktreePath: string, message: string): Promise<GitCommitResult> => {
	const summary = message.trim();
	if (!summary) {
		throw new Error("Commit message is required.");
	}
	const { stdout: rootOutput } = await gitExecFileAsync(["rev-parse", "--show-toplevel"], { cwd: worktreePath });
	const repositoryRoot = path.resolve(await realpath(rootOutput.trim()));
	const selectedRoot = path.resolve(await realpath(worktreePath));
	if (repositoryRoot !== selectedRoot) {
		throw new Error("Committing from a subdirectory project is not supported.");
	}
	await runRemoteOperation("Commit", async () => {
		await gitExecFileAsync(["commit", "-m", summary], { cwd: worktreePath });
	});
	const { stdout: shaOutput } = await gitExecFileAsync(["rev-parse", "HEAD"], { cwd: worktreePath });
	return { sha: shaOutput.trim(), summary };
};

export const fetchRemote = async (worktreePath: string): Promise<void> => {
	await runRemoteOperation("Fetch", async () => {
		await gitExecFileAsync(["fetch", "--all", "--prune"], { cwd: worktreePath });
	});
};

const remoteBranchFromUpstreamName = (upstreamName: string | undefined): { remote: string; branch: string } | null => {
	const parts = upstreamName?.split("/") ?? [];
	if (parts.length < 2 || !parts[0]) {
		return null;
	}
	return { remote: parts[0], branch: parts.slice(1).join("/") };
};

const pushToUpstream = async (
	worktreePath: string,
	options: { forceWithLease: boolean; upstream?: GitUpstreamStatus },
): Promise<void> => {
	const upstream = options.upstream ?? (await getUpstreamStatus(worktreePath));
	if (!upstream.hasUpstream) {
		throw new Error("No upstream branch is configured for the current branch.");
	}
	const forceArgs = options.forceWithLease ? ["--force-with-lease"] : [];
	if (upstream.isConfigured) {
		await gitExecFileAsync(["push", ...forceArgs], { cwd: worktreePath });
		return;
	}
	const target = remoteBranchFromUpstreamName(upstream.upstreamName);
	if (!target) {
		throw new Error("No upstream branch is configured for the current branch.");
	}
	await gitExecFileAsync(["push", ...forceArgs, "-u", target.remote, `HEAD:${target.branch}`], { cwd: worktreePath });
};

export const pushRemote = async (worktreePath: string): Promise<void> => {
	await runRemoteOperation("Push", async () => {
		await pushToUpstream(worktreePath, { forceWithLease: false });
	});
};

export const forcePushWithLeaseRemote = async (worktreePath: string): Promise<void> => {
	await runRemoteOperation("Force push with lease", async () => {
		const upstream = await getUpstreamStatus(worktreePath);
		if (upstream.relation !== "diverged") {
			throw new Error("Force push with lease is only available for diverged branches.");
		}
		await pushToUpstream(worktreePath, { forceWithLease: true, upstream });
	});
};

export const pullRemote = async (worktreePath: string): Promise<void> => {
	await runRemoteOperation("Pull", async () => {
		const upstream = await getUpstreamStatus(worktreePath);
		if (!upstream.hasUpstream) {
			throw new Error("No upstream branch is configured for the current branch.");
		}
		if (upstream.isConfigured) {
			await gitExecFileAsync(["pull", "--ff-only"], { cwd: worktreePath });
			return;
		}
		const target = remoteBranchFromUpstreamName(upstream.upstreamName);
		if (!target) {
			throw new Error("No upstream branch is configured for the current branch.");
		}
		await gitExecFileAsync(["pull", "--ff-only", target.remote, target.branch], { cwd: worktreePath });
	});
};

export const syncRemote = async (worktreePath: string): Promise<void> => {
	const upstream = await getUpstreamStatus(worktreePath);
	if (upstream.relation === "diverged" || (upstream.ahead > 0 && upstream.behind > 0)) {
		throw new Error("Branch has diverged. Rebase or merge before syncing.");
	}
	if (upstream.behind > 0) {
		await pullRemote(worktreePath);
	}
	if (upstream.ahead > 0) {
		await pushRemote(worktreePath);
	}
};

export const fastForwardBranch = async (worktreePath: string): Promise<void> => {
	await pullRemote(worktreePath);
};

export const publishBranch = async (worktreePath: string): Promise<void> => {
	await runRemoteOperation("Publish", async () => {
		const branch = await currentBranchName(worktreePath);
		await gitExecFileAsync(["push", "-u", "origin", `HEAD:${branch}`], { cwd: worktreePath });
	});
};

export const assertSafeGitRevision = async (worktreePath: string, ref: string): Promise<void> => {
	if (ref.startsWith("-")) {
		throw new Error("Git revision must not start with '-'.");
	}
	await gitExecFileAsync(["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`], { cwd: worktreePath });
};

export const rebaseFromBase = async (worktreePath: string, baseRef = "origin/main"): Promise<void> => {
	await assertSafeGitRevision(worktreePath, baseRef);
	await runRemoteOperation("Rebase", async () => {
		await gitExecFileAsync(["rebase", baseRef], { cwd: worktreePath });
	});
};

const parseAheadBehind = (stdout: string): { ahead: number; behind: number } => {
	const [behind, ahead] = stdout.trim().split(/\s+/);
	return { ahead: Number.parseInt(ahead || "0", 10), behind: Number.parseInt(behind || "0", 10) };
};

const parseNameStatusOutput = (output: string): { status: GitFileStatus; path: string; oldPath?: string }[] => {
	const fields = output.split("\0").filter(Boolean);
	const files: { status: GitFileStatus; path: string; oldPath?: string }[] = [];
	for (let index = 0; index < fields.length; ) {
		const statusCode = fields[index];
		index += 1;
		if (!statusCode) {
			continue;
		}
		if (statusCode.startsWith("R")) {
			const oldPath = fields[index] ?? "";
			const filePath = fields[index + 1] ?? oldPath;
			index += 2;
			files.push({ status: "renamed", oldPath, path: filePath });
			continue;
		}
		if (statusCode.startsWith("C")) {
			const oldPath = fields[index] ?? "";
			const filePath = fields[index + 1] ?? oldPath;
			index += 2;
			files.push({ status: "copied", oldPath, path: filePath });
			continue;
		}
		const filePath = fields[index] ?? "";
		index += 1;
		files.push({ status: parseStatusChar(statusCode[0]), path: filePath });
	}
	return files.filter((entry) => Boolean(entry.path));
};

export const getBranchCompare = async (
	worktreePath: string,
	input: { baseRef: string; headRef: string },
): Promise<GitBranchCompareResult> => {
	await assertSafeGitRevision(worktreePath, input.baseRef);
	await assertSafeGitRevision(worktreePath, input.headRef);
	const { stdout: countOutput } = await gitExecFileAsync(
		["rev-list", "--left-right", "--count", `${input.baseRef}...${input.headRef}`],
		{ cwd: worktreePath },
	);
	const { ahead, behind } = parseAheadBehind(countOutput);
	const { stdout: filesOutput } = await gitExecFileAsync(
		["diff", "--name-status", "-z", "--find-renames", `${input.baseRef}...${input.headRef}`],
		{ cwd: worktreePath },
	);
	const files = parseNameStatusOutput(filesOutput);
	return { baseRef: input.baseRef, headRef: input.headRef, ahead, behind, files };
};

export const abortConflictOperation = async (
	worktreePath: string,
	operation: Exclude<GitConflictOperation, "unknown">,
): Promise<void> => {
	switch (operation) {
		case "merge":
			await gitExecFileAsync(["merge", "--abort"], { cwd: worktreePath });
			return;
		case "rebase":
			await gitExecFileAsync(["rebase", "--abort"], { cwd: worktreePath });
			return;
		case "cherry-pick":
			await gitExecFileAsync(["cherry-pick", "--abort"], { cwd: worktreePath });
			return;
		default:
			return assertNever(operation);
	}
};

const parsePullRequestState = (value: string): SourceControlPullRequestInfo["state"] => {
	const normalized = value.trim().toLowerCase();
	if (normalized === "open" || normalized === "closed" || normalized === "merged") {
		return normalized;
	}
	return "unknown";
};

const parsePullRequestPayload = (parsed: {
	title?: string;
	url?: string;
	state?: string;
	number?: number;
}): SourceControlPullRequestInfo => ({
	title: parsed.title ?? "Pull request",
	url: parsed.url ?? "",
	state: parsePullRequestState(parsed.state ?? "unknown"),
	number: typeof parsed.number === "number" ? parsed.number : undefined,
});

const runGhCommand = async (
	worktreePath: string,
	args: string[],
	context: string,
): Promise<{ stdout: string; stderr: string }> => {
	try {
		return await gitExecFileAsync(args, { cwd: worktreePath }, "gh");
	} catch (error) {
		return assertGhCommandSucceeded(error, context);
	}
};

export const createPullRequest = async (
	worktreePath: string,
	input: { title: string; body: string },
): Promise<SourceControlPullRequestInfo> => {
	const { stdout: createOutput } = await runGhCommand(
		worktreePath,
		["pr", "create", "--title", input.title, "--body", input.body],
		"Create pull request failed",
	);
	const prRef = createOutput.trim();
	const { stdout } = await runGhCommand(
		worktreePath,
		["pr", "view", prRef, "--json", "title,url,state,number"],
		"Load created pull request failed",
	);
	const parsed = JSON.parse(stdout) as { title?: string; url?: string; state?: string; number?: number };
	return {
		...parsePullRequestPayload(parsed),
		title: parsed.title ?? input.title,
		url: parsed.url ?? prRef,
	};
};

export const getPullRequestInfo = async (worktreePath: string): Promise<SourceControlPullRequestInfo> => {
	const { stdout } = await runGhCommand(
		worktreePath,
		["pr", "view", "--json", "title,url,state,number"],
		"Load pull request failed",
	);
	const parsed = JSON.parse(stdout) as { title?: string; url?: string; state?: string; number?: number };
	return parsePullRequestPayload(parsed);
};

const assertNever = (value: never): never => {
	throw new Error(`Unhandled source control value: ${String(value)}`);
};
