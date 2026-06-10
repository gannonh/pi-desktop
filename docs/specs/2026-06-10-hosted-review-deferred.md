# Hosted review deferred scope (Wave 5.1 follow-up)

## Status

Active deferral note for Wave 5.1 hosted review depth ([#155](https://github.com/gannonh/pi-desktop/issues/155)).

## Shipped in Wave 5.1

- Linked GitHub pull request metadata in the Changes panel (title, state badge, open-in-browser, copy link).
- Main-process `gh auth status` probe with actionable remediation copy.
- Richer `gh` error mapping for missing CLI, auth failures, and no linked PR on the current branch.

## Explicitly deferred

The following Orca Checks / hosted-review capabilities remain out of scope until a dedicated PR review milestone:

- CI check status list and required-check gating.
- Pull request review comments (inline and conversation threads).
- Merge, squash-merge, and rebase-merge actions from the desktop app.
- Full PR review tab (Orca Checks panel parity).
- GitLab merge request creation, linking, and review workflows (`glab` integration).

## Provider scope

- **GitHub only** via the local `gh` CLI for create/view linked PR metadata.
- **GitLab remains out of scope** unless a future milestone explicitly adopts `glab` and GitLab auth settings.

## Follow-up entry points

- Wave 5.2 Git settings may add configurable default base refs for compare/PR generation ([#156](https://github.com/gannonh/pi-desktop/issues/156)).
- A future PR review tab should consume the linked PR state established here rather than duplicating forge detection in the Changes panel.
