import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = () => readFileSync("src/renderer/styles.css", "utf8");

const isSelectorListContinuation = (css: string, matchStart: number) => {
	const lineStart = css.lastIndexOf("\n", matchStart) + 1;
	let cursor = lineStart - 1;

	while (cursor >= 0) {
		if (css[cursor] === "\n") {
			const previousLineStart = css.lastIndexOf("\n", cursor - 1) + 1;
			const previousLine = css.slice(previousLineStart, cursor).trim();
			if (previousLine.endsWith(",")) {
				return true;
			}
			return false;
		}
		if (css[cursor] === "}") {
			return false;
		}
		cursor -= 1;
	}

	return false;
};

const ruleBody = (css: string, selector: string) => {
	const needle = `${selector} {`;
	let index = 0;
	let start = -1;

	while (index < css.length) {
		const found = css.indexOf(needle, index);
		if (found < 0) {
			break;
		}
		if (!isSelectorListContinuation(css, found)) {
			start = found;
			break;
		}
		index = found + 1;
	}

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
		const showMore = ruleBody(css, ".project-sidebar__show-more");
		expect(showMore).toContain("width: 100%");
		expect(showMore).not.toContain("min-height");
	});

	it("keeps Markdown toolbar icons compact and unmangled", () => {
		const css = styles();
		const icon = ruleBody(css, ".markdown-surface__icon");
		const toolbarItem = ruleBody(
			css,
			'.markdown-surface__toolbar-contents [data-toolbar-item]:not([role="combobox"])',
		);
		const toolbar = ruleBody(css, ".markdown-surface__toolbar-contents");

		expect(icon).toContain("width: 1rem");
		expect(icon).toContain("height: 1rem");
		expect(icon).toContain("flex: 0 0 auto");
		expect(toolbarItem).toContain("width: 1.75rem");
		expect(toolbarItem).toContain("height: 1.75rem");
		expect(toolbarItem).toContain("padding: 0");
		expect(toolbar).toContain("flex-wrap: nowrap");
		expect(toolbar).toContain("overflow-y: hidden");
	});
});
