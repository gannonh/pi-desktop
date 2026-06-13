// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SessionScopeHeader } from "../../src/renderer/components/session-scope-header";

describe("SessionScopeHeader", () => {
	it("renders centered title and metadata", () => {
		render(
			<SessionScopeHeader
				variant="centered"
				titleId="chat-shell-title"
				title="What should we work on?"
				resumeLabel="Start session"
				metadataLabel="idle · /tmp/project · updated today"
			/>,
		);

		expect(screen.getByRole("heading", { name: "What should we work on?" })).toBeTruthy();
		expect(screen.getByText("Start session")).toBeTruthy();
		expect(screen.getByText("idle · /tmp/project · updated today")).toBeTruthy();
	});

	it("renders bar variant with path badge", () => {
		render(
			<SessionScopeHeader
				variant="bar"
				title="Git parity"
				path="/tmp/pi-desktop"
				resumeLabel="Resume session"
				metadataLabel="idle · /tmp/pi-desktop"
			/>,
		);

		expect(screen.getByRole("heading", { name: "Git parity" })).toBeTruthy();
		expect(screen.getByText("/tmp/pi-desktop")).toBeTruthy();
	});
});
