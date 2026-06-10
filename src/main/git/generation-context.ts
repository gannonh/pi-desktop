import type { GitBranchCompareResult } from "../../shared/source-control/types";
import { gitExecFileAsync } from "./runner";
import { getBranchCompare, getStatus } from "./status";

export const SOURCE_CONTROL_GENERATION_MAX_PATCH_CHARS = 24_000;

export type StagedGenerationContext = {
	branch?: string;
	stagedPaths: string[];
	patch: string;
};

export type PullRequestGenerationContext = GitBranchCompareResult & {
	patch: string;
};

const truncatePatch = (patch: string, maxChars = SOURCE_CONTROL_GENERATION_MAX_PATCH_CHARS): string => {
	if (patch.length <= maxChars) {
		return patch;
	}
	return `${patch.slice(0, maxChars)}\n\n[Diff truncated for generation context.]`;
};

export const getStagedGenerationContext = async (worktreePath: string): Promise<StagedGenerationContext> => {
	const status = await getStatus(worktreePath);
	const stagedPaths = status.entries.filter((entry) => entry.area === "staged").map((entry) => entry.path);
	if (stagedPaths.length === 0) {
		throw new Error("Stage changes before generating a commit message.");
	}

	const { stdout: patch } = await gitExecFileAsync(["diff", "--cached", "--no-color"], { cwd: worktreePath });
	if (!patch.trim()) {
		throw new Error("No staged diff is available to summarize.");
	}

	return {
		branch: status.branch,
		stagedPaths,
		patch: truncatePatch(patch),
	};
};

export const getPullRequestGenerationContext = async (
	worktreePath: string,
	input: { baseRef: string; headRef: string },
): Promise<PullRequestGenerationContext> => {
	const compare = await getBranchCompare(worktreePath, input);
	if (compare.files.length === 0) {
		throw new Error("No changes between base and head to summarize.");
	}

	const { stdout: patch } = await gitExecFileAsync(["diff", "--no-color", `${compare.baseRef}...${compare.headRef}`], {
		cwd: worktreePath,
	});
	if (!patch.trim()) {
		throw new Error("No branch compare diff is available to summarize.");
	}

	return {
		...compare,
		patch: truncatePatch(patch),
	};
};
