# Typography System

> Official type scale for the AgriNext Gen platform.
> All pages and components MUST use these definitions. No ad-hoc font sizes.

---

## 1. Font Families

| Token | Family | Tailwind Class | Usage |
|-------|--------|----------------|-------|
| **Sans** | Plus Jakarta Sans, system-ui, sans-serif | `font-sans` (default body) | Body text, labels, form inputs, table cells, descriptions |
| **Display** | Outfit, system-ui, sans-serif | `font-display` | Page titles, section headings, KPI values, hero text |

Both families are loaded via Google Fonts in `src/index.css`:
```
Plus Jakarta Sans: 300, 400, 500, 600, 700, 800
Outfit: 400, 500, 600, 700, 800
```

### Font Loading

The `@import url(...)` in `index.css` loads both families with `display=swap` to prevent invisible text during load. No additional font loading configuration is needed.

### Why Two Fonts

- **Plus Jakarta Sans** has excellent readability at small sizes (14px body) and clear numerals for data tables.
- **Outfit** provides stronger visual weight for headings and display numbers, creating contrast against body text without relying solely on size differences.

---

## 2. Type Scale

### Full Scale Definition

| Level | Size | Weight | Line Height | Tracking | Font | Tailwind Classes |
|-------|------|--------|-------------|----------|------|-----------------|
| **Display** | 36px / 2.25rem | 700 bold | 1.2 (43px) | -0.025em | Display | `text-4xl font-display font-bold tracking-tight` |
| **Heading 1** | 30px / 1.875rem | 600 semibold | 1.2 (36px) | -0.025em | Display | `text-3xl font-display font-semibold tracking-tight` |
| **Heading 2** | 24px / 1.5rem | 600 semibold | 1.3 (31px) | -0.025em | Display | `text-2xl font-display font-semibold tracking-tight` |
| **Heading 3** | 18px / 1.125rem | 600 semibold | 1.4 (25px) | normal | Display | `text-lg font-display font-semibold` |
| **Body** | 14px / 0.875rem | 400 normal | 1.5 (21px) | normal | Sans | `text-sm` |
| **Body Large** | 16px / 1rem | 400 normal | 1.5 (24px) | normal | Sans | `text-base` |
| **Caption** | 12px / 0.75rem | 500 medium | 1.4 (17px) | 0.05em | Sans | `text-xs font-medium tracking-wide` |
| **Label** | 12px / 0.75rem | 600 semibold | 1.4 (17px) | normal | Sans | `text-xs font-semibold` |

### Scale Rationale

The scale uses a modular ratio of approximately 1.25 (Major Third) from the 14px body base:
- 14 → 18 → 24 → 30 → 36

This provides clear visual hierarchy without excessive jumps, suitable for data-dense dashboards.

---

## 3. Usage by Context

### Page Titles (PageShell)

```tsx
<h1 className="text-2xl font-display font-semibold tracking-tight">
  {title}
</h1>
```
This is **Heading 2** level — the standard for all authenticated page titles via PageShell.

### Page Subtitle

```tsx
<p className="text-sm text-muted-foreground sm:text-base">
  {subtitle}
</p>
```
Body on mobile, Body Large on sm+.

### Section Headings (within pages)

```tsx
<h2 className="text-lg font-display font-semibold">
  {sectionTitle}
</h2>
```
**Heading 3** — used inside CardTitle, section headers.

### KPI Values

```tsx
<p className="text-2xl font-display font-semibold leading-none">
  {value}
</p>
```
**Heading 2** size with `leading-none` to tighten value display in compact cards.

### KPI Labels

```tsx
<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
  {label}
</p>
```
**Caption** style with uppercase — reserved for metric labels and overlines.

### Sidebar Navigation

```tsx
<span className="text-sm font-medium">
  {navLabel}
</span>
```
**Body** size with medium weight.

### Dashboard Header Title

```tsx
<h1 className="font-display text-lg md:text-xl font-semibold text-foreground truncate">
  {title}
</h1>
```
Between **Heading 3** and **Heading 2** — responsive, truncated on mobile.

### Form Labels

```tsx
<label className="text-sm font-medium">
  {fieldLabel}
</label>
```
**Body** size with medium weight. Matches shadcn/ui `<Label>` component.

### Form Input Text

```tsx
<input className="text-base md:text-sm" />
```
**Body Large** on mobile (16px prevents iOS zoom), **Body** on desktop. This is the current pattern in the Input component.

### Table Headers

```tsx
<th className="text-left font-medium text-muted-foreground">
  {column}
</th>
```
**Body** size, medium weight, muted color.

### Table Cells

```tsx
<td className="text-sm">
  {value}
</td>
```
**Body** size, normal weight.

### Badge Text

```tsx
<span className="text-xs font-semibold">
  {status}
</span>
```
**Label** style.

### Tooltip / Popover Content

```tsx
<p className="text-sm">
  {content}
</p>
```
**Body** size.

### Empty State Title

```tsx
<h3 className="text-lg font-semibold text-foreground">
  {title}
</h3>
```
**Heading 3** without display font — EmptyState uses sans for a softer tone.

