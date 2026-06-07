import { describe, expect, it } from "vitest";
import { projectActionErrorMessage } from "../../src/renderer/projects/project-action-error";

describe("projectActionErrorMessage", () => {
	it("uses Error messages and falls back for unknown thrown values", () => {
		expect(projectActionErrorMessage(new Error("folder unavailable"), "Project action failed")).toBe(
			"folder unavailable",
		);
		expect(projectActionErrorMessage("failed", "Project action failed")).toBe("Project action failed");
	});
});
