# Component Tokens

> Design tokens for every core UI component in AgriNext Gen.
> All components live in `src/components/ui/` (shadcn/ui primitives) and must NOT be edited directly.
> Customization happens through CSS variables and Tailwind config, not by modifying component source.

---

## 1. Button

**File:** `src/components/ui/button.tsx`

### Base Styles (all variants)

```
inline-flex items-center justify-center
gap-2
whitespace-nowrap
rounded-lg (--radius-lg, 16px)
text-sm font-semibold
ring-offset-background
transition-all duration-300
focus-visible: ring-2 ring-ring ring-offset-2
disabled: pointer-events-none opacity-50
[&_svg]: size-4 shrink-0 pointer-events-none
```

### Variants

| Variant | Background | Text | Border | Hover | Shadow |
|---------|-----------|------|--------|-------|--------|
| **default** | `bg-primary` | `text-primary-foreground` | — | `bg-primary/90` | `shadow-soft → shadow-medium` |
| **destructive** | `bg-destructive` | `text-destructive-foreground` | — | `bg-destructive/90` | — |
| **outline** | transparent | `text-primary` | `border-2 border-primary` | `bg-primary text-primary-foreground` | — |
| **secondary** | `bg-secondary` | `text-secondary-foreground` | — | `bg-secondary/80` | — |
| **ghost** | transparent | (inherits) | — | `bg-accent/20 text-accent-foreground` | — |
| **link** | transparent | `text-primary` | — | underline | — |
| **hero** | `bg-gradient-hero` | `text-primary-foreground` | — | `scale-[1.02]` | `shadow-glow → shadow-medium` |
| **accent** | `bg-gradient-accent` | `text-accent-foreground` | — | `scale-[1.02]` | `shadow-accent → shadow-medium` |
| **glass** | `bg-background/80 backdrop-blur-sm` | `text-foreground` | `border-border/50` | `bg-background/90` | `shadow-soft` |

### Sizes

| Size | Height | Padding | Radius | Font | Icon |
|------|--------|---------|--------|------|------|
| **sm** | `h-9` (36px) | `px-4` | `rounded-md` | text-sm | 16px |
| **default** | `h-11` (44px) | `px-5 py-2` | `rounded-lg` | text-sm | 16px |
| **lg** | `h-12` (48px) | `px-8` | `rounded-lg` | text-base | 16px |
| **xl** | `h-14` (56px) | `px-10` | `rounded-xl` | text-lg | 16px |
| **icon** | `h-10 w-10` (40px) | — | (inherits) | — | 20px |

### States

| State | Effect |
|-------|--------|
| **Hover** | Background opacity change, shadow elevation increase, or scale transform (per variant) |
| **Active (pressed)** | hero/accent: `active:scale-[0.98]` |
| **Focus** | `ring-2 ring-ring ring-offset-2` (2px primary-colored ring) |
| **Disabled** | `opacity-50 pointer-events-none` |
| **Loading** | Replace icon with `<Loader2 className="animate-spin" />`, add `disabled` |

### Usage Rules

- `default` for primary actions (submit, save, confirm).
- `secondary` for secondary actions (cancel, back).
- `outline` for tertiary actions that need prominence without fill.
- `ghost` for toolbar actions, icon buttons, contextual actions.
- `destructive` for delete, remove, dangerous actions.
- `link` for inline text links styled as buttons.
- `hero` for marketing CTAs only — never in dashboards.
- `accent` for featured/premium CTAs — rare usage.
- `glass` for overlay contexts (e.g. on top of images or gradients).

---

## 2. Card

**File:** `src/components/ui/card.tsx`

### Base Styles

```
rounded-lg          (--radius-lg, 16px)
border              (border-border)
bg-card             (white / dark surface)
text-card-foreground
shadow-sm           (subtle default shadow)
```

### Sub-Components

| Part | Padding | Additional Styles |
|------|---------|-------------------|
| **CardHeader** | `p-4` | `flex flex-col space-y-1.5` |
| **CardTitle** | — | `text-2xl font-semibold leading-none tracking-tight` |
| **CardDescription** | — | `text-sm text-muted-foreground` |
| **CardContent** | `p-4 pt-0` | — |
| **CardFooter** | `p-4 pt-0` | `flex items-center` |

