# Design System Strategy: The Monochrome Interface

## 1. Overview & Creative North Star: "The Quiet Machine"

This design system is built for application UIs—dashboards, editors, data views, settings panels—where the content is the experience, not the chrome around it. Our North Star is **The Quiet Machine**: an interface so restrained that only the user's data and actions have presence.

We achieve "Professional and Invisible" through **Tonal Reduction** and **Typographic Hierarchy Alone**. The system relies on a near-monochrome greyscale palette, treating color as a scarce resource spent only on semantic signals (errors, success) or a single, configurable **Theme Accent** chosen per-product. Every surface, divider, and interactive element earns its pixel through content utility—never decoration. If something can be communicated through spacing, weight, or opacity instead of color, border, or shadow, it must be.

---

## 2. Colors & Surface Philosophy

The palette lives on a continuous greyscale ramp. A single **Theme Accent** is selected per-product and used with extreme restraint.

### Greyscale Ramp

| Token               | Value     | Usage                                         |
|----------------------|-----------|-----------------------------------------------|
| `grey-0`             | `#ffffff` | Page background, elevated cards                |
| `grey-50`            | `#fafafa` | Alternate row, secondary surface               |
| `grey-100`           | `#f5f5f5` | Recessed wells, input backgrounds              |
| `grey-200`           | `#e5e5e5` | Subtle dividers (use sparingly)                |
| `grey-300`           | `#d4d4d4` | Disabled elements, ghost borders               |
| `grey-400`           | `#a3a3a3` | Placeholder text, tertiary icons               |
| `grey-500`           | `#737373` | Secondary text, inactive labels                |
| `grey-600`           | `#525252` | Body text                                      |
| `grey-700`           | `#404040` | Emphasized body, active labels                 |
| `grey-800`           | `#262626` | Headlines, primary interactive text            |
| `grey-900`           | `#171717` | Display text, maximum emphasis                 |

### Theme Accent

Choose **one** accent color per product. It must pass WCAG AA contrast against `grey-0` for text usage or against `grey-900` for filled badges. The accent is used exclusively for:

1. Active/selected states (navigation items, tab underlines)
2. Primary action text (not background—see Buttons below)
3. Inline links
4. Focus rings (at 30% opacity)

Example accents: `#2563eb` (blue), `#0d9488` (teal), `#7c3aed` (violet), `#dc2626` (red for destructive-oriented tools). When no accent is chosen, default to `grey-900` for all accent use cases—the system must work in pure greyscale.

### Surface Rules

* **The "No-Line" Rule (inherited):** Avoid 1px solid borders for sectioning. Transition between `grey-0` and `grey-50` or `grey-100` to communicate depth changes. When a boundary is structurally necessary (e.g., sidebar edge), use `grey-200` at 50% opacity—"felt, not seen."

* **Maximum Two Surfaces:** Application layouts should use at most two surface tones in any given viewport. A sidebar at `grey-50` against a main content area at `grey-0` is sufficient. Resist the urge to nest further.

* **Dark Mode Inversion:** The greyscale ramp inverts. `grey-0` becomes `#0a0a0a`, `grey-900` becomes `#fafafa`. The Theme Accent remains unchanged but may need a lightened variant (`accent-light`) for legibility on dark surfaces.

---

## 3. Typography: Hierarchy Through Weight, Not Color

A single typeface family reduces cognitive load. Weight and size alone must carry the entire hierarchy.

### Typeface

**Inter** for all text. It provides excellent readability at every scale, from 11px labels to 32px page titles.

If a product requires more editorial presence, **Geist** or **Geist Mono** (for code-heavy interfaces) are acceptable substitutes.

### Scale

| Token          | Size     | Weight   | Letter-Spacing | Line-Height | Color       | Usage                          |
|----------------|----------|----------|-----------------|-------------|-------------|--------------------------------|
| `display`      | 1.75rem  | 600      | -0.025em        | 1.2         | `grey-900`  | Page titles                    |
| `heading`      | 1.25rem  | 600      | -0.02em         | 1.3         | `grey-900`  | Section headings               |
| `subheading`   | 0.875rem | 500      | 0.01em          | 1.4         | `grey-500`  | Section labels, overlines      |
| `body`         | 0.875rem | 400      | 0               | 1.5         | `grey-600`  | Default reading text           |
| `body-emphasis`| 0.875rem | 500      | 0               | 1.5         | `grey-800`  | Inline emphasis, key values    |
| `caption`      | 0.75rem  | 400      | 0.01em          | 1.4         | `grey-500`  | Metadata, timestamps, helpers  |
| `label`        | 0.75rem  | 500      | 0.02em          | 1.0         | `grey-700`  | Form labels, column headers    |
| `mono`         | 0.8125rem| 400 (mono)| 0              | 1.5         | `grey-700`  | Code, IDs, technical values    |

### Hierarchy Rules

* Never rely on color alone to distinguish heading from body. The combination of weight 600 + `grey-900` vs. weight 400 + `grey-600` creates sufficient separation.
* Uppercase text is reserved for `subheading` overlines and status badges only. Never uppercase buttons or headings.
* Maximum three levels of typographic emphasis on any single screen: title, body, caption. If you need a fourth, reconsider the information architecture.

