import type {
	GitCommitFilesResult,
	GitFileStatus,
	GitHistoryEntry,
	GitHistoryResult,
} from "../../shared/source-control/types";
import { gitExecFileAsync } from "./runner";
import { assertSafeGitRevision, getUpstreamStatus } from "./status";

const DEFAULT_HISTORY_LIMIT = 50;
const FIELD_SEPARATOR = "\x1f";

export type GetHistoryInput = {
	limit?: number;
};

export type GetCommitFilesInput = {
	commitRef: string;
};

const parseDecorations = (decorations: string): string[] => {
	const trimmed = decorations.trim();
	if (!trimmed) {
		return [];
	}
	return trimmed
		.replace(/^\(/, "")
		.replace(/\)$/, "")
		.split(", ")
		.map((ref) => ref.trim())
		.filter((ref) => ref.length > 0 && !ref.startsWith("HEAD"));
};

const parseHistoryLine = (line: string): GitHistoryEntry | null => {
	const parts = line.split(FIELD_SEPARATOR);
	if (parts.length < 6) {
		return null;
	}
	const [sha, shortSha, subject, author, authorDate, decorations] = parts;
	if (!sha || !shortSha || !author || !authorDate) {
		return null;
	}
	return {
		sha,
		shortSha,
		subject,
		author,
		authorDate,
		refs: parseDecorations(decorations ?? ""),
	};
};

const parseNameStatusToken = (token: string): GitFileStatus => {
	switch (token.charAt(0)) {
		case "A":
			return "added";
		case "D":
			return "deleted";
		case "M":
			return "modified";
		case "R":
			return "renamed";
		case "C":
			return "copied";
		default:
			return "modified";
	}
};

const parseCommitFiles = (stdout: string): GitCommitFilesResult["files"] => {
	const tokens = stdout.split("\0").filter((token) => token.length > 0);
	const files: GitCommitFilesResult["files"] = [];
	for (let index = 0; index < tokens.length; index += 1) {
		const statusToken = tokens[index];
		if (!statusToken) {
			continue;
		}
		const status = parseNameStatusToken(statusToken);
		if (status === "renamed" || status === "copied") {
			const oldPath = tokens[index + 1];
			const path = tokens[index + 2];
			if (!path) {
				continue;
			}
			files.push({ path, status, oldPath });
			index += 2;
			continue;
		}
		const path = tokens[index + 1];
		if (!path) {
			continue;
		}
		files.push({ path, status });
		index += 1;
	}
	return files;
};

export const getHistory = async (worktreePath: string, input: GetHistoryInput = {}): Promise<GitHistoryResult> => {
	const limit = input.limit ?? DEFAULT_HISTORY_LIMIT;
	try {
		await gitExecFileAsync(["rev-parse", "--verify", "HEAD"], { cwd: worktreePath });
	} catch {
		return { entries: [], incomingCount: 0, outgoingCount: 0 };
	}
	const format = ["%H", "%h", "%s", "%an", "%aI", "%d"].join(FIELD_SEPARATOR);
	const { stdout: logStdout } = await gitExecFileAsync(
		["-c", "core.quotePath=false", "log", `-n`, String(limit), `--format=${format}`, "HEAD"],
		{ cwd: worktreePath },
	);

	const entries = logStdout
		.split(/\r?\n/)
		.map(parseHistoryLine)
		.filter((entry): entry is GitHistoryEntry => entry !== null);

	const upstreamStatus = await getUpstreamStatus(worktreePath);
	if (!upstreamStatus.hasUpstream || !upstreamStatus.upstreamName) {
		return { entries, incomingCount: 0, outgoingCount: 0 };
	}

	const upstreamName = upstreamStatus.upstreamName;
	const incomingCount = upstreamStatus.behind;
	const outgoingCount = upstreamStatus.ahead;
	const { stdout: outgoingShasStdout } =
		outgoingCount > 0
			? await gitExecFileAsync(["rev-list", `${upstreamName}..HEAD`], { cwd: worktreePath })
			: { stdout: "" };
	const outgoingShas = new Set(
		outgoingShasStdout
			.split(/\r?\n/)
			.map((sha) => sha.trim())
			.filter((sha) => sha.length > 0),
	);

	return {
		entries: entries.map((entry) => ({
			...entry,
			isOutgoing: outgoingShas.has(entry.sha),
		})),
		incomingCount,
		outgoingCount,
		upstreamName,
	};
};

export const getCommitFiles = async (
	worktreePath: string,
	input: GetCommitFilesInput,
): Promise<GitCommitFilesResult> => {
	await assertSafeGitRevision(worktreePath, input.commitRef);
	const { stdout } = await gitExecFileAsync(
		[
			"-c",
			"core.quotePath=false",
			"diff-tree",
			"--root",
			"--no-commit-id",
			"--name-status",
			"-z",
			"-r",
			input.commitRef,
		],
		{ cwd: worktreePath },
	);
	return {
		commitRef: input.commitRef,
		files: parseCommitFiles(stdout),
	};
};
