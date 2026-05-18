# Product

## Register

product

## Users

Pi Desktop (Electron and web app) serves developers, maintainers, and coding-agent power users who work in local project folders on macOS. They use the app to start, inspect, steer, abort, and resume Pi coding sessions while keeping workspace context visible.

Users are often mid-flow in a coding task. They need quick project selection, persistent chat/session context, visible runtime state, and clear inspection surfaces for tool calls, terminal output, file previews, diffs, errors, and recovery actions.

## Product Purpose

Pi Desktop is an open-source macOS command center for the Pi coding agent CLI. It gives Pi a graphical desktop workspace for local coding-agent work while keeping Pi as the source of agent behavior, tools, providers, models, sessions, and extension primitives.

Success means a user can select a project, start or resume a Pi-backed session, follow streaming agent work, inspect tool and file effects, recover from runtime or filesystem failures, and return to recent work across app restarts.

## Brand Personality

Native utility: quiet, precise, local, and task-first.

The interface should feel like a serious macOS developer tool: restrained, inspectable, fast to scan, and explicit about state. It should support expert workflows without performative complexity.

## Anti-references

- Chatbot toy feel: playful assistant chrome, novelty avatars, casual agent framing, or UI that makes coding-agent work feel unserious.
- SaaS dashboard clichés: generic metric cards, marketing gradients, repeated icon-card grids, or management-console decoration.
- Neon hacker styling: terminal cosplay, neon-on-black palettes, novelty cyber visuals, or saturated inactive states.
- Hidden autonomy: patterns that obscure tool execution, workspace scope, filesystem effects, runtime failures, or active session state.

## Design Principles

- Keep workspace truth visible: show the active project path, session scope, runtime state, and failure context where users make decisions.
- Make agent work inspectable: tool calls, terminal output, file effects, diffs, and errors should be first-class surfaces.
- Preserve flow over ceremony: favor direct actions, resumable state, and predictable controls over onboarding friction or decorative reveal.
- Use motion for orientation: motion should explain state changes, scope shifts, progressive reveals, and active runtime status without becoming decoration.
- Earn native familiarity: use consistent macOS-oriented product patterns, restrained color, clear focus states, compact density, and motion that supports spatial understanding.
- Fail visibly: auth, runtime, filesystem, session, and tool failures should explain what happened and the next available action.

## Accessibility & Inclusion

Target WCAG 2.2 AA as the baseline. Product surfaces should provide readable contrast, visible focus, keyboard-reachable controls, reduced-motion-safe transitions, and status indicators that do not rely on color alone. Motion should respect `prefers-reduced-motion` and keep an understandable non-motion equivalent for state changes.
