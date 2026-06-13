// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

	it("renders nothing when planned affordances are disabled", async () => {
		vi.resetModules();
		vi.doMock("../../src/renderer/dev/planned-affordances", () => ({
			SHOW_PLANNED_AFFORDANCES: false,
			PLANNED_AFFORDANCES: {
				"sidebar.search": { id: "sidebar.search", label: "Search" },
			},
			formatPlannedTooltip: (definition: { label: string }) => `${definition.label} · planned`,
		}));

		const { PlannedAffordanceButton: DisabledPlannedButton } = await import(
			"../../src/renderer/components/planned-affordance"
		);

		const { container } = render(
			<DisabledPlannedButton id="sidebar.search" className="project-sidebar__action" aria-label="Search">
				<span>Search</span>
			</DisabledPlannedButton>,
		);

		expect(container.firstChild).toBeNull();

		vi.doUnmock("../../src/renderer/dev/planned-affordances");
		vi.resetModules();
	});
});
