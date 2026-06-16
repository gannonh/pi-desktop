import { describe, expect, it } from "vitest";
import {
	buildPullRequestOpenLabel,
	formatPullRequestNumber,
	getPullRequestStateDisplay,
} from "../../src/renderer/changes-panel/pull-request-state-display";

describe("pull request state display", () => {
	it("maps pull request states to review-ready labels and variants", () => {
		expect(getPullRequestStateDisplay({ state: "open", isDraft: false })).toEqual({
			label: "Ready",
			variant: "default",
		});
		expect(getPullRequestStateDisplay({ state: "open", isDraft: true })).toEqual({
			label: "Draft",
			variant: "outline",
		});
		expect(getPullRequestStateDisplay({ state: "merged" })).toEqual({ label: "Merged", variant: "secondary" });
		expect(getPullRequestStateDisplay({ state: "closed" })).toEqual({ label: "Closed", variant: "destructive" });
		expect(getPullRequestStateDisplay({ state: "unknown" })).toEqual({ label: "Unknown", variant: "outline" });
	});

	it("formats pull request numbers and open labels", () => {
		expect(formatPullRequestNumber(173)).toBe("#173");
		expect(formatPullRequestNumber(undefined)).toBe("Pull request");
		expect(
			buildPullRequestOpenLabel({
				title: "Polish changes panel",
				url: "https://github.com/gannonh/pi-desktop/pull/173",
				state: "open",
				number: 173,
			}),
		).toBe("Open #173: Polish changes panel");
	});
});
