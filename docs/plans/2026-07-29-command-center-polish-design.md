# SiagaKita Operational Layers Design

## Design Read

Public-sector emergency command center for BPBD operators and field teams, using a trust-first technical-utilitarian language with a map-led workspace.

## Direction

- Preserve Poppins and the navy, teal, amber, and crisis-red status system.
- Treat maps as working canvases, not decorative hero imagery.
- Use translucent surfaces only when a panel overlays a map or spatial context.
- Keep operational pages dense enough for scanning without turning them into cockpit-style data walls.
- Use red only for critical states and actionable escalation.

## Interaction Model

- Desktop uses a layered workspace with a persistent sidebar, command strip, map, and contextual side panels.
- Tablet compresses supporting panels beneath or beside the primary workspace.
- Mobile converts secondary spatial information into drawers or stacked cards.
- Motion is limited to page entrance, panel changes, and status feedback using opacity and transform.
- Reduced-motion preferences remove movement while preserving all content and state feedback.

## Shared Components

- `PageHeader`: breadcrumb context, page identity, description, and actions.
- `OperationalCard`: consistent surface, border, density, and optional emphasis.
- `MetricStrip`: responsive rail for operational metrics.
- `CommandStrip`: active incident context and quick status scan.
- `FilterBar`: compact responsive filtering surface.
- `MapOverlay`: functional glass panel positioned over map content.
- `OperationalState`: consistent loading, empty, error, and success feedback.

## Page Emphasis

- Dashboard and event detail receive the strongest spatial hierarchy.
- Shelter, logistics, and reporting pages prioritize task completion and mobile card representations.
- Public map removes sensitive operational detail and uses plain-language disclosure.
- Login remains calm and human, with stronger product identity and restrained emergency cues.

## Guardrails

- Do not add unsupported metrics, live-data claims, or autonomous AI decisions.
- Do not apply glass, gradients, or animation to every surface.
- Do not hide critical information behind hover-only interactions.
- Do not allow tables, maps, or controls to create root-level horizontal overflow.
- Do not animate layout dimensions, shadows, filters, or continuous background effects.
