# Changes Panel Polish Evidence

Before/after screenshots for the Changes panel layout, divider, primary-action, and workflow UX polish.

## Scenarios

| File | State |
|------|-------|
| `01-clean-collapsed.png` | Clean tree, workflows collapsed |
| `02-clean-all-expanded.png` | Clean tree, all 3 workflows expanded (divider stress test) |
| `03-dirty-files.png` | Mixed staged/unstaged/untracked |
| `04-bulk-selection.png` | Dirty + 2 files selected |
| `05-linked-pr-history.png` | Linked PR + History expanded |
| `06-merge-conflict.png` | Merge conflict banner + conflict entries |
| `07-no-git.png` | Initialize repository empty state |

## Capture

```bash
pnpm capture:changes-panel --phase before
pnpm capture:changes-panel --phase after
```

Screenshots are written to `before/` and `after/` under this directory. Compare matching filenames across phases to verify layout, divider, primary-action, and workflow UX changes.
