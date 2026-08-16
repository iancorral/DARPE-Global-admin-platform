# DARPE Admin — Design System

The **current visual reference** for the DARPE Global admin platform. It records the
styling decisions the product is built on today, so that screens stay consistent with each
other — follow it over personal preference when building UI.

It is not a permanent source of truth. This design has not yet been used daily by the
people it is for. It is expected to evolve as Dhanna, Silvia and Gabriela use the real
product and give feedback, and their feedback outranks this document. When real usage
contradicts something here, update this file rather than working around it.

Treat changes to this document as design decisions worth confirming with Ian, not as
free-form edits.

### This document does not govern the domain

Business logic and domain architecture must remain independent of the visual design.

Nothing in this file — palette, component conventions, layout, breakpoints — may dictate how
the domain is modelled. Specifically:

- Domain models, server actions, queries, Zod schemas and pure business logic must not
  import from or depend on design decisions.
- Business rules live in `src/features/*/` domain logic and are validated on the server.
  They stay correct regardless of how a screen renders.
- A visual redesign, or replacing the UI layer entirely, must be possible without editing
  business rules.
- Do not derive a domain rule from a UI constraint. If the calendar shows Monday through
  Saturday, that is a display choice; the data model and generation logic still support
  Sunday. Never let a layout decision become a business rule.

---

## 1. Design intent

The product is an internal administrative tool used daily by three people. It is not a
marketing site. Priorities, in order:

1. **Clarity** — the user should never wonder what a screen is for.
2. **Calm** — generous whitespace, low visual noise, no decoration without purpose.
3. **Brand presence** — DARPE's identity shows through restraint, not saturation.

Reference products: Linear, Stripe Dashboard, Notion, Vercel. Premium SaaS aesthetics:
neutral surfaces, one accent color, strong typographic hierarchy, subtle borders.

**Explicitly avoid:** gradients as backgrounds, heavy shadows, decorative icons,
emojis, multiple accent colors competing for attention, dense data walls.

---

## 2. Brand translation

DARPE's public identity (Instagram, brand book) is warm, lavender-forward, editorial,
with serif headlines and a dotted-globe motif. That identity belongs to marketing.

The admin tool **evolves** it rather than copying it:

| Brand element | How it appears in the product |
| --- | --- |
| Violet / lavender palette | Single accent color; lavender only as tint |
| Serif headlines | Page titles and the DARPE logotype only |
| Dotted globe motif | Not used in the UI |
| Flags per language | Replaced by colored dots + language name |
| Warm, human copy | Kept: plain, friendly English, never corporate |

---

## 3. Color

The palette comes from DARPE's brand presentation. Violet is the only chromatic
color in the interface; everything else is warm neutral. Language colors are the
single exception, and only as small indicators.

```
Brand (from the presentation)
  deep violet      #482D79    text on light, primary buttons, active nav
  mauve            #9968AE    decorative/large use only — 4.2:1, fails AA for text
  medium lavender  #B482CA    decorative only
  pale lavender    #ECDFF2    selected/hover tints, secondary badges
  lavender gray    #B4A8BA    never text; at most border mixing
  warm near-white  #FAF7FC    app page background

Applied tokens (globals.css :root)
  background       #FAF7FC    warm page ground, never cold gray
  foreground       #2A2137    violet-tinted near-black (14.4:1 on background)
  card             #FFFFFF
  border / input   #E5DBEC    lavender-tinted 1px borders
  primary          #482D79    10.9:1 on white; foreground #FAF7FC (10.3:1)
  secondary/accent #ECDFF2    with #482D79 text (8.5:1)
  muted-foreground #655D6E    5.9:1 on background — the darkest "muted" allowed
  ring             #7C3AED    focus only — brighter for visibility (>5:1, needs 3:1)
```

Deep violet carries meaning; the brighter `#7C3AED` survives only as the focus
ring. Never set text in mauve, medium lavender or lavender gray — they fail
WCAG AA on these surfaces.

Status colors are used **only** for badges and never as UI chrome:

```
success  emerald   active, completed, paid
warning  amber     pending, trial
danger   rose      overdue, cancelled
neutral  slate     paused, archived
```

Language indicators (6 px dot + label):

```
English  #7C3AED    Spanish  #059669    French    #2563EB
Italian  #D97706    German   #0284C7    Japanese  #DB2777
```

---

## 4. Typography

```
UI          Geist via next/font, registered as --font-sans
Page titles font-serif — "Iowan Old Style", Palatino, Georgia stack
```

`font-serif` is for page `<h1>`s, the DARPE wordmark and the dashboard greeting
only — never body text, section titles, labels or controls. It is a system
stack on purpose: DARPE's official display face has not been confirmed, so no
webfont is licensed or shipped until it is. Swapping it later is one token in
`globals.css`.

Scale:

| Use | Size | Weight |
| --- | --- | --- |
| Page title (`h1`) | 24 px / `text-2xl` | 600, serif |
| Section title | 14 px / `text-sm` | 600 |
| Body | 14 px / `text-sm` | 400 |
| Metadata, labels | 12 px / `text-xs` | 400–500, secondary color |
| Table headers | 10 px, uppercase, `tracking-wide` | 600, muted |

