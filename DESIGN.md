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
- Do not derive a domain rule from a UI constraint. The calendar showing a given set of
  days is a display choice; the data model and generation logic are unaffected by it.
  Never let a layout decision become a business rule.

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
| Serif headlines | Wordmark, greeting, page titles and key figures only |
| Dotted globe motif | `DarpeMotif`, as a faint watermark — see below |
| Flags per language | Replaced by colored dots + language name |
| Warm, human copy | Kept: plain, friendly English, never corporate |

### Charts

Charts are hand-built from divs or inline SVG — there is no charting library
and adding one needs a real justification. Rules, met by both current charts:

- **Every chart states its content in text.** A `<figcaption>` (visually hidden
  where appropriate) carries the same figures, so nothing is available only by
  hovering.
- **Every data point is a real focusable `<button>`** with an `aria-label`
  naming its period and values; the tooltip opens on `focus` as well as hover
  and only repeats what the label already says.
- **A line chart tracks the pointer across the whole plot** rather than giving
  each point its own hit area: a guide line and the tooltip follow the cursor
  and snap to the nearest point, so there is no dead space between points and
  nothing to aim at. The month labels below double as the keyboard path,
  activating the identical guide and tooltip.
- Series use semantic tones — completed teal, scheduled violet, cancelled plum
  — and each series is named in the legend with its total.
- An empty period renders an explanatory sentence, never an empty axis.
- **Entrance animation is allowed, once and briefly.** Bars grow up
  (`.darpe-bar-grow`, 500 ms, staggered 60 ms left to right); the revenue line
  draws in and its area fades (`.darpe-line-draw` / `.darpe-area-fade`). A
  dashboard is read many times a day, so anything longer becomes a delay.
- Every animation class is switched off wholesale by the
  `prefers-reduced-motion` block in `globals.css` — elements start at their
  final state rather than animating.
- **No chart may show invented data without saying so.** The finance chart is
  the one place sample figures exist, and it carries a "Sample data" badge
  whenever they are on.

### The motif

`src/components/shared/darpe-motif.tsx` is an original decorative mark — a
meridian arc joining two points, for one language carried between two places.
It is **not a logo**: DARPE's official mark has not been supplied, and the
product uses a set textual wordmark until it is.

It is used in exactly one place: centred inside a default `EmptyState`, at
`size-12` and 40% primary. It was previously also floated behind the dashboard
greeting and the sidebar wordmark at ~7% opacity, and in both places it read as
an accidental drawing rather than as texture — **do not reintroduce it as a
watermark behind headings or controls.** If it ever needs a second home, it
must be one coherent composition inside a bounded area, never fragments behind
interactive elements.

Always `aria-hidden` and `pointer-events-none`, drawn in `currentColor`.

---

## 3. Color

The palette comes from DARPE's brand presentation. Violet is the only chromatic
color in the interface; everything else is warm neutral. Language colors are the
single exception, and only as small indicators.

```
Brand (from the presentation)
  deep violet      #482D79    reference only — too institutional as the accent
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
  primary          #7C3AED    white on it 5.7:1; as text on background 5.3:1
  secondary/accent #ECDFF2    with #5B21B6 text
  muted-foreground #655D6E    5.9:1 on background — the darkest "muted" allowed
  ring             #7C3AED    focus ring, same as the accent
```

The working accent is **`#7C3AED`**, not the presentation's deep `#482D79`.
Deep violet is accessible but reads as institutional — the product looked like
office software. The brand's brighter violet still passes comfortably: white on
it is 5.7:1, and as text on the warm background 5.3:1. `#5B21B6` carries text on
pale-lavender tints, where a lighter violet would not hold.

Never set text in mauve, medium lavender or lavender gray — they fail WCAG AA
on these surfaces.

### Semantic accent tones

Eight families, each **four steps** — surface / solid / foreground / line —
defined in `globals.css` and chosen through `src/lib/tone.ts`.

`solid` is the saturated step and exists because an earlier two-step palette
looked washed out: dots, rails, chart bars and icon holders were being drawn in
the same dark `fg` as the text beside them, so nothing stood out. **Markers use
`solid`; text uses `fg`.** Never set text in `solid`.

| Tone | Surface | Solid (markers) | Foreground (text) | Used for |
| --- | --- | --- | --- | --- |
| violet | `#F0E8FF` | `#7C3AED` | `#4C1D95` | English, scheduled series, identity |
| blue | `#E6EFFF` | `#2563EB` | `#1E40AF` | French, student counts |
| teal | `#DDF4EC` | `#0D9488` | `#0F5F4E` | Spanish, completed classes, revenue |
| amber | `#FDEECF` | `#D97706` | `#8A4D08` | Italian, teachers, outstanding, sample badge |
| rose | `#FDE6EE` | `#E11D63` | `#9C1F4C` | Japanese |
| cyan | `#DDF0F9` | `#0891B2` | `#0D5871` | German |
| moss | `#E7F2D9` | `#5B8C1F` | `#3F6212` | Swedish |
| plum | `#F2E9F2` | `#8B5E86` | `#64405F` | Unrecognised language; cancelled series |

Every `fg` on its own surface stays at or above 5.8:1.

Rules: body text stays `foreground`, primary actions stay violet, and a tone
never fills a whole card or column — it appears as a top rule, a left rail, a
chip, a dot, or an icon holder. **Colour is always the second signal.** Every
place a tone is used also states the meaning in text or an icon: a cancelled
class is dashed and struck through, a completed one carries a tick, a language
chip names its language beside the dot.

