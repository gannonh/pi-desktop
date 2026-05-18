# UI Technical Audit

Date: 2026-05-18

Scope: Pi Desktop renderer, including the current Electron and web app shell, sidebar, composer, transcript surfaces, and design context files.

## Summary

Audit Health Score: 12/20, Acceptable

Scores:

- Accessibility: 2/4
- Performance: 3/4
- Responsive Design: 2/4
- Theming: 2/4
- Anti-Patterns: 3/4

Issue count:

- P0 Blocking: 0
- P1 Major: 3
- P2 Minor: 5
- P3 Polish: 1

## Anti-Patterns Verdict

Pass. The app does not look AI-generated. It follows the Graphite Workbench direction: restrained dark surfaces, quiet controls, compact density, no gradients, no glassmorphism, no hero metrics, and no repeated icon-card grid.

The main anti-pattern risk is motion implementation, not motion itself. Motion is encouraged when it explains state, scope, reveal, hierarchy, or runtime activity. The implementation concern is animating layout properties such as `grid-template-columns`, `grid-template-rows`, and `width`.

## Verification Performed

- Ran `pnpm lint && pnpm typecheck`. Both passed. Biome reported a schema version info notice.
- Audited browser accessibility and DOM measurements at desktop width and 390px viewport.
- Measured browser vitals in preview:
  - TTFB: 14ms
  - LCP: 220ms
  - FCP: 220ms
  - CLS: 0
- Checked console and network behavior in the dev preview.

## Detailed Findings

### P1: Sidebar contrast misses WCAG AA

Location: `src/renderer/styles.css:41`, `src/renderer/styles.css:47`

Category: Accessibility

Impact: Low-vision users may struggle to read navigation section labels and Show more controls. Measured contrast was 4.11:1 on `#141414`, below the 4.5:1 WCAG AA threshold for normal text.

Standard: WCAG 1.4.3 Contrast Minimum

Recommendation: Raise `--sidebar-section-heading-color` and `--sidebar-show-more-color` above AA threshold while preserving muted hierarchy.

Suggested command: `impeccable colorize sidebar state tokens`

### P1: Mobile composer overflows horizontally

Location: `src/renderer/styles.css:632`, `src/renderer/styles.css:676`, responsive rules starting at `src/renderer/styles.css:1478`

Category: Responsive Design

Impact: At 390px viewport, measured document width was 505px, producing 115px horizontal overflow. Composer controls extended offscreen.

Recommendation: Reflow composer controls below 720px, reduce max widths, and ensure send/model controls stay inside the composer.

Suggested command: `impeccable adapt composer`

### P1: Interactive targets are below 44px

Location: `src/renderer/styles.css:900`, `src/renderer/styles.css:1071`, `src/renderer/styles.css:1087`, `src/renderer/styles.css:1231`, `src/renderer/styles.css:1256`

Category: Accessibility / Responsive Design

Impact: Many sidebar buttons measure 24 to 33px high. This can make touch and motor accessibility worse, especially on compact windows or future touch-like environments.

Standard: WCAG 2.5.8 Target Size, WCAG 2.2

Recommendation: Add larger hit areas while preserving the compact visual density.

Suggested command: `impeccable harden sidebar controls`

### P2: Sidebar uses layout-property animations

Location: `src/renderer/styles.css:136`, `src/renderer/styles.css:840`, `src/renderer/styles.css:928`, `src/renderer/styles.css:947`, `src/renderer/styles.css:1200`

Category: Performance / Anti-Pattern

Impact: Animating `grid-template-columns`, `grid-template-rows`, and `width` can trigger layout work during sidebar collapse and chat reveal.

Clarification: This does not mean removing motion. Motion should remain when it preserves spatial context or explains what changed. The implementation should use compositor-friendly properties.

Recommendation: Keep sidebar motion, but rebuild it with `transform`, `opacity`, `clip`, or similar properties. Add `prefers-reduced-motion` behavior.

Suggested command: `impeccable animate sidebar`

### P2: Reduced motion is not implemented

Location: `src/renderer/styles.css`

Category: Accessibility

Impact: Spinner, cursor blink, sidebar collapse, and reveal transitions do not respect users who request reduced motion.

Standard: WCAG 2.3.3 Animation from Interactions

Recommendation: Add a global `prefers-reduced-motion` override for transitions and animations. Preserve non-motion equivalents for state changes.

Suggested command: `impeccable harden motion accessibility`

### P2: Hard-coded colors bypass the token system

Location: `src/renderer/styles.css:151`, `src/renderer/styles.css:261`, `src/renderer/styles.css:292`, `src/renderer/styles.css:522`, `src/renderer/styles.css:619`

Category: Theming

Impact: Theme changes and future color refinements can miss core surfaces like the main background, composer, and control row.

Recommendation: Promote these values to named tokens aligned with `DESIGN.md`.

Suggested command: `impeccable extract color tokens`

### P2: Menu disclosure buttons lack explicit menu semantics

Location: `src/renderer/components/project-sidebar.tsx:260`, `src/renderer/components/project-sidebar.tsx:278`, `src/renderer/components/project-sidebar.tsx:344`, `src/renderer/components/project-sidebar.tsx:513`, `src/renderer/components/project-sidebar.tsx:677`, `src/renderer/components/composer.tsx:141`

Category: Accessibility

Impact: Buttons expose `aria-expanded` but not `aria-haspopup="menu"` for menu-like popovers, reducing assistive technology clarity.

Recommendation: Add `aria-haspopup="menu"` and connect menus with stable ids via `aria-controls` where practical.

Suggested command: `impeccable harden menu accessibility`

### P2: Dev bridge socket logs repeated warnings

Location: `src/renderer/app-api/http-client.ts:131`

Category: Performance / Developer Experience

Impact: Preview console repeatedly logs `Dev data bridge event socket closed; reconnecting.` This can hide real runtime errors during review.

Recommendation: Confirm whether idle socket closes are expected. If yes, suppress expected idle closes or downgrade logging.

Suggested command: `impeccable harden dev preview errors`

### P3: Biome schema version is stale

Location: `biome.json:2`

Category: Tooling

Impact: `pnpm lint` passes, but reports schema 2.3.5 while the CLI is 2.4.15.

Recommendation: Update the schema URL.

Suggested command: `impeccable polish repo checks`

## Systemic Patterns

- Compact macOS density works visually, but hit areas need hidden padding to meet accessibility targets.
- Color tokens exist, but implementation still mixes tokenized OKLCH values with hard-coded hex surface colors.
- Motion is useful for the product, but the implementation should avoid layout-property animation and add reduced-motion handling.

## Positive Findings

- Landmarks and labels are mostly present: `main`, `aside`, transcript sections, composer labels, live status, and error alert.
- Core Web Vitals are strong in preview.
- Visual anti-patterns are well controlled.
- Runtime errors use visible alert styling and `role="alert"`.

## Recommended Actions

1. `impeccable harden sidebar controls`: Fix target sizes, contrast, and menu semantics.
2. `impeccable adapt composer`: Remove mobile overflow and reflow composer controls.
3. `impeccable animate sidebar`: Keep useful sidebar motion while replacing layout-property animations and adding reduced-motion behavior.
4. `impeccable extract color tokens`: Move hard-coded surface colors into named design tokens.
5. `impeccable polish`: Final cleanup after fixes.

Re-run `impeccable audit` after fixes to measure improvement.
