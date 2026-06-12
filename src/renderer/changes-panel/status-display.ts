import type { GitFileStatus } from "../../shared/source-control/types";

export const STATUS_LABELS: Record<GitFileStatus, string> = {
	modified: "M",
	added: "A",
	deleted: "D",
	renamed: "R",
	untracked: "U",
	copied: "C",
};

export const SECTION_ORDER = ["staged", "unstaged", "untracked"] as const;
export type SourceControlSection = (typeof SECTION_ORDER)[number];

export const SECTION_LABELS: Record<SourceControlSection, string> = {
	unstaged: "Changes",
	staged: "Staged Changes",
	untracked: "Untracked Files",
};
