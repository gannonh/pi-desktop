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

export type GitUpstreamStatus = {
	hasUpstream: boolean;
	upstreamName?: string;
	ahead: number;
	behind: number;
};

export type GitStatusResult = {
	entries: GitStatusEntry[];
	conflictOperation: GitConflictOperation;
	head?: string;
	branch?: string;
	upstreamStatus?: GitUpstreamStatus;
	ignoredPaths?: string[];
};
