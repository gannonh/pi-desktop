import { describe, expect, it } from "vitest";
import { SHOW_PLANNED_AFFORDANCES } from "../../src/renderer/dev/planned-affordances";

describe("planned affordance release toggle", () => {
	it("is enabled in dev/test builds", () => {
		expect(SHOW_PLANNED_AFFORDANCES).toBe(true);
	});
});
