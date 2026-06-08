import type { GitStatusEntry } from "../../shared/source-control/types";

const getConflictSortRank = (entry: GitStatusEntry): number => {
	if (entry.conflictKind) {
		return 0;
	}
	return 1;
};

export const compareGitStatusEntries = (left: GitStatusEntry, right: GitStatusEntry): number =>
	getConflictSortRank(left) - getConflictSortRank(right) ||
	left.path.localeCompare(right.path, undefined, { numeric: true });
