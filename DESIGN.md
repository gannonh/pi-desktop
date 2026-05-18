---
name: Pi Desktop
description: Open-source macOS command center for local Pi coding-agent sessions.
colors:
  graphite-base: "oklch(0.145 0 0)"
  graphite-main: "oklch(0.209 0 0)"
  graphite-sidebar: "oklch(0.191 0 0)"
  graphite-panel: "oklch(0.18 0 0)"
  graphite-raised: "oklch(0.297 0 0)"
  graphite-control: "oklch(0.248 0 0)"
  graphite-selected: "oklch(0.269 0 0)"
  graphite-menu: "oklch(0.289 0 0)"
  graphite-menu-hover: "oklch(0.375 0 0)"
  text-primary: "oklch(0.985 0 0)"
  text-secondary: "oklch(0.907 0 0)"
  text-muted: "oklch(0.708 0 0)"
  text-subtle: "oklch(0.699 0 0)"
  text-dim: "oklch(0.64 0 0)"
  border-subtle: "oklch(1 0 0 / 10%)"
  input-border: "oklch(1 0 0 / 15%)"
  focus-ring: "oklch(0.556 0 0)"
  state-attention: "oklch(0.682 0.173 251.11)"
  state-danger: "oklch(0.704 0.191 22.216)"
  state-warning: "oklch(0.653 0.221 27.01)"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.25rem)"
    fontWeight: 500
    lineHeight: 1.15
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.15
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.45
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.2
  caption:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.2
rounded:
  control: "0.375rem"
  panel: "0.5rem"
  menu-popover: "0.625rem"
  bubble: "1rem"
  composer: "1.5rem"
  pill: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  xxl: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.text-primary}"
    textColor: "{colors.graphite-selected}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.75rem"
    height: "2.25rem"
  button-secondary:
    backgroundColor: "{colors.graphite-selected}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.75rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.control}"
    padding: "0.25rem 0.375rem"
  composer-surface:
    backgroundColor: "{colors.graphite-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.composer}"
    padding: "0.75rem 0.75rem 0.25rem"
  sidebar-row-active:
    backgroundColor: "{colors.graphite-selected}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.control}"
    padding: "0.5rem"
  menu-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "0.25rem"
    padding: "0.375rem 0.5rem"
  badge-outline:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
---

# Design System: Pi Desktop

## 1. Overview

**Creative North Star: "The Familiar Agent Workbench"**

Pi Desktop (Electron and web app) lives in the new desktop coding-agent category, where users already expect a left session rail, a centered start composer, a compact runtime header, and inspectable transcript output. The system should honor that emerging familiarity while staying original, open-source, and tied to Pi's local runtime model.

The visual language is a Graphite Workbench: dark tonal surfaces, compact macOS density, scarce accent color, and controls that stay quiet until state matters. A developer should trust the interface as a daily work surface, not a spectacle.

Motion is part of the workbench. It should preserve spatial context, clarify what changed, reveal hierarchy, and mark active runtime status. It should stay short, interruptible, and reduced-motion-safe.

The system explicitly rejects chatbot toy feel, SaaS dashboard clichés, neon hacker styling, hidden autonomy, and decorative motion. It should feel local, precise, and inspectable, with enough category familiarity that users can transfer habits from current desktop coding-agent tools.

**Key Characteristics:**

- Dark, low-chroma graphite neutrals with one scarce blue state accent and a clear red danger family.
- Compact controls, small radii, and macOS-oriented side navigation.
- Tonal layering first, shadows only for raised composer and floating menus.
- Motion that explains state, scope, reveal, and runtime changes without animating layout properties.
- Transcript and file-effect surfaces that make agent work inspectable.
- Visible scope, status, and recovery context wherever the user can act.

## 2. Colors

The palette is restrained graphite: near-black surfaces step upward through adjacent neutral tones, while blue and red appear only for status, focus, and risk.

### Primary

- **Graphite Base** (`graphite-base`): the deepest app background and global canvas. Use for quiet empty space and app-level framing.
- **Graphite Main** (`graphite-main`): the main content surface behind chat, settings, and project detail views.
- **Graphite Raised** (`graphite-raised`): the composer input surface and any primary active input container.
- **Graphite Selected** (`graphite-selected`): selected rows, secondary buttons, hover fills, user bubbles, and muted control states.

