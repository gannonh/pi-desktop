import { describe, expect, it } from "vitest";
import { resolvePullRequestCompareRefs } from "../../src/renderer/changes-panel/pull-request-compare-refs";

describe("resolvePullRequestCompareRefs", () => {
	it("uses upstream name as base ref when available", () => {
		expect(
			resolvePullRequestCompareRefs({
				entries: [],
				conflictOperation: "unknown",
				branch: "refs/heads/feat/test",
				upstreamStatus: {
					hasUpstream: true,
					upstreamName: "origin/main",
					ahead: 1,
					behind: 0,
					relation: "ahead",
					isConfigured: true,
				},
			}),
		).toEqual({ baseRef: "origin/main", headRef: "feat/test" });
	});

	it("falls back to main when upstream is missing", () => {
		expect(
			resolvePullRequestCompareRefs({
				entries: [],
				conflictOperation: "unknown",
				branch: "refs/heads/feat/test",
			}),
		).toEqual({ baseRef: "main", headRef: "feat/test" });
	});

	it("uses configured default base ref when upstream is missing", () => {
		expect(
			resolvePullRequestCompareRefs(
				{
					entries: [],
					conflictOperation: "unknown",
					branch: "refs/heads/feat/test",
				},
				"develop",
			),
		).toEqual({ baseRef: "develop", headRef: "feat/test" });
	});

	it("falls back to main when upstream tracks the current branch", () => {
		expect(
			resolvePullRequestCompareRefs({
				entries: [],
				conflictOperation: "unknown",
				branch: "refs/heads/feat/test",
				upstreamStatus: {
					hasUpstream: true,
					upstreamName: "origin/feat/test",
					ahead: 0,
					behind: 0,
					relation: "up_to_date",
					isConfigured: true,
				},
			}),
		).toEqual({ baseRef: "main", headRef: "feat/test" });
	});
});
