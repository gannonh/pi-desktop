---
target: src/renderer/changes-panel/ChangesPanel.tsx
total_score: 25
p0_count: 0
p1_count: 3
p2_count: 2
timestamp: 2026-06-12T00-42-39Z
slug: src-renderer-changes-panel-changespanel-tsx
---
# Design Critique: ChangesPanel

**Target:** `src/renderer/changes-panel/ChangesPanel.tsx`
**Register:** Product (Graphite Workbench / familiar agent IDE)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Refresh spin and `aria-live` on AI generation are good; commit/push/pull busy state is uneven (commit sets `isCommitting` but primary button path is indirect) |
| 2 | Match System / Real World | 3 | Git vocabulary fits the audience; single-letter status codes (`M`/`A`/`D`) are accurate but opaque to novices |
| 3 | User Control and Freedom | 3 | Discard confirmations and conflict abort are solid; custom overflow menu lacks standard dismiss patterns |
| 4 | Consistency and Standards | 2 | shadcn `Button`/`AlertDialog` mixed with raw inputs, unicode chevrons, and a hand-rolled menu |
| 5 | Error Prevention | 3 | Contextual discard copy and disabled reasons on remote actions are strong |
| 6 | Recognition Rather Than Recall | 2 | Row actions hidden until hover; file tree sits below four always-visible workflow blocks |
| 7 | Flexibility and Efficiency | 2 | Bulk selection helps; no keyboard accelerators; per-row actions require hover discovery |
| 8 | Aesthetic and Minimalist Design | 2 | Five bordered sub-panels stack before the change list; nested card rhythm competes for attention |
| 9 | Error Recovery | 3 | Commit failure recovery dialog and status retry are thoughtful |
| 10 | Help and Documentation | 2 | Some `title` tooltips on disabled generate; upstream/force-push semantics unexplained |
| **Total** | | **25/40** | **Acceptable — significant IA and density improvements needed** |

**Cognitive load:** 5/8 checklist failures (high). Primary task (review → stage → commit) is split across scroll positions; secondary workflows (compare, history, PR) are always mounted.

## Anti-Patterns Verdict

**LLM assessment:** Does not read as generic marketing AI slop. It reads as a capable but overloaded developer tool surface — closer to "early integrated feature" than "designed SCM panel." The repeated bordered sub-cards (`commit`, `remote`, `compare`, `history`, `pr`) echo the ghost-card family (1px border + raised surface) without a single dominant focal region. Typography and dark graphite tokens align with DESIGN.md.

**Deterministic scan:** `detect.mjs` on the TSX target returned **0 findings** (exit 0). The bundled detector does not evaluate React structure or CSS tokens; CSS anti-pattern review was manual.

**Visual overlays:** Not available — no live preview/browser session was running for overlay injection.

## Overall Impression

The panel is function-rich and thoughtfully engineered (discard copy, conflict handling, PR linking, bulk ops), but the **information architecture inverts the user's mental model**: you scroll past commit, branch compare, history, and PR creation before reaching the file change tree that should anchor the panel. A power user trusts the parts; a first-time user won't know where to look.

## What's Working

1. **Discard and conflict guardrails** — `getDiscardConfirmation` tailors destructive copy per file state; conflict banner with operation-specific abort is clear and appropriately urgent.
2. **Header context** — Branch pill + linked PR badge/title in the chrome give persistent orientation without opening another view.
3. **Tree + bulk selection** — Directory collapse, line stats, and bulk stage/unstage/discard match IDE SCM expectations once the user reaches the tree.

## Priority Issues

### [P1] Inverted vertical hierarchy buries the change list

- **Why it matters:** The primary loop is inspect diff → stage → commit. In `ChangesPanelBody`, render order is `CommitArea` → `BranchCompareArea` → `GitHistoryPanel` → `PullRequestArea` → empty/bulk → sections tree. Users with changes must scroll past infrequent workflows to reach files.
- **Fix:** Reorder to: conflict banner → file sections (+ bulk bar) → commit/remote → collapsible secondary blocks (history, compare, PR) default-collapsed.
- **Suggested command:** `$impeccable layout`

### [P1] Always-visible secondary workflows create panel fatigue

- **Why it matters:** Branch compare, full history, and PR composer each occupy a bordered card at all times, even when the user only wants to commit two files. This fails single-focus and progressive-disclosure checks.
- **Fix:** Collapse compare/history/PR behind section headers or tabs; remember expansion in local state; show PR block when linked PR exists or user explicitly creates one.
- **Suggested command:** `$impeccable distill`

### [P1] Per-row actions are hover-gated (discoverability + accessibility)

- **Why it matters:** `.changes-panel__row-actions { opacity: 0 }` only reveals Stage/Discard on hover or focus-within. Keyboard users who tab to the checkbox may miss actions; trackpad users on dense trees won't discover affordances.
- **Fix:** Keep actions visible at reduced emphasis, or expose a single overflow per row; ensure focus order reaches actions without hover.
- **Suggested command:** `$impeccable audit`

### [P2] Custom overflow menu instead of shadcn `DropdownMenu`

- **Why it matters:** Project ADR boundary prefers `DropdownMenu` for overflow menus. Current `changes-panel__action-menu` uses `position: absolute` inside a scrollable panel — clipping risk — and menu children are not `role="menuitem"` buttons.
- **Fix:** Replace with `DropdownMenu` + `DropdownMenuItem`; wire `aria-expanded` via Radix.
- **Suggested command:** `$impeccable polish`

### [P2] Undefined `--color-panel` token on sub-cards

- **Why it matters:** `styles.css` sets `background: var(--color-panel)` on commit/remote/compare/history/pr cards, but `--color-panel` is not defined in `@theme` or `:root`. Background may fall through inconsistently across engines.
- **Fix:** Map to an existing token (e.g. `--color-card` or `--composer-control-surface`) per DESIGN.md.
- **Suggested command:** `$impeccable colorize`

## Persona Red Flags

**Alex (Power User):** Change tree is below the fold. No keyboard shortcuts for stage/commit. Row actions require hover. "More source control actions" text trigger is slower than a compact chevron menu labeled with the next action.

**Jordan (First-Timer):** Single-letter `STATUS_LABELS` (`M`, `A`, `D`) without legend. "No upstream" / "ahead, behind" with no explanation. Compare Base/Head fields visible before any files — reads as git exam, not guided flow.

**Sam (Accessibility):** Hidden row actions fail recognition heuristic. Custom menu items are nested `SourceControlActionButton` grids, not semantic menuitems. Checkbox + filename button + two ghost buttons per row create a long tab stop chain without roving tabindex.

## Minor Observations

- Unicode chevrons (`▸`/`▾`) in section/tree headers while header chrome uses Lucide — inconsistent icon vocabulary.
- `box-shadow: 0 1rem 2rem` on `.changes-panel__action-menu-items` paired with border — matches impeccable ghost-card tell.
- `operationError` renders outside the card grid margin pattern (`margin: 0 0.625rem`) — slightly misaligned error strip.
- Commit form lacks explicit loading/disabled styling on the primary commit path when `isCommitting` is true.

## Questions to Consider

- What if the panel had one sticky "commit strip" at the bottom and everything else scrolled above it?
- Should branch compare and history live in a secondary tab rather than the default Changes view?
- What would a "clean working tree" state look like if PR and history were hidden until relevant?