---

## 4. Elevation & Depth

Application UIs must feel flat and grounded. Elevation is a last resort, not a default.

* **Cards:** No shadow by default. A card is defined by its content grouping and the spacing around it—not a box. If a card must be visually distinct (e.g., a draggable kanban card), use `grey-200` as a 1px border at 40% opacity. Never use shadow as the primary differentiator.

* **Floating Layers (Dropdowns, Popovers, Modals):** These are the *only* elements that receive shadow: `0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)`. Floating layers use `grey-0` background with a `grey-200` border at 60% opacity.

* **Modals:** Overlay the viewport with `grey-900` at 40% opacity. The modal surface is `grey-0` with the floating shadow above. Keep border-radius at `0.5rem`.

* **Z-Index Discipline:** Only three z-layers: content (0), sticky headers/sidebars (10), floating layers (50). If you need more, the layout is too complex.

---

## 5. Spacing & Layout

### Spacing Scale

Use a 4px base unit. The application scale is tighter than marketing layouts—density communicates utility.

| Token  | Value  | Usage                                               |
|--------|--------|-----------------------------------------------------|
| `1`    | 4px    | Inline icon-to-text gap, tight optical adjustments   |
| `2`    | 8px    | Between related elements (label to input, icon pairs) |
| `3`    | 12px   | Intra-component padding (button padding, cell padding)|
| `4`    | 16px   | Default content padding, card internal padding        |
| `5`    | 20px   | Between components in a section                       |
| `6`    | 24px   | Section padding within panels                         |
| `8`    | 32px   | Between major sections                                |
| `12`   | 48px   | Page-level vertical rhythm between blocks             |
| `16`   | 64px   | Page top/bottom breathing room                        |

### Layout Principles

* **Content-width containers:** Application content areas should max out at `64rem` (1024px) for readability. Wider layouts (data tables, code editors) may break this but should still left-align their content.
* **Sidebar:** Fixed at `240px`–`280px`. Collapsible to icon-only at `56px`. Background: `grey-50`.
* **Grid:** Use CSS Grid or Flexbox with the spacing tokens above. Avoid arbitrary magic numbers.

---

## 6. Components

### Buttons

Buttons in this system are **textual by default**. The interface should feel like a well-set page of controls, not a toolbar of colored blocks.

* **Primary Action:** Text-only. Uses `accent` color (or `grey-900` if no accent). Font-weight `500`. No background, no border. On hover, transition to `accent` at 70% opacity (or `grey-500` if no accent). Cursor: pointer.

* **Secondary Action:** Text-only. Uses `grey-600`. Font-weight `400`. On hover, transition to `grey-900`. No background, no border.

* **Destructive Action:** Text-only. Uses `#dc2626` (red-600). On hover, transition to `#b91c1c` (red-700). No background, no border.

* **Disabled:** Uses `grey-400`. Cursor: not-allowed. No hover change.

* **Icon Buttons:** Bare icon in `grey-500`. On hover, icon transitions to `grey-900` (or `accent`). No background circle, no border. Hit area must be at least `32px × 32px` regardless of icon size.

* **When to break the rule:** A single primary CTA per page *may* use a filled style: `grey-900` background, `grey-0` text, `0.375rem` border-radius, `500` weight. Use this only for the single most important action on the screen (e.g., "Create Project", "Save Changes"). Maximum one per viewport.

### Navigation

* **Sidebar Items:** Text in `grey-500`, weight `400`. Active item: text in `grey-900` (or `accent`), weight `500`. No background highlight on active state—the text color and weight shift is the entire signal.

* **Tabs:** Text in `grey-500`, weight `400`. Active tab: text in `grey-900`, weight `500`, with a `2px` bottom border in `accent` (or `grey-900`). Inactive tabs have no underline.

* **Breadcrumbs:** Use `grey-500` text with `/` separators in `grey-300`. Current page in `grey-800`, weight `500`.

### Cards & Containers

* **Default Card:** No border, no shadow. White (`grey-0`) or `grey-50` background depending on parent surface. Content grouping is achieved through spacing `6` internal padding and spacing `5` between cards.

* **Interactive Cards:** On hover, text within the card shifts to `grey-900` (from `grey-600`). A subtle `translateY(-1px)` transition over `150ms` provides tactile feedback. No background color change.

* **Bordered Card (optional):** When explicit containment is needed (e.g., settings sections), use `grey-200` at 60% opacity, `1px` border, `0.5rem` radius. Use consistently or not at all within a given view.

### Input Fields

* **Default State:** `grey-100` background. No border. `grey-900` text, `grey-400` placeholder. Border-radius `0.375rem`. Padding: spacing `3` vertical, spacing `4` horizontal.

* **Focus State:** Background transitions to `grey-0`. A `2px` ring appears in `accent` at 30% opacity (or `grey-300` if no accent). No border—only the ring.