Numbers in stat cards: 24–30 px, weight 600, `tracking-tight`.

---

## 5. Spacing and layout

- Page padding: `p-4` on mobile, `p-8` on desktop.
- Content max width: **1280 px**, centered. Full-bleed layouts are not used.
- Vertical rhythm between sections: `space-y-8`.
- Gap between cards in a grid: `gap-5`.
- Card padding: `p-6`.
- Border radius: `rounded-2xl` for cards, `rounded-md` for inputs and buttons.

Shadows: **none by default**. Cards are defined by a 1 px border, not elevation.
Shadow is reserved for overlays (dropdowns, dialogs, toasts).

---

## 6. Mobile-first

Every screen is built mobile-first. Base Tailwind classes target small screens;
`md:` and `lg:` add desktop behaviour. Never build desktop first and retrofit.

Breakpoint behaviour:

| Element | Mobile (`< lg`) | Desktop (`≥ lg`) |
| --- | --- | --- |
| Navigation | Fixed bottom bar, 4 items (Home, Calendar, Students, Teachers) | Left sidebar, 240 px, grouped |
| Tables | Essential columns only | All columns |
| Forms | Single column | Two columns where natural |
| Main content | `pb-20` to clear bottom nav | `pb-0` |

Secondary table columns hide with `hidden md:table-cell` / `hidden lg:table-cell`,
in order of decreasing importance.

Sidebar information architecture is grouped — `Overview` (Dashboard) and
`Operations` (Calendar, Students, Teachers). Future groups `Money` (Finance,
Teacher payouts) and `Settings` are added only when a real route exists:
navigation never links to a page that is not there. The active item is marked
with a thin deep-violet left rule and a faint lavender tint, not a filled pill.
The mobile bar may later gain a fifth `More` tab, only once it has at least one
real destination.

---

## 7. Components

Built on **shadcn/ui** (Base UI variant). Component code lives in `src/components/ui`
and is owned by this project — modify it directly rather than fighting it with overrides.

Version note: this project uses the Base UI generation of shadcn. `asChild` does not
exist; use `render={<Component />}`. `Select` requires an `items` prop mapping values
to labels. Verify against the generated files before assuming an API.

Conventions:

- **Buttons** — one primary action per screen; everything else `variant="outline"`
  or `ghost`. Destructive actions use `ghost` with a trash icon, never a red button.
- **Badges** — status only. Never for counts or decoration.
- **Cards** — group related content. Header holds a `text-sm` title plus optional
  `text-xs` subtitle.
- **Empty states** — dashed border, centered muted text, one sentence explaining
  what to do next. Never an empty table.
- **Toasts** (sonner) — confirm every mutation. Success is a short sentence in
  sentence case; errors say what happened, not "Error 500".
- **Icons** — lucide-react, `size-4` inline, `strokeWidth` 1.8 default / 2.2 active.
- **List filtering** — students and teachers filter client-side: an accent-insensitive
  search box (`src/lib/search.ts`) plus a status select that defaults to the working set
  (non-archived students, active teachers). The rows are already loaded and carry no
  contact data beyond what the table shows, and search text stays out of the URL, where
  a person's name does not belong. Archived students and inactive teachers are reached
  by switching the status filter, not on separate pages.
- **Edit forms** — creating and editing a record share one form component; edit mode
  changes only the action called, the initial values and the destination afterwards.
  Destructive-adjacent state (deactivating a teacher, archiving a student) is part of
  the ordinary edit form, with a sentence under the field explaining the consequence.

---

## 8. Content and copy

- UI language: **English** (Phase 1). Code, database, and comments are always English.
- Sentence case everywhere. Not Title Case, not ALL CAPS (except table headers).
- Labels are nouns (`Primary teacher`), buttons are verbs (`Create student`).
- Optional fields are marked `(optional)` in muted text; required fields are unmarked.
- No emojis anywhere in the product.
- Dates and times always render in the **academy's operational timezone**,
  `America/Chihuahua` — never in the browser's detected timezone. Staff schedule classes
  in academy time, so a coordinator travelling or working from another region must still
  see the same times as everyone else. Use `DEFAULT_TIMEZONE` and the helpers in
  `src/lib/datetime.ts`; never format a business date without an explicit timezone, and
  never rely on the server's or the browser's local time.

---

## 9. Interaction

- Every destructive action asks for confirmation.
- Every async action shows a pending state (`Saving...`) and disables its trigger.
- Client-side validation is UX; server-side validation is the real check. Both use
  the same Zod schema.
- Error messages are specific and actionable, never technical.
- Transitions: 150 ms on interactive states. No entrance animations on page content.

---

## 10. Accessibility

- Every input has a visible `<label>`; placeholders are not labels.
- Focus rings are visible and use the accent color — never removed.
- Icon-only buttons need an accessible name.
- Text contrast meets WCAG AA (4.5:1); muted text is for secondary information only,
  never for anything the user must read to complete a task.
- Color never carries meaning alone — status badges pair color with text.
