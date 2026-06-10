import type { GitStatusPayload } from "../../shared/source-control/schemas";

export const resolvePullRequestCompareRefs = (
	status: GitStatusPayload | null | undefined,
): { baseRef: string; headRef: string } => {
	const headRef = status?.branch?.replace(/^refs\/heads\//, "") || "HEAD";
	const upstreamName = status?.upstreamStatus?.upstreamName?.trim();
	if (upstreamName?.includes("/")) {
		return { baseRef: upstreamName, headRef };
	}
	if (upstreamName) {
		return { baseRef: upstreamName, headRef };
	}
	return { baseRef: "main", headRef };
};