* **Error State:** Ring becomes `#dc2626` at 30% opacity. Helper text below in `#dc2626`, `caption` size.

* **Read-only / Disabled:** Background `grey-100`. Text `grey-400`. No ring on focus.

### Tables & Data

* **Header Row:** `grey-50` background. `label` typography (0.75rem, weight 500, `grey-700`). No bottom border.

* **Body Rows:** `grey-0` background. Alternate rows may use `grey-50` for scanability, but default to uniform `grey-0` for cleaner appearance. Row hover: entire row text shifts to `grey-900`.

* **Cell Padding:** Spacing `3` vertical, spacing `4` horizontal.

* **No Vertical Lines:** Column separation is achieved through horizontal spacing alone. Horizontal dividers between rows use `grey-200` at 40% opacity—or omit entirely if row spacing is sufficient (spacing `3` between rows).

### Status & Semantic Color

Color is reserved almost exclusively for semantic meaning:

| State      | Text Color | Badge BG (if needed)    | Badge Text |
|------------|------------|-------------------------|------------|
| Success    | `#16a34a`  | `#f0fdf4`               | `#16a34a`  |
| Warning    | `#ca8a04`  | `#fefce8`               | `#ca8a04`  |
| Error      | `#dc2626`  | `#fef2f2`               | `#dc2626`  |
| Info       | `accent`   | `accent` at 8% opacity  | `accent`   |
| Neutral    | `grey-500` | `grey-100`              | `grey-600` |

Badges use `caption` typography, `0.25rem` border-radius, spacing `1` vertical padding, spacing `2` horizontal padding.

### Tooltips & Toasts

* **Tooltips:** `grey-900` background, `grey-0` text, `caption` size. Border-radius `0.25rem`. No arrow. Appears after `400ms` delay.

* **Toasts:** `grey-0` background, floating shadow, `grey-200` border at 60% opacity. Text in `body` size. Icon on the left in the appropriate semantic color. Auto-dismiss after `4s`. Position: bottom-right.

---

## 7. Iconography

* **Style:** Outline-only (stroke width `1.5px`). Use Lucide, Phosphor, or a comparable outline set. Never mix filled and outline icons in the same view.

* **Sizing:** `16px` inline with text, `20px` for standalone icon buttons, `24px` for navigation. Maintain consistent sizing per context.

* **Color:** Icons inherit text color by default. They should never be more prominent than the text they accompany.

---

## 8. Motion & Transitions

Application UI motion is functional, not expressive. It exists to confirm actions and orient the user.

* **Duration:** `100ms` for color/opacity transitions (hovers). `150ms` for layout shifts (expanding panels, card lifts). `200ms` for entrances (modals, popovers fading in).

* **Easing:** `ease-out` for entrances, `ease-in` for exits, `ease-in-out` for layout shifts.

* **Rule:** If an animation would take longer than `200ms`, question whether it's necessary. Users of productivity tools should never feel like they're waiting for the interface.

---

## 9. Guidelines

### Do

* **Do** let content breathe. Spacing `8` (32px) between major sections minimum. Dense data views are an exception, not the rule.

* **Do** use a single accent color with discipline. If more than 10% of the visible pixels on any screen carry the accent color, reduce usage.

* **Do** default to `grey-600` for body text instead of `grey-900`. Reserve `grey-900` for headings and interactive elements so they naturally draw the eye.

* **Do** make hover states feel like a gentle "sharpening"—text becoming darker, icons becoming crisper—not a background color swap.

* **Do** use consistent border-radius: `0.375rem` for small elements (inputs, badges), `0.5rem` for medium elements (cards, modals), `9999px` only for avatar circles and pills.

### Don't

* **Don't** use background-color changes on button hover. The hover state is a text/icon color shift only.

* **Don't** use borders to create visual hierarchy. Spacing, surface tone shifts, and typographic weight are the tools for hierarchy.

* **Don't** use more than one filled/solid button per viewport. If two actions compete for attention, one must step down to text-only.

* **Don't** use pure black (`#000000`) for text. `grey-900` (`#171717`) is the darkest value in the system.

* **Don't** introduce a new color outside of the greyscale ramp and the single theme accent without design review. Semantic colors (red, green, amber) are pre-approved but still used only for status.

* **Don't** animate layout on hover (expanding widths, growing heights). Hover states must be instantaneous and reversible in under `100ms`.

---

## 10. Accessibility

* **Contrast:** All `body` text (`grey-600` on `grey-0`) must meet WCAG AA (4.5:1). `caption` and `label` text (`grey-500` on `grey-0`) is acceptable for non-essential metadata but should meet AA for any actionable element.

* **Focus Indicators:** Every interactive element must show a visible focus ring (`accent` at 30% opacity, `2px` offset). The monochrome palette makes focus rings particularly critical—they may be the only color on screen.

* **Touch Targets:** Minimum `44px × 44px` for mobile, `32px × 32px` for desktop. Icon buttons without visible boundaries must still have adequate hit areas.

* **Reduced Motion:** Respect `prefers-reduced-motion`. When active, all transitions become instant (`0ms` duration).
