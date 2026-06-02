# ADR 0003: shadcn/ui boundary for renderer chrome

## Status

Accepted

## Context

Pi Desktop uses [shadcn/ui](https://ui.shadcn.com) via `components.json` (`style: new-york`, `base: radix`, `iconLibrary: lucide`, CSS variables in `src/renderer/styles.css`).

The renderer also ships substantial **custom shell UI**:

- `app-shell` column layout and resize handles
- `project-sidebar` (projects, chats, inline rename, context menus)
- Workspace tab strip (tool tabs, open file tabs, add menu)
- File workspace (explorer tree, viewer toolbar, editor)

Those surfaces are implemented with feature-owned markup and BEM-style classes in `styles.css`, not with registry components such as `Sidebar`, `Tabs`, or `DropdownMenu`. Installed shadcn primitives include `badge`, `button`, `card`, `command`, `dialog`, `popover`, `scroll-area`, and `separator`; product usage stays focused on generic controls such as the composer command palette.

Visual and interaction tuning (Graphite Workbench, density, workspace tab model, file explorer) is intentional product work documented in `DESIGN.md` and milestone specs. It is not throwaway styling.

A full migration of the app shell to shadcn blocks would be a large refactor with high regression risk and would not map cleanly to the desktop coding-agent workbench layout without re-tuning most chrome.

## Decision

Treat shadcn/ui as the **design-system foundation and default for generic controls**, not as the implementation layer for the entire app shell.

1. **Foundation (already in place)**  
   - `components.json`, shared tokens, `cn()`, and `src/renderer/components/ui/*` from the registry.  
   - New registry components are added with the shadcn CLI when a feature needs them.

2. **Custom shell (explicitly allowed)**  
   - App shell, left sidebar, workspace tab strip, and file workspace layout/chrome remain custom until a dedicated consolidation milestone says otherwise.  
   - Custom code must still use project tokens (`--sidebar-background`, semantic colors) and `DESIGN.md`, not ad hoc palette choices.

3. **Prefer shadcn for new generic UI**  
   - Menus, icon buttons, dialogs, forms, confirmations, empty states, and other standard patterns should use installed or newly added registry components (`Button`, `DropdownMenu`, etc.) rather than new bespoke primitives (for example, no second menu system alongside `menu.tsx` without cause).

4. **Icons**  
   - Renderer icons must use the configured library: **`lucide-react`** per `components.json`.  
   - Do not add parallel icon packages for product UI.

5. **No wholesale shell rewrite by default**  
   - Milestone work should not assume “convert sidebar/tabs to shadcn” unless the milestone explicitly scopes design-system consolidation.

## Alternatives considered

### Full shadcn shell (Sidebar, Tabs, Sheet)

- **Pros:** One component vocabulary; less custom CSS over time.  
- **Rejected for now:** Poor fit for the current resizable three-column workbench and unified workspace tab model; would force a broad re-tuning pass on recently validated UX.

### Abandon shadcn and stay fully custom

- **Pros:** Maximum control; no CLI or registry coupling.  
- **Rejected:** Project already invested in `components.json`, tokens, and Radix-based primitives; abandoning shadcn removes a useful path for forms, dialogs, and standard controls.

### Status quo without documenting the boundary

- **Rejected:** Leads to drift (mixed icon libraries, duplicate menu patterns) and mismatched expectations that “this is a shadcn project” means all UI comes from the registry.

## Consequences

- Recent shell and file-workspace tuning remains valid; it is not prerequisite work thrown away.  
- Agents and contributors should read `components.json` and this ADR before adding renderer UI.  
- New features should extend custom shell only when the UX is workbench-specific; otherwise use shadcn components and Lucide icons.  
- Incremental adoption is expected (for example, `DropdownMenu` for overflow and add-panel menus) without a big-bang migration.  
- A future milestone may revisit shell consolidation; if so, it should be scoped, acceptance-tested, and called out in the roadmap explicitly.