### Interactive Card Pattern

For clickable cards (e.g. KpiCard with onClick):

```
cursor-pointer
transition-all duration-standard
hover:-translate-y-[2px]
hover:shadow-elev-2
```

### States

| State | Effect |
|-------|--------|
| **Rest** | `shadow-sm` |
| **Hover (non-interactive)** | `hover:shadow-elev-1` |
| **Hover (interactive)** | `hover:-translate-y-[2px] hover:shadow-elev-2 cursor-pointer` |
| **Selected** | Apply border: `border-primary` |
| **Disabled** | `opacity-60 pointer-events-none` |

---

## 3. Table

**File:** `src/components/ui/table.tsx`

### Structure

The Table component wraps `<table>` in `overflow-auto` for horizontal scrolling:

```
Container: relative w-full overflow-auto
Table: w-full caption-bottom text-sm
```

### Token Values

| Part | Styles |
|------|--------|
| **TableHeader** | `[&_tr]:border-b` |
| **TableHead** | `h-12 px-4 text-left align-middle font-medium text-muted-foreground` |
| **TableBody** | `[&_tr:last-child]:border-0` |
| **TableRow** | `border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted` |
| **TableCell** | `p-4 align-middle` |
| **TableFooter** | `border-t bg-muted/50 font-medium` |
| **TableCaption** | `mt-4 text-sm text-muted-foreground` |

### States

| State | Effect |
|-------|--------|
| **Row hover** | `bg-muted/50` |
| **Row selected** | `bg-muted` (via `data-[state=selected]`) |
| **Checkbox column** | `pr-0` (reduced padding when row has checkbox) |

### Rules

- Header text is always `font-medium text-muted-foreground`.
- Cell text is `text-sm` (body size).
- Numeric cells should add `tabular-nums text-right font-medium`.
- On mobile, wrap Table in horizontal scroll or switch to card layout (see MOBILE_UX_BASELINE.md).

---

## 4. Input / Textarea / Select

### Input

**File:** `src/components/ui/input.tsx`

| Token | Value |
|-------|-------|
| Height | `h-10` (40px) |
| Width | `w-full` |
| Border | `border border-input` (1px, border color) |
| Radius | `rounded-md` (--radius-md, 13px) |
| Padding | `px-3 py-2` |
| Font | `text-base md:text-sm` (16px mobile, 14px desktop) |
| Background | `bg-background` |
| Placeholder | `text-muted-foreground` |
| Focus | `ring-2 ring-ring ring-offset-2` |
| Disabled | `cursor-not-allowed opacity-50` |
| File input | `file:border-0 file:bg-transparent file:text-sm file:font-medium` |

### Textarea

**File:** `src/components/ui/textarea.tsx`

Same as Input except:
| Token | Value |
|-------|-------|
| Min height | `min-h-[80px]` |
| Height | Auto (no fixed height) |
| Resize | Default (user-resizable) |

### Select Trigger

**File:** `src/components/ui/select.tsx`

Same base as Input:
| Token | Value |
|-------|-------|
| Height | `h-10` (40px) |
| Layout | `flex items-center justify-between` |
| Chevron | `ChevronDown h-4 w-4 opacity-50` |
| Focus | `ring-2 ring-ring ring-offset-2` |

### Select Content (Dropdown)

| Token | Value |
|-------|-------|
| Border | `border` |
| Radius | `rounded-md` |
| Background | `bg-popover text-popover-foreground` |
| Shadow | `shadow-md` |
| Max height | `max-h-96` (384px) |
| Animation | fade-in/zoom-in on open, fade-out/zoom-out on close |
| Item padding | `py-1.5 pl-8 pr-2` |
| Item hover | `bg-accent text-accent-foreground` |
| Item indicator | `Check h-4 w-4` at left-2 |

### States (All Input Types)

| State | Effect |
|-------|--------|
| **Rest** | `border-input bg-background` |
| **Focus** | `ring-2 ring-ring ring-offset-2 outline-none` |
| **Disabled** | `cursor-not-allowed opacity-50` |
| **Error** | Add `border-destructive` via className override |
| **Placeholder** | `text-muted-foreground` |