### Empty State Description

```tsx
<p className="text-sm text-muted-foreground">
  {description}
</p>
```
**Body** size, muted.

---

## 4. Font Weight Scale

| Weight | Value | Tailwind | Usage |
|--------|-------|----------|-------|
| Light | 300 | `font-light` | Reserved; not used in standard UI |
| Regular | 400 | `font-normal` | Body text, descriptions, table cells |
| Medium | 500 | `font-medium` | Labels, nav items, form labels, KPI labels |
| Semibold | 600 | `font-semibold` | Headings, page titles, KPI values, button text, badge text |
| Bold | 700 | `font-bold` | Display headings, sidebar brand name, hero text |
| Extrabold | 800 | `font-extrabold` | Reserved for marketing/hero; not used in dashboard UI |

### Rules

- Do NOT use `font-thin` (100) or `font-black` (900) — they are not loaded.
- Button text is always `font-semibold` (set in button component base).
- Never apply `font-bold` to body-size text; it creates visual noise at small sizes.

---

## 5. Line Height

| Context | Line Height | Tailwind |
|---------|-------------|----------|
| Display/Heading | 1.2 | `leading-tight` |
| Heading 3 | 1.4 | `leading-snug` |
| Body text | 1.5 | `leading-normal` (default) |
| KPI value | 1.0 | `leading-none` |
| Caption / Label | 1.4 | `leading-snug` |
| Paragraph (long text) | 1.6 | `leading-relaxed` |

### Kannada Script Considerations

Kannada (ಕನ್ನಡ) uses complex conjunct characters and diacritical marks that extend above and below the baseline. To prevent clipping:

- Body text at `text-sm` with `leading-normal` (1.5) provides adequate vertical room.
- Heading text at `leading-tight` (1.2) is acceptable because display sizes give proportionally more pixel space.
- In long-form Kannada content (e.g. AI assistant responses, help text), use `leading-relaxed` (1.6) to ensure readability.
- Never use `leading-none` for Kannada text — only for numeric KPI values.

---

## 6. Letter Spacing (Tracking)

| Context | Value | Tailwind |
|---------|-------|----------|
| Display / H1 / H2 headings | -0.025em | `tracking-tight` |
| H3 / Body / Label | 0 (normal) | default (no class needed) |
| Overline / KPI label | 0.05em | `tracking-wide` |
| Uppercase caption | 0.05em | `tracking-wide` |

### Rules

- Tight tracking (`tracking-tight`) is only for display-size text (24px+). At smaller sizes it reduces legibility.
- Wide tracking (`tracking-wide`) is only for uppercase text. Never apply it to mixed-case body text.

---

## 7. Responsive Typography

### Mobile Scaling

On screens below `md` (768px), some text levels scale down:

| Level | Desktop | Mobile |
|-------|---------|--------|
| Display | text-4xl (36px) | text-3xl (30px) |
| Heading 1 | text-3xl (30px) | text-2xl (24px) |
| Heading 2 (Page Title) | text-2xl (24px) | text-xl (20px) |
| Heading 3 | text-lg (18px) | text-lg (18px) — no change |
| Body | text-sm (14px) | text-sm (14px) — no change |

Apply responsive scaling only to headings. Body and caption sizes remain fixed.

```tsx
// Page title with responsive scaling
<h1 className="text-xl md:text-2xl font-display font-semibold tracking-tight">

// Display heading
<h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
```

### Input Text (iOS Zoom Prevention)

Form inputs use `text-base` on mobile and `text-sm` on desktop:
```tsx
className="text-base md:text-sm"
```
This prevents iOS Safari from zooming into inputs (which triggers at < 16px).

---

## 8. Data Table Typography

Tables present dense information and require tighter typography:

| Element | Classes |
|---------|---------|
| Table header | `text-sm font-medium text-muted-foreground` (h-12 row) |
| Table cell | `text-sm` (p-4 cell padding) |
| Table caption | `text-sm text-muted-foreground` |
| Numeric cells | `text-sm font-medium tabular-nums` |
| Status in table | `text-xs font-semibold` (via Badge) |

### Numeric Formatting

For columns with numbers (quantities, prices, IDs), add `tabular-nums` to ensure columns align:
```tsx
<td className="text-sm font-medium tabular-nums text-right">
  ₹{amount.toLocaleString()}
</td>
```

---

## 9. Anti-Patterns

- Do NOT use `text-xl` for page titles — use `text-2xl` (Heading 2) via PageShell.
- Do NOT apply `font-display` to body text, labels, or form inputs.
- Do NOT use `font-bold` on text smaller than `text-lg`.
- Do NOT use custom font sizes (e.g. `text-[15px]`). Stay on the Tailwind scale.
- Do NOT skip the type scale — if `text-sm` is too small and `text-base` is too large, the layout needs adjusting, not the font.
- Do NOT use `uppercase` without `tracking-wide` — tight uppercase is hard to read.
- Do NOT use `leading-none` for any text that may contain Kannada script.
