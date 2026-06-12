---
target: src/renderer/changes-panel/ChangesPanel.tsx
total_score: 30
p0_count: 0
p1_count: 2
p2_count: 2
p3_count: 1
timestamp: 2026-06-12T16-11-13Z
slug: src-renderer-changes-panel-changespanel-tsx
---
# Design Critique: ChangesPanel (post SCM-rail refactor)

**Target:** `src/renderer/changes-panel/ChangesPanel.tsx`
**Register:** Product (Graphite Workbench / familiar agent IDE)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Committing label and refresh spin are good; upstream/sync feedback still buries under commit form |
| 2 | Match System / Real World | 3 | Section order now matches VS Code; commit composer and row density still feel heavier than Cursor |
| 3 | User Control and Freedom | 4 | DropdownMenu overflow, discard guards, collapsible secondaries |
| 4 | Consistency and Standards | 3 | shadcn buttons/menus align with ADR; raw inputs and text row actions remain bespoke |
| 5 | Error Prevention | 3 | Strong discard copy and disabled reasons on remote actions |
| 6 | Recognition Rather Than Recall | 3 | IA fixed and row actions visible; per-row still packs 5+ controls in a narrow rail |
| 7 | Flexibility and Efficiency | 2 | No keyboard accelerators; three text buttons per row slow expert staging |
| 8 | Aesthetic and Minimalist Design | 3 | Flat sections help; commit strip + three collapsed footers still compete for height |
| 9 | Error Recovery | 3 | Commit failure recovery dialog remains thoughtful |
| 10 | Help and Documentation | 2 | Single-letter status codes; upstream ahead/behind unexplained for novices |
| **Total** | | **30/40** | **Good — core IA fixed; density and pinning are the next wins** |

**Cognitive load:** 3/8 checklist failures (moderate). Primary loop is findable; commit strip and secondary headers still add vertical tax in a ~320px rail.

## Anti-Patterns Verdict

**LLM assessment:** Does not read as marketing AI slop. It reads as a credible developer SCM surface that has crossed from "feature stack" to "familiar rail," but not yet to "invisible tool." The commit strip tint and multi-row textarea echo a form card more than VS Code's pinned one-liner. Compared to Cursor (screenshot reference), Pi Desktop still shows more labels, more text buttons, and less iconographic compression.

**Deterministic scan:** `detect.mjs` on `ChangesPanel.tsx` returned **0 findings** (exit 0).

**Visual overlays:** Not run — critique based on user screenshots + source review.

## Overall Impression

The SCM-rail refactor landed the big bet: files first, commit near the bottom, secondary workflows collapsed. What remains is **rail density** and **true pinning**. In a narrow right panel, every extra label row and text button costs scan time. Cursor wins on compression (icon actions, single-line commit, sync inline); Pi Desktop still asks the user to read a small form before every commit.

## What's Working

1. **Correct vertical story** — Staged → Changes → Untracked, then commit, then collapsed Compare/History/PR matches IDE muscle memory.
2. **Header chrome** — Branch pill + linked PR summary give orientation without opening sub-panels.
3. **Progressive disclosure** — Secondary blocks default collapsed; PR auto-expands when relevant.

## Priority Issues

### [P1] Commit strip scrolls with content instead of pinning to the panel bottom

- **Why it matters:** VS Code/Cursor keep the commit box viewport-fixed at the rail bottom. Here `.changes-panel__body { overflow: auto }` wraps tree + commit strip + secondary headers, so a long tree or expanded PR pushes commit off-screen — the exact problem the refactor aimed to solve.
- **Fix:** Split body into `grid-template-rows: minmax(0, 1fr) auto auto` — scrollable tree only; commit strip and secondary accordion pinned below.
- **Suggested command:** `$impeccable layout`

### [P1] File rows are too wide for the rail (text buttons × 3)

- **Why it matters:** Checkbox + `M` badge + filename + line stats + Stage + Discard overflows or wraps in ~300px panels (visible in screenshot). Cursor uses icon-only stage/revert with tooltips.
- **Fix:** Replace text ghost buttons with compact icon buttons (`Plus`/`Minus`/`Undo2`) or a single row `DropdownMenu`; keep labels in `aria-label` + `title`.
- **Suggested command:** `$impeccable distill`

### [P2] Commit composer is still form-heavy

- **Why it matters:** Visible "Commit message" label + 3-row textarea + Generate row + upstream summary + primary + overflow reads as a mini-form, not a commit bar. Cursor: one input, commit button, sync icons on one row.
- **Fix:** Single-line input (expand on focus), inline Commit primary + Generate icon + sync cluster; demote upstream text to caption or header tooltip.
- **Suggested command:** `$impeccable quieter`

### [P2] Three collapsed secondary headers are permanent footer chrome

- **Why it matters:** Even collapsed, Branch Compare / History / Pull Request consume three section rows below commit — visual noise on every visit.
- **Fix:** Move to header overflow ("Compare…", "History…", "Pull Request…") or one "More" collapsible group; keep PR auto-expand when linked.
- **Suggested command:** `$impeccable distill`

### [P3] Status letters (`M`/`A`/`D`) lack affordance for novices

- **Why it matters:** Accurate for git users; Jordan persona stalls without tooltips or a legend.
- **Fix:** `title` on badge with full word, or swap to muted word chips at `caption` size when panel width &lt; 360px.
- **Suggested command:** `$impeccable clarify`

## Persona Red Flags

**Alex (Power User):** Still no stage/commit shortcuts. Three tab stops per row before actions. Must scroll to find commit when tree is long. Primary action on clean tree defaults to Create PR — wrong emphasis for daily commit loop.

**Jordan (First-Timer):** `M` badge unexplained. "No upstream / 0 ahead, 0 behind" without glossary. Expanded PR block (title + body + Generate with AI) feels like a second app inside Changes.

**Sam (Accessibility):** Long tab chain per file row (checkbox → diff button → Stage → Discard). Row actions at 0.55 opacity may fail contrast for low-vision users treating muted as disabled.

## Minor Observations

- Commit strip `background: color-mix(...)` reads slightly card-like vs tonal-first DESIGN.md rule.
- `Generate` and `Commit` are separated vertically; VS Code clusters primary commit adjacent to input.
- Linked PR in header + full PR composer when expanded duplicates PR context.
- Bulk bar placement above tree is correct; consider sticky sub-bar when selection active.

## Questions to Consider

- What if only the file tree scrolled, and everything below the last staged file was pinned?
- Should Compare/History/PR live in header `⋯` until the user has a linked PR or explicit intent?
- What would a one-row commit bar look like with icon sync + overflow, matching Cursor density without copying assets?
