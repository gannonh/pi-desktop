// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RightPanelAddMenu } from "../../src/renderer/right-panel/right-panel-add-menu";
import { ShellTestProviders } from "./shell-test-providers";

function renderAddMenu(onAdd = vi.fn()) {
	return render(
		<ShellTestProviders>
			<RightPanelAddMenu onAdd={onAdd} />
		</ShellTestProviders>,
	);
}

describe("RightPanelAddMenu", () => {
	it("calls onAdd when a menu item is chosen", () => {
		const onAdd = vi.fn();
		renderAddMenu(onAdd);

		fireEvent.click(screen.getByRole("button", { name: "Add panel" }));
		fireEvent.click(screen.getByRole("menuitem", { name: "Terminal" }));

		expect(onAdd).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "terminal",
				kind: "terminal",
				label: "Terminal",
			}),
		);
	});

	it("closes on outside pointer down", () => {
		render(
			<ShellTestProviders>
				<RightPanelAddMenu onAdd={vi.fn()} />
				<button type="button">Outside</button>
			</ShellTestProviders>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Add panel" }));
		expect(screen.getByRole("menuitem", { name: "Browser" })).toBeTruthy();

		fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
		expect(screen.queryByRole("menuitem", { name: "Browser" })).toBeNull();
	});
});
