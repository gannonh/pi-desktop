import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ComposerContext } from "../../src/renderer/chat/chat-view-model";
import { Composer } from "../../src/renderer/components/composer";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const context: ComposerContext = {
	projectSelectorLabel: "pi-desktop",
	modeLabel: "Work locally",
	modelLabel: "5.5 High",
	runtimeAvailable: true,
	disabledReason: "",
	projectId: "project:/tmp/pi-desktop",
};

describe("Composer", () => {
	it("keeps startup busy without rendering an inert abort control", () => {
		const markup = renderToStaticMarkup(createElement(Composer, { context, running: true, abortable: false }));

		expect(markup).not.toContain('aria-label="Abort run"');
		expect(markup).toContain('aria-label="Send message"');
		expect(markup).toContain("disabled");
	});

	it("declares menu semantics on composer disclosure controls", () => {
		const markup = renderToStaticMarkup(createElement(Composer, { context }));
		const labels = [context.projectSelectorLabel, context.modeLabel, context.modelLabel];

		for (const label of labels) {
			const pattern = new RegExp(
				`aria-controls="[^"]+"[^>]*aria-haspopup="menu"[^>]*>.*?${escapeRegExp(label)}`,
				"s",
			);
			expect(markup, `${label} control should expose menu semantics`).toMatch(pattern);
		}
	});
});
