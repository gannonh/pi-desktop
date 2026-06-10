import { DEFAULT_BASE_REF } from "../../shared/project-state";
import type { GitStatusPayload } from "../../shared/source-control/schemas";

const remoteTrackingBranchName = (refName: string) => refName.split("/").slice(1).join("/");

export const resolvePullRequestCompareRefs = (
	status: GitStatusPayload | null | undefined,
	defaultBaseRef: string = DEFAULT_BASE_REF,
): { baseRef: string; headRef: string } => {
	const headRef = status?.branch?.replace(/^refs\/heads\//, "") || "HEAD";
	const upstreamName = status?.upstreamStatus?.upstreamName?.trim();
	if (!upstreamName) {
		return { baseRef: defaultBaseRef, headRef };
	}
	if (remoteTrackingBranchName(upstreamName) === headRef) {
		return { baseRef: defaultBaseRef, headRef };
	}
	return { baseRef: upstreamName, headRef };
};
