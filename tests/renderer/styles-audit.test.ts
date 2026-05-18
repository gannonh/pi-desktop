import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = () => readFileSync("src/renderer/styles.css", "utf8");

const ruleBody = (css: string, selector: string) => {
	const start = css.indexOf(`${selector} {`);
	expect(start, `${selector} rule should exist`).toBeGreaterThanOrEqual(0);
	const bodyStart = css.indexOf("{", start) + 1;
	const bodyEnd = css.indexOf("}\n", bodyStart);
	return css.slice(bodyStart, bodyEnd);
};

describe("renderer style audit rules", () => {
	it("keeps core surface colors behind named tokens", () => {
		const css = styles();
		const directCoreSurfaceColors = ["oklch(0.209 0 0)", "oklch(0.297 0 0)", "oklch(0.248 0 0)"];

		for (const color of directCoreSurfaceColors) {
			expect(
				css.replaceAll(`: ${color};`, ": TOKEN_DECLARATION;"),
				`${color} should only appear in token declarations`,
			).not.toContain(color);
		}
	});

	it("does not animate sidebar layout properties", () => {
		const css = styles();
		const sidebarTransitionValues = [
			...css.matchAll(/(?:\.app-shell|\.project-sidebar)[^{}]*\{[^{}]*transition:\s*([^{};]+(?:;|\n\}))/g),
		].map((match) => match[1] ?? "");
		const layoutProperties = [
			"grid-template-columns",
			"grid-template-rows",
			"width",
			"height",
			"margin-left",
			"padding",
		];

		for (const transition of sidebarTransitionValues) {
			for (const property of layoutProperties) {
				expect(transition, `sidebar transition should not animate ${property}`).not.toContain(property);
			}
		}
	});

	it("provides reduced-motion behavior for transitions and animations", () => {
		const css = styles();

		expect(css).toContain("@media (prefers-reduced-motion: reduce)");
		expect(css).toContain("animation-duration: 0.01ms !important");
		expect(css).toContain("transition-duration: 0.01ms !important");
	});

	it("reflows composer controls at mobile width", () => {
		const css = styles();
		const mobileStart = css.indexOf("@media (max-width: 720px)");
		expect(mobileStart).toBeGreaterThanOrEqual(0);
		const mobileCss = css.slice(mobileStart);

		expect(mobileCss).toContain(".composer__action-row");
		expect(mobileCss).toContain("flex-wrap: wrap");
		expect(mobileCss).toContain(".composer__disabled-reason");
		expect(mobileCss).toContain("text-align: left");
	});

	it("keeps project chat rows at the compact 33px sidebar rhythm", () => {
		const chatRow = ruleBody(styles(), ".project-sidebar__chat-row");

		expect(chatRow).toContain("height: 33px");
		expect(chatRow).toContain("min-height: 33px");
		expect(chatRow).toContain("max-height: 33px");
	});

	it("keeps sidebar top actions compact with about 20px between icon edges", () => {
		const css = styles();
		const action = ruleBody(css, ".project-sidebar__action");

		expect(css).toContain("--sidebar-top-action-gap: 0.25rem");
		expect(action).toContain("height: 32px");
		expect(action).toContain("min-height: 32px");
		expect(action).toContain("max-height: 32px");
	});

	it("keeps non-chat sidebar controls on the compact desktop rhythm", () => {
		const css = styles();

		expect(css).not.toContain("--control-target-size");
		expect(css).toContain("--sidebar-row-padding: 0.375rem 0.5rem");
		expect(ruleBody(css, ".project-sidebar__project-row")).not.toContain("min-height");
		expect(ruleBody(css, ".project-sidebar__heading-button")).not.toContain("min-height");
		expect(ruleBody(css, ".project-sidebar__show-more")).not.toContain("min-height");
	});
});
