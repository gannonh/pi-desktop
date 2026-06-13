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

	it("defines the subtle border token used by Markdown surfaces", () => {
		const root = ruleBody(styles(), ":root");

		expect(root).toContain("--border-subtle: var(--color-border)");
	});

	it("defines planned affordance styling for pre-release roadmap surfaces", () => {
		const css = styles();

		expect(css).toContain(".planned-affordance");
		expect(css).toContain(".planned-affordance__label");
		expect(ruleBody(css, ".planned-affordance__control")).toContain("border: 1px dashed");
	});

	it("hides the file divider when the workspace stacks vertically", () => {
		const css = styles();
		const mobileStart = css.indexOf("@media (max-width: 959px)");
		expect(mobileStart).toBeGreaterThanOrEqual(0);
		const mobileCss = css.slice(mobileStart, css.indexOf("}\n\n.workspace-panel__empty", mobileStart));

		expect(mobileCss).toContain(".file-workspace__divider");
		expect(mobileCss).toContain("display: none");
	});

	it("styles source-control overflow actions for the shadcn dropdown menu", () => {
		const menu = ruleBody(styles(), ".changes-panel__action-dropdown");

		expect(menu).toContain("min-width: 13rem");
	});

	it("uses workflow heights as scroll caps instead of forced blank space", () => {
		const workflowContent = ruleBody(styles(), ".changes-panel__workflow-block-content");
		const workflows = ruleBody(styles(), ".changes-panel__secondary");

		expect(workflowContent).toContain("max-height: var(--changes-panel-workflow-block-height, 18rem)");
		expect(workflowContent).not.toMatch(/\n\s*height: var\(--changes-panel-workflow-block-height, 18rem\)/);
		expect(workflows).toContain("align-content: start");
		expect(workflows).toContain("grid-auto-rows: max-content");
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

	it("stacks session transcript and tool timeline vertically", () => {
		const sessionScrollInner = ruleBody(styles(), ".chat-shell--session .chat-shell__scroll-inner");

		expect(sessionScrollInner).toContain("flex-direction: column");
		expect(sessionScrollInner).toContain("align-items: center");
	});

	it("keeps the Markdown block-type selector visually compact", () => {
		const css = styles();
		const triggerWrapper = ruleBody(css, ".markdown-surface__toolbar-contents > span");
		const blockTypeTrigger = ruleBody(
			css,
			'.markdown-surface__toolbar-contents [role="combobox"][data-toolbar-item]',
		);

		expect(triggerWrapper).toContain("display: inline-flex");
		expect(triggerWrapper).toContain("height: 1.75rem");
		expect(triggerWrapper).toContain("align-items: center");
		expect(blockTypeTrigger).toContain("width: 4.75rem");
		expect(blockTypeTrigger).toContain("font-size: var(--type-caption)");
		expect(blockTypeTrigger).toContain("line-height: 1");
		expect(blockTypeTrigger).toContain("white-space: nowrap");
		expect(blockTypeTrigger).toContain("border-radius: var(--radius-control)");
	});

	it("keeps Markdown list markers visible in rendered content", () => {
		const css = styles();
		const unordered = ruleBody(css, ".markdown-surface__content ul");
		const ordered = ruleBody(css, ".markdown-surface__content ol");
		const listItem = ruleBody(css, ".markdown-surface__content li");

		expect(unordered).toContain("list-style: disc outside");
		expect(ordered).toContain("list-style: decimal outside");
		expect(listItem).toContain("display: list-item");
	});

	it("keeps long Markdown documents scrollable inside the file viewer", () => {
		const scrollRoot = ruleBody(styles(), ".markdown-surface__editor .mdxeditor-root-contenteditable");

		expect(scrollRoot).toContain("min-height: 0");
		expect(scrollRoot).toContain("flex: 1");
		expect(scrollRoot).toContain("overflow-y: auto");
	});

	it("keeps Markdown toolbar dropdowns visible and selectable", () => {
		const css = styles();
		const dropdown = ruleBody(css, ".markdown-surface__editor .mdxeditor-select-content");
		const option = ruleBody(css, ".markdown-surface__editor .mdxeditor-select-content [role='option']");

		expect(dropdown).toContain("z-index: 20");
		expect(dropdown).toContain("background: var(--menu-popover-background)");
		expect(dropdown).toContain("border: 1px solid var(--color-border)");
		expect(dropdown).toContain("box-shadow: 0 12px 32px oklch(0 0 0 / 35%)");
		expect(option).toContain("cursor: pointer");
		expect(option).toContain("padding: 0.35rem 0.5rem");
	});

	it("keeps the resizable file divider visible as one stable vertical rule", () => {
		const divider = ruleBody(styles(), ".file-workspace__divider");
		const activeDivider = ruleBody(
			styles(),
			".file-workspace__divider:hover,\n.file-workspace__divider:focus-visible,\nbody.file-workspace--resizing .file-workspace__divider",
		);

		expect(divider).toContain("align-self: stretch");
		expect(divider).toContain("min-height: 100%");
		expect(divider).toContain("border-left: 1px solid var(--color-border)");
		expect(divider).toContain("background: transparent");
		expect(divider).not.toContain("linear-gradient");
		expect(activeDivider).toContain("border-left-color: var(--color-ring)");
	});

	it("keeps Markdown code blocks dark and free of duplicate editor chrome", () => {
		const css = styles();
		const nestedToolbar = ruleBody(css, '.markdown-surface__code-editor [class*="codeMirrorToolbar"]');
		const nestedWrapper = ruleBody(css, '.markdown-surface__code-editor [class*="codeMirrorWrapper"]');
		const codeEditor = ruleBody(css, ".markdown-surface__code-editor .cm-editor");
		const codeGutters = ruleBody(css, ".markdown-surface__code-editor .cm-gutters");
		const emptyStatus = ruleBody(css, ".markdown-surface__code-copy-status:empty");

		expect(nestedToolbar).toContain("display: none");
		expect(nestedWrapper).toContain("border: 0");
		expect(nestedWrapper).toContain("padding: 0");
		expect(nestedWrapper).toContain("margin: 0");
		expect(codeEditor).toContain("background: var(--sidebar-background)");
		expect(codeEditor).toContain("color: var(--color-foreground)");
		expect(codeGutters).toContain("background: color-mix");
		expect(emptyStatus).toContain("display: none");
	});
});
