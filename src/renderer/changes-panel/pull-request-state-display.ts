import type { SourceControlPullRequestInfo } from "../../shared/source-control/types";

export type PullRequestStateDisplay = {
	label: string;
	variant: "default" | "secondary" | "destructive" | "outline";
};

export const getPullRequestStateDisplay = (state: SourceControlPullRequestInfo["state"]): PullRequestStateDisplay => {
	switch (state) {
		case "open":
			return { label: "Open", variant: "default" };
		case "merged":
			return { label: "Merged", variant: "secondary" };
		case "closed":
			return { label: "Closed", variant: "destructive" };
		default:
			return { label: "Unknown", variant: "outline" };
	}
};