---

## 5. Badge

**File:** `src/components/ui/badge.tsx`

### Base Styles

```
inline-flex items-center
rounded-full        (pill shape)
border
px-2.5 py-0.5
text-xs font-semibold
transition-colors
focus: ring-2 ring-ring ring-offset-2
```

### Variants

| Variant | Background | Text | Border | Hover |
|---------|-----------|------|--------|-------|
| **default** | `bg-primary` | `text-primary-foreground` | transparent | `bg-primary/80` |
| **secondary** | `bg-secondary` | `text-secondary-foreground` | transparent | `bg-secondary/80` |
| **destructive** | `bg-destructive` | `text-destructive-foreground` | transparent | `bg-destructive/80` |
| **outline** | transparent | `text-foreground` | `border` (default) | — |

### Extended Status Badges (via className)

For status-specific colors not covered by the 4 variants, apply via className:

```tsx
<Badge className="bg-green-100 text-green-800 border-transparent">
  Completed
</Badge>
```

Standardized status badge colors are defined in `src/lib/statusConfig.ts` (see COMPONENT_STANDARDIZATION.md).

### Rules

- Use `default` for primary status (active, confirmed).
- Use `secondary` for neutral/informational status.
- Use `destructive` for error/cancelled status.
- Use `outline` for tags, categories, metadata.
- Always use `text-xs font-semibold` (built into the component).

---

## 6. Dialog

**File:** `src/components/ui/dialog.tsx`

### Overlay

```
fixed inset-0 z-50
bg-black/80
animate: fade-in/fade-out
```

### Content

| Token | Value |
|-------|-------|
| Position | `fixed left-[50%] top-[50%] translate-[-50%]` (centered) |
| Z-index | `z-50` |
| Width | `w-full max-w-lg` (512px max) |
| Padding | `p-6` (24px) |
| Gap | `gap-4` (16px between sections) |
| Border | `border` |
| Background | `bg-background` |
| Shadow | `shadow-lg` |
| Radius | `sm:rounded-lg` (square on mobile xs, rounded on sm+) |
| Animation | zoom-in-95 + slide-in on open, zoom-out-95 + slide-out on close |

### Close Button

```
absolute right-4 top-4
rounded-sm
opacity-70 hover:opacity-100
X icon: h-4 w-4
sr-only "Close" label
```

### Sub-Components

| Part | Styles |
|------|--------|
| **DialogHeader** | `flex flex-col space-y-1.5 text-center sm:text-left` |
| **DialogTitle** | `text-lg font-semibold leading-none tracking-tight` |
| **DialogDescription** | `text-sm text-muted-foreground` |
| **DialogFooter** | `flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2` |

### ConfirmDialog Pattern

**File:** `src/components/ui/confirm-dialog.tsx`

Built on AlertDialog with standardized props:

| Prop | Type | Default |
|------|------|---------|
| variant | 'default' \| 'destructive' | 'default' |
| loading | boolean | false |
| confirmText | string | 'Confirm' |
| cancelText | string | 'Cancel' |

Destructive variant applies `bg-destructive text-destructive-foreground` to the confirm action button.

---

## 7. Tabs

**File:** `src/components/ui/tabs.tsx`

### TabsList (Container)

```
inline-flex
h-10 (40px)
items-center justify-center
rounded-md
bg-muted
p-1
text-muted-foreground
```

### TabsTrigger

| State | Styles |
|-------|--------|
| **Rest** | `px-3 py-1.5 text-sm font-medium rounded-sm` |
| **Active** | `bg-background text-foreground shadow-sm` |
| **Focus** | `ring-2 ring-ring ring-offset-2` |
| **Disabled** | `pointer-events-none opacity-50` |

### TabsContent

```
mt-2 (8px top margin)
ring-offset-background
focus-visible: ring-2 ring-ring ring-offset-2
```

### Rules

- Use Tabs for switching between views within the same page section (e.g. filter categories, data views).
- Tab labels should be short (1-2 words).
- Do not nest Tabs inside Tabs.
- Tab content should not cause page-level layout shifts.

---

## 8. Dropdown Menu

**File:** `src/components/ui/dropdown-menu.tsx`

### Content

