import type { GitStatusPayload } from "../../shared/source-control/schemas";

const DEFAULT_PR_BASE_REF = "main";

const remoteTrackingBranchName = (refName: string) => refName.split("/").slice(1).join("/");

export const resolvePullRequestCompareRefs = (
	status: GitStatusPayload | null | undefined,
): { baseRef: string; headRef: string } => {
	const headRef = status?.branch?.replace(/^refs\/heads\//, "") || "HEAD";
	const upstreamName = status?.upstreamStatus?.upstreamName?.trim();
	if (!upstreamName) {
		return { baseRef: DEFAULT_PR_BASE_REF, headRef };
	}
	if (remoteTrackingBranchName(upstreamName) === headRef) {
		return { baseRef: DEFAULT_PR_BASE_REF, headRef };
	}
	return { baseRef: upstreamName, headRef };
};