### Language colours

DARPE teaches **seven** languages, and each has its own tone — no two share a
colour, and plum is deliberately left free to mean "not one of ours":

English violet · Spanish teal · French blue · Italian amber · German cyan ·
Japanese rose · **Swedish moss**

`languageTone()` resolves deterministically — by stored code first (so renaming
a language keeps its colour), then by name in English or Spanish (`Sueco`,
`Svenska`), then plum. No migration and no stored colour: the mapping is
presentation, and `src/lib/tone.test.ts` pins it, including that the seven stay
distinct.

The calendar's legend is derived from the sessions in the week on screen
(`visibleLanguageLegend`), so it explains the colours actually present and
never advertises a language the week does not contain.

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

Two roles, two faces, both self-hosted through `next/font`:

```
Instrument Sans   --font-sans / font-sans      everything operational
Newsreader        --font-serif / font-serif    the editorial voice
```

`font-serif` (Newsreader) appears in exactly four places: the DARPE wordmark,
the dashboard greeting, page `<h1>`s, and the few figures a page is really
about (the dashboard's overview numbers). Everywhere else — navigation, card
and dialog titles (`font-heading`), tables, forms, badges, metadata — is
Instrument Sans. Using the display face more widely is what would make it stop
meaning anything.

Hierarchy comes from size, weight, spacing and rules, not from wrapping every
section in another card or attaching an icon to every label.

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
- Content is bounded and centred by `PageContainer` (`src/components/shared/page.tsx`):
  **1440 px** for ordinary pages, **1680 px** for the calendar, whose week grid
  genuinely needs the room. Nothing is full-bleed — on an ultrawide monitor a
  search field or a table row must not stretch the width of the desk.
- `PageHeader` renders the page title, its description and its actions; `Section`
  gives a titled band with a top rule, for pages that would otherwise be a stack
  of identical cards.
- Vertical rhythm between sections: `space-y-8`.
- Gap between cards in a grid: `gap-5`.
- Card padding: `p-6`.
- Border radius: `rounded-2xl` for cards, `rounded-md` for inputs and buttons.

Shadows: cards are defined by a 1 px border, not elevation. `shadow-xs` is
allowed on the calendar grid and as a hover response on interactive cards;
anything heavier is reserved for overlays (dropdowns, dialogs, toasts). No
gradients, no glassmorphism.

### Interactive states

One vocabulary for everything clickable, in `src/lib/interaction.ts`:

- `INTERACTIVE_ROW` — list rows: pointer cursor, `bg-accent/40` on hover, the
  same tint plus an inset focus ring on `focus-visible`.
- `INTERACTIVE_CARD` — a card that is itself a link: border tint plus
  `shadow-sm`, never a transform, so hovering never nudges its neighbours.
- `INTERACTIVE_TABLE_ROW` — the same tint applied to a `<tr>`.

All three use `focus-visible` (a mouse click leaves no ring) and end in
`motion-reduce:transition-none`. Rows are `min-h-11` so touch targets stay at
44 px. Never introduce a fourth hover style locally.

---

## 6. Mobile-first

Every screen is built mobile-first. Base Tailwind classes target small screens;
`md:` and `lg:` add desktop behaviour. Never build desktop first and retrofit.

Breakpoint behaviour:

| Element | Mobile (`< lg`) | Desktop (`≥ lg`) |
| --- | --- | --- |
| Navigation | Fixed bottom bar, 4 items (Home, Calendar, Students, Teachers) | Left sidebar, 240 px, grouped, **fixed** |

The app shell is `fixed inset-0`, so it is pinned to the viewport and `main` is
the only scrolling surface. The sidebar therefore never scrolls away.

**Do not replace this with `h-full` or `h-dvh`.** Both depend on an unbroken
chain of definite heights from `html` down; anything that interrupts the chain
silently turns the shell back into a content-height box, the document grows, and
a second scrollbar appears beside the one inside `main`. Taking the shell out of
flow removes the dependency entirely.
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
- **Empty states** — always `EmptyState` (`src/components/shared/empty-state.tsx`),
  never an empty table. Two tones, and the difference matters: `default` (dashed
  border, motif, centred) is for a list that is empty because nothing has been
  created yet and the user should act; `compact` is a single quiet line, for
  places where emptiness is ordinary and unremarkable — a day with no classes,
  nothing awaiting completion. Wrapping the ordinary case in a large dashed box
  makes a calm day look like a problem.
- **Forms** — anything longer than about four fields is split with
  `FormSection` inside a `FormCard`, ending in a tinted `FormActions` bar so the
  submit button is in the same place on every form. Group headings sit **above**
  their fields, never in a side column: the label column was always far shorter
  than the fields beside it, leaving the card empty down its left edge. Pair
  related fields in `sm:grid-cols-2` and give selects `w-full`, so no field
  trails off into empty space.
- **Record lists** — students and teachers are **card grids**, not tables
  (`sm:grid-cols-2 xl:grid-cols-3`). A table forced a person's name, language,
  level, teacher and status into columns that had to be read across and then
  hidden one by one at each breakpoint; a card groups them around the person
  and works unchanged from a phone to an ultrawide monitor. Each card: avatar,
  serif name, one secondary line, status badge, language chip, and a footer
  fact above a rule. The whole card is the link.
- **Filter bars** — search and status controls sit on `bg-card` with
  `shadow-xs`, and search carries a leading magnifier icon. On the page
  background with a bare border they read as drawn rectangles rather than
  fields.
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
