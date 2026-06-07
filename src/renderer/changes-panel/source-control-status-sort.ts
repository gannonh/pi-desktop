import type { GitStatusEntry } from "../../shared/source-control/types";

const getConflictSortRank = (entry: GitStatusEntry): number => {
	if ("conflictStatus" in entry && entry.conflictStatus === "unresolved") {
		return 0;
	}
	if ("conflictStatus" in entry && entry.conflictStatus === "resolved_locally") {
		return 1;
	}
	return 2;
};

export const compareGitStatusEntries = (left: GitStatusEntry, right: GitStatusEntry): number =>
	getConflictSortRank(left) - getConflictSortRank(right) ||
	left.path.localeCompare(right.path, undefined, { numeric: true });