### Secondary

- **State Attention Blue** (`state-attention`): active attention dots, retry notices, toggles, and future info states. Use sparingly so it remains meaningful.
- **State Danger Red** (`state-danger`): destructive runtime errors and abort action backgrounds.
- **State Warning Red** (`state-warning`): sidebar missing-folder, failed-session, and destructive menu copy.

### Neutral

- **Graphite Sidebar** (`graphite-sidebar`): the sidebar rail surface, distinct from the main content area.
- **Graphite Panel** (`graphite-panel`): transcript cards, popovers, and low-emphasis panels.
- **Graphite Control** (`graphite-control`): recessed composer controls and secondary control rows.
- **Graphite Menu** (`graphite-menu`): floating menus and command surfaces.
- **Text Primary** (`text-primary`): main copy, headings, selected labels, and primary icon color.
- **Text Muted** (`text-muted`): secondary copy, placeholder text, timestamps, disabled affordances, and metadata.
- **Border Subtle** (`border-subtle`): structural dividers, panel outlines, and transcript card borders.

### Named Rules

**The Scarce Ink Rule.** Blue and red must communicate state, risk, or runtime status. They are forbidden as decoration.

**The Graphite Step Rule.** Separate surfaces by adjacent tonal steps before adding borders or shadows.

**The No Pure Black Rule.** Avoid pure black or pure white in new tokens. Neutrals should stay slightly lifted from extremes, even when very dark.

## 3. Typography

**Display Font:** Inter with system fallbacks.
**Body Font:** Inter with system fallbacks.
**Label/Mono Font:** No separate mono family is currently defined. Inline code inherits product typography unless a dedicated code surface adds a mono token later.

**Character:** The type system is native, compact, and utilitarian. It uses weight and density for hierarchy, not display personality.

### Hierarchy

- **Display** (500, `clamp(1.75rem, 3vw, 2.25rem)`, 1.15): start-state questions and empty-screen prompts.
- **Headline** (600, `clamp(1.5rem, 4vw, 2.5rem)`, 1.15): project recovery and detail titles.
- **Title** (500, `0.9375rem`, 1.45): transcript body emphasis, composer text, and compact content titles.
- **Body** (400, `0.875rem`, 1.5): navigation rows, buttons, transcript metadata, project copy, and normal UI text.
- **Label** (500, `0.8125rem`, 1.2): badges, local menu items, and compact control labels.
- **Caption** (400, `0.75rem`, 1.2): status captions, error metadata, and low-emphasis helper text.

### Named Rules

**The One Family Rule.** Use one sans family unless a dedicated code viewer or terminal surface requires mono text.

**The Density Rule.** Product text should stay compact and scannable. Do not introduce oversized marketing type into task surfaces.

## 4. Elevation

Pi Desktop uses tonal layering as its depth model. Resting surfaces are mostly flat; the sidebar, main surface, composer, transcript cards, and menus separate through graphite steps and subtle borders. Shadows mark raised, interactive, or floating surfaces only.

### Shadow Vocabulary

- **Composer Lift** (`0 0.875rem 1.375rem -0.875rem rgb(0 0 0 / 30%)`): used only under the main composer input panel to make the active writing surface feel reachable.
- **Menu Float** (`0 1rem 2rem rgb(0 0 0 / 28%)`): used for local composer menus that appear above controls.
- **Context Menu Float** (`0 12px 32px oklch(0 0 0 / 35%)`): used for sidebar and context menus that need to clear dense navigation.

### Named Rules

**The Tonal-First Rule.** Add a tonal step before adding a shadow.

**The Floating-Only Rule.** Shadows belong on composer and menus. Static panels, rows, and transcript cards stay flat.

## 5. Components

### Buttons

Quiet controls: buttons should feel native, compact, and stateful without visual noise.

- **Shape:** gently curved controls (`0.375rem`) for standard buttons and fully round icon buttons (`999px`) for composer send and status controls.
- **Primary:** light graphite text surface on dark foreground (`button-primary`), used for primary shadcn-style controls and the composer send button.
- **Secondary:** selected graphite fill (`button-secondary`) with primary text for project actions, user bubbles, and secondary controls.
- **Ghost:** transparent by default, graphite hover fill on interaction, muted text until active.
- **Hover / Focus:** hover uses `graphite-selected` or `graphite-menu-hover`; focus uses a visible `3px` ring where the component library supplies it or an explicit `2px` outline for textareas.

