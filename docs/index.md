---
okf_version: "0.1"
---

# Pi Desktop Knowledge Bundle

Start here before substantial Pi Desktop work. This OKF bundle organizes roadmap, specs, decisions, and durable project knowledge.

# Core Map

* [Specs roadmap](specs/) - Active, planned, blocked, completed, and archived work.
* [Architecture decisions](adrs/) - Accepted ADRs that constrain implementation choices.
* [Product roadmap](/pi-desktop-high-level-roadmap.md) - Product requirements and high-level milestone roadmap.
* [Documentation map](/docs-map.md) - Legacy documentation pointer map retained for continuity.
* [Diagrams](diagrams/) - HTML diagrams and visual architecture references.

# Current Work

* [Orca Git Parity Roadmap](/specs/2026-06-08-orca-git-parity-roadmap.md) - Active source-control follow-up roadmap after M07C.
* [Worktree and runtime scope follow-up triggers](/specs/2026-06-10-worktree-scope-followups.md) - Decision gates for reopening worktree and runtime Git boundaries.
* [Hosted review deferred scope](/specs/2026-06-10-hosted-review-deferred.md) - Deferred hosted review scope; reopen via [M07H PR review](/pi-desktop-high-level-roadmap.md#m07h-right-panel---pull-request-review).

# Planned Right-Panel Milestones

* [M07H: Pull Request Review](/pi-desktop-high-level-roadmap.md#m07h-right-panel---pull-request-review) - Dedicated right-panel GitHub PR review surface (planned; spec TBD).

# Durable Constraints

* [ADR 0003: shadcn/ui boundary for renderer chrome](/adrs/0003-shadcn-ui-boundary.md) - Renderer UI boundary for custom shell surfaces and generic shadcn controls.
* [ADR 0004: Source-control AI generation boundary](/adrs/0004-source-control-ai-generation-boundary.md) - Main-process and Pi-owned source-control AI generation boundary.
* [ADR 0005: Source-control worktree and runtime scope](/adrs/0005-source-control-worktree-scope.md) - Selected-project-only source-control scope for the current milestone wave.

# Repository-Level Context

Root-level project documents remain in place for tool and human expectations:

* `README.md` - Setup, run, test, and release commands.
* `AGENTS.md` - Agent operating instructions.
* `PRODUCT.md` - Product positioning and direction.
* `CONTEXT.md` - Domain language and product context.
* `DESIGN.md` - Renderer visual design language.
