import type { SourceControlPullRequestInfo } from "../../shared/source-control/types";

export type PullRequestStateDisplay = {
	label: string;
	variant: "default" | "secondary" | "destructive" | "outline";
};

export const formatPullRequestNumber = (number: SourceControlPullRequestInfo["number"]): string =>
	typeof number === "number" ? `#${number}` : "Pull request";

export const buildPullRequestOpenLabel = (pullRequest: SourceControlPullRequestInfo): string => {
	const numberLabel = formatPullRequestNumber(pullRequest.number);
	return `Open ${numberLabel}: ${pullRequest.title}`;
};

export const getPullRequestStateDisplay = (
	pullRequest: Pick<SourceControlPullRequestInfo, "state" | "isDraft">,
): PullRequestStateDisplay => {
	switch (pullRequest.state) {
		case "open":
			return pullRequest.isDraft ? { label: "Draft", variant: "outline" } : { label: "Ready", variant: "default" };
		case "merged":
			return { label: "Merged", variant: "secondary" };
		case "closed":
			return { label: "Closed", variant: "destructive" };
		default:
			return { label: "Unknown", variant: "outline" };
	}
};