### Chips

Badges and path chips should stay informational, not promotional.

- **Style:** outline chips use transparent fill, subtle border, primary text, `999px` radius, and compact horizontal padding.
- **State:** selected and active chips may use graphite selected fill. Blue chips are reserved for actual status or selected toggles.

### Cards / Containers

Containers are inspection surfaces, not decorative cards.

- **Corner Style:** transcript and panel corners use the panel radius (`0.5rem`); user bubbles use a larger conversational radius (`1rem`).
- **Background:** transcript cards use `graphite-panel` mixed toward transparency; user messages use `graphite-selected`; composer uses `graphite-raised` above a `graphite-control` control row.
- **Shadow Strategy:** no resting shadows on static cards. The composer and floating menus carry the elevation vocabulary.
- **Border:** use `border-subtle` for structure and card boundaries.
- **Internal Padding:** dense surfaces use `0.5rem` to `0.75rem`; empty or recovery states may expand to `2rem 1rem`.

### Inputs / Fields

Inputs should feel like working surfaces.

- **Style:** the composer textarea sits inside a raised rounded surface (`1.5rem`) with transparent input chrome.
- **Focus:** textarea focus uses a visible outline (`2px solid focus-ring`) offset from the text area, not a hidden color-only change.
- **Error / Disabled:** disabled controls keep layout stable and use opacity; runtime errors use red-tinted backgrounds and borders.

### Navigation

Navigation is a macOS-like left rail with project and chat hierarchy.

- **Style:** sidebar rows use compact body text, folder/chat icons, and `0.375rem` row radius.
- **Default State:** muted text on graphite sidebar, no unnecessary fill.
- **Hover / Active:** selected rows use `graphite-selected`; hover reveals menu affordances and archive icons.
- **Collapsed State:** collapse the sidebar structurally while keeping window controls and active chat title available.

### Motion Behavior

Motion should orient the user. Use transform, opacity, color, and icon state changes to explain sidebar collapse, chat reveal, composer send/running/abort state, menu opening, tool result expansion, and attention changes. Keep most transitions between 150ms and 250ms with ease-out timing. Respect `prefers-reduced-motion` by shortening or removing nonessential movement while preserving the final state change.

### Signature Component: Composer

The composer is the primary work surface. It combines a raised prompt panel, a recessed control row, compact model/access controls, and a round send or abort button. Its shape and placement define the app's first impression. Do not restyle it as a generic chat input.

### Signature Component: Transcript Work Card

Transcript cards make file and tool effects inspectable. They should remain flat, bordered, and compact, with a leading icon block, title, subtitle, and one action. Avoid metric-card treatments.

## 6. Do's and Don'ts

### Do

- **Do** keep workspace scope, active path, session status, and failure context visible around user actions.
- **Do** use graphite tonal steps before adding borders or shadows.
- **Do** reserve State Attention Blue for status, toggles, selected state, retry, and future information states.
- **Do** keep controls compact, familiar, and keyboard reachable.
- **Do** use transcript cards to show tool, file, terminal, and diff effects as inspectable records.
- **Do** use motion to explain state changes, reveal hierarchy, and preserve spatial context.
- **Do** follow the emerging desktop coding-agent layout pattern: persistent left rail, central composer, scoped session header, and inspectable transcript.

### Don't

- **Don't** create a chatbot toy feel with playful assistant chrome, novelty avatars, or casual agent framing.
- **Don't** use SaaS dashboard clichés: generic metric cards, marketing gradients, repeated icon-card grids, or management-console decoration.
- **Don't** use neon hacker styling, terminal cosplay, novelty cyber visuals, or saturated inactive states.
- **Don't** hide autonomy. Tool execution, workspace scope, filesystem effects, runtime failures, and active session state must stay visible.
- **Don't** use decorative motion, bounce, elastic easing, indefinite attention loops, or motion that hides latency.
- **Don't** animate layout properties such as width, height, grid tracks, margin, or padding. Use transform, opacity, clip, and color instead.
- **Don't** copy Codex app pixels, proprietary assets, or implementation details. Use the category pattern as a reference and keep Pi Desktop original.
- **Don't** use side-stripe borders, gradient text, default glassmorphism, hero metrics, or identical card grids.