| Token | Value |
|-------|-------|
| Z-index | `z-50` |
| Min width | `min-w-[8rem]` (128px) |
| Border | `border` |
| Radius | `rounded-md` |
| Background | `bg-popover text-popover-foreground` |
| Shadow | `shadow-md` |
| Padding | `p-1` |
| Animation | fade-in/zoom-in on open |

### Items

| Part | Styles |
|------|--------|
| **MenuItem** | `px-2 py-1.5 text-sm rounded-sm cursor-default outline-none focus:bg-accent focus:text-accent-foreground` |
| **MenuLabel** | `px-2 py-1.5 text-sm font-semibold` |
| **MenuSeparator** | `-mx-1 my-1 h-px bg-muted` |
| **Disabled** | `pointer-events-none opacity-50` |

### States

| State | Effect |
|-------|--------|
| **Item hover/focus** | `bg-accent text-accent-foreground` |
| **Item disabled** | `opacity-50 pointer-events-none` |
| **Destructive item** | `text-destructive focus:text-destructive` |

---

## 9. Alert

**File:** `src/components/ui/alert.tsx`

### Base Styles

```
relative w-full
rounded-lg
border
p-4
[&>svg~*]:pl-7
[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4
```

### Variants

| Variant | Styles |
|---------|--------|
| **default** | `bg-background text-foreground [&>svg]:text-foreground` |
| **destructive** | `border-destructive/50 text-destructive [&>svg]:text-destructive` (dark: `border-destructive`) |

### Sub-Components

| Part | Styles |
|------|--------|
| **AlertTitle** | `mb-1 font-medium leading-none tracking-tight` |
| **AlertDescription** | `text-sm [&_p]:leading-relaxed` |

### Missing Variants

The current Alert has only `default` and `destructive`. For success, warning, and info alerts, apply via className:

```tsx
<Alert className="border-success/50 text-success [&>svg]:text-success">
  <CheckCircle className="h-4 w-4" />
  <AlertTitle>Success</AlertTitle>
  <AlertDescription>Operation completed.</AlertDescription>
</Alert>
```

---

## 10. Motion Tokens

All interactive components use the shared motion system:

| Token | CSS Variable | Value | Tailwind |
|-------|-------------|-------|----------|
| Quick | `--motion-duration-quick` | 160ms | `duration-quick` |
| Standard | `--motion-duration-standard` | 280ms | `duration-standard` |
| Ease | `--motion-ease-standard` | cubic-bezier(0.2, 0.6, 0.2, 1) | `ease-standard` |

### Usage

| Context | Duration | Easing |
|---------|----------|--------|
| Button hover/active | 300ms (CSS transition) | default ease |
| Card hover lift | `duration-standard` (280ms) | `ease-standard` |
| Accordion open/close | `duration-quick` (160ms) | ease-out |
| Dialog enter/exit | 200ms | built-in Radix animation |
| Dropdown enter/exit | built-in | built-in Radix animation |
| Fade in | `duration-standard` | `ease-standard` |
| Slide up | `duration-standard` | `ease-standard` |

### Custom Keyframes

```
accordion-down: height 0 → auto
accordion-up: height auto → 0
fade-in: opacity 0 → 1
slide-up: opacity 0, translateY(8px) → opacity 1, translateY(0)
```

### Rules

- All transitions should be perceptible but not slow. Standard (280ms) for most; Quick (160ms) for small UI toggles.
- Do NOT use transitions longer than 400ms.
- Do NOT add transitions to color changes in text (causes flickering).
- Respect `prefers-reduced-motion`: Tailwind's `motion-reduce:` prefix should disable transforms and animations for users who prefer reduced motion.

---

## 11. Focus Ring

All interactive elements share a consistent focus ring:

| Token | Value |
|-------|-------|
| Color | `hsl(var(--ring))` = primary green |
| Width | 2px |
| Offset | 2px |
| Tailwind | `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` |

Global override in `index.css`:
```css
*:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}
```

### Rules

- All buttons, inputs, selects, tabs, and interactive elements must show a focus ring on keyboard navigation (`focus-visible`).
- Focus rings use `focus-visible`, not `focus`, so they don't appear on mouse click.
- Do NOT remove or customize the focus ring color per component.
