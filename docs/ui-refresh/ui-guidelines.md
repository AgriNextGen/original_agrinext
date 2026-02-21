# UI Refresh — Lightweight Guidelines

Purpose
- Provide minimal, practical UI rules for polishing pages across Farmer / Agent / Admin dashboards without redesigning layouts or navigation.

A) Page header pattern
- Title (H1) left-aligned, short subtitle underneath (optional).
- Actions (primary CTA, secondary buttons) aligned right; stack vertically on small screens.
- Use existing `PageShell` for header composition; prefer a small `PageHeader` wrapper for consistency.

B) Page layout order
- Header -> optional stat cards -> filters / search -> list / grid -> empty state / pagination
- Keep consistent vertical spacing (use `space-y-6` as default).

C) Buttons
- Primary: use for main page action (solid, `Button` default/primary).
- Secondary: outline or ghost for secondary actions.
- Destructive: use `variant="destructive"` and require confirm dialog.
- Async rules: disable primary action while pending, change label to `Saving...` / `Creating...`, show spinner if available.

D) Spacing
- Container padding: `p-4` (mobile) / `md:p-6`.
- Card padding: prefer `p-4` for compact cards, `p-6` for detail cards.
- Use consistent gap sizes: `gap-4` for lists, `gap-3` for small controls.

E) Empty state
- Show an icon (lucide), headline (H3), 1-line description, and one CTA button.
- Keep copy actionable: headline + short hint + CTA.

F) Accessibility
- Add `aria-label` to icon-only buttons.
- Ensure interactive elements have visible focus outlines (Tailwind `focus-visible` utilities via current theme).
- Colors: prefer `text-muted-foreground` for secondary text; ensure contrast meets minimum.

Implementation notes
- Use existing shadcn/ui components in `src/components/ui`.
- Add small shared wrappers in `src/components/shared` (PageHeader, EmptyState, StatCard) to make consistent changes low-friction.

