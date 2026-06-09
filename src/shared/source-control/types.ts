export type GitFileStatus = "modified" | "added" | "deleted" | "renamed" | "untracked" | "copied";
export type GitStagingArea = "staged" | "unstaged" | "untracked";
export type GitConflictKind =
	| "both_modified"
	| "both_added"
	| "both_deleted"
	| "added_by_us"
	| "added_by_them"
	| "deleted_by_us"
	| "deleted_by_them";
export type GitConflictOperation = "merge" | "rebase" | "cherry-pick" | "unknown";

export type GitStatusEntry = {
	path: string;
	status: GitFileStatus;
	area: GitStagingArea;
	oldPath?: string;
	conflictKind?: GitConflictKind;
	added?: number;
	removed?: number;
};

export type GitUpstreamRelation = "none" | "up_to_date" | "ahead" | "behind" | "diverged";

export type GitUpstreamStatus = {
	hasUpstream: boolean;
	upstreamName?: string;
	ahead: number;
	behind: number;
	relation: GitUpstreamRelation;
	isConfigured: boolean;
};

export type GitStatusResult = {
	entries: GitStatusEntry[];
	conflictOperation: GitConflictOperation;
	head?: string;
	branch?: string;
	upstreamStatus?: GitUpstreamStatus;
	ignoredPaths?: string[];
};

export type GitDiffKind = "unstaged" | "staged" | "untracked" | "branch" | "commit";

export type GitDiffPayload =
	| {
			kind: "text";
			path: string;
			title: string;
			patch: string;
			diffKind: GitDiffKind;
	  }
	| {
			kind: "binary" | "too_large" | "unsupported";
			path: string;
			title: string;
			diffKind: GitDiffKind;
			message: string;
	  };

export type GitCommitResult = {
	sha: string;
	summary: string;
};

export type GitBranchCompareFile = {
	path: string;
	status: GitFileStatus;
	oldPath?: string;
	added?: number;
	removed?: number;
};

export type GitBranchCompareResult = {
	baseRef: string;
	headRef: string;
	ahead: number;
	behind: number;
	files: GitBranchCompareFile[];
};

export type SourceControlPullRequestInfo = {
	title: string;
	url: string;
	state: "open" | "closed" | "merged" | "unknown";
};

export type GitHistoryEntry = {
	sha: string;
	shortSha: string;
	subject: string;
	author: string;
	authorDate: string;
	refs: string[];
	isOutgoing?: boolean;
};

export type GitHistoryResult = {
	entries: GitHistoryEntry[];
	incomingCount: number;
	outgoingCount: number;
	upstreamName?: string;
};

export type GitCommitFile = {
	path: string;
	status: GitFileStatus;
	oldPath?: string;
};

export type GitCommitFilesResult = {
	commitRef: string;
	files: GitCommitFile[];
};

export type GitDiffContext = {
	compareRefs?: { base: string; head: string };
	commitRef?: string;
};
