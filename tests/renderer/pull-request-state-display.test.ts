import { describe, expect, it } from "vitest";
import { getPullRequestStateDisplay } from "../../src/renderer/changes-panel/pull-request-state-display";

describe("getPullRequestStateDisplay", () => {
	it("maps pull request states to badge labels and variants", () => {
		expect(getPullRequestStateDisplay("open")).toEqual({ label: "Open", variant: "default" });
		expect(getPullRequestStateDisplay("merged")).toEqual({ label: "Merged", variant: "secondary" });
		expect(getPullRequestStateDisplay("closed")).toEqual({ label: "Closed", variant: "destructive" });
		expect(getPullRequestStateDisplay("unknown")).toEqual({ label: "Unknown", variant: "outline" });
	});
});
