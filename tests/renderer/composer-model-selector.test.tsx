// @vitest-environment jsdom

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ComposerModelSelector } from "../../src/renderer/components/composer-model-selector";

describe("ComposerModelSelector", () => {
	it("renders provider list before drilling into models", () => {
		const markup = renderToStaticMarkup(
			createElement(ComposerModelSelector, {
				label: "5.5 High",
				open: true,
				modelOptions: [
					{ provider: "anthropic", id: "claude-opus", label: "Opus" },
					{ provider: "openai", id: "gpt-5.5", label: "5.5 High" },
				],
				selectedModelProvider: "openai",
				selectedModelId: "gpt-5.5",
				onToggle: () => {},
			}),
		);

		expect(markup).toContain('class="composer__model-menu-provider"');
		expect(markup).toContain("Anthropic");
		expect(markup).toContain("OpenAI");
		expect(markup).not.toContain('role="menuitem">5.5 High');
	});
});
