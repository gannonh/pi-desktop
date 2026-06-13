// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlannedAffordanceButton } from "../../src/renderer/components/planned-affordance";

describe("PlannedAffordanceButton", () => {
	it("renders a non-focusable planned control with tooltip", () => {
		render(
			<PlannedAffordanceButton id="sidebar.search" className="project-sidebar__action" aria-label="Search">
				<span>Search</span>
			</PlannedAffordanceButton>,
		);

		const button = screen.getByRole("button", { name: "Search" });
		expect(button.hasAttribute("disabled")).toBe(true);
		expect(button.getAttribute("tabindex")).toBe("-1");
		expect(button.getAttribute("aria-disabled")).toBe("true");
		expect(button.closest(".planned-affordance")?.getAttribute("title")).toBe("Search · planned");
	});
});
