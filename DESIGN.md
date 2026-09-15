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
| Dotted globe motif | DARPE's own globe icon, as favicon and app icon |
| Mascots | Alien and cat, peeking from the dashboard greeting and the login's brand panel |
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
- **No chart may show invented data.** Every figure is a real record. A period
  with nothing in it renders a sentence saying so — a line of zeroes is not a
  chart, it is a rendering fault that happens to be accurate.

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

### A globe was tried, and removed

A generated dotted globe once sat in a bespoke greeting band on the dashboard.
It was defensible on paper — DARPE has no campus, teaches across time zones, and
its own materials carry a dotted world map — and it still failed: at the size it
could be cropped to, it read as scattered dots rather than as a globe, and the
band it sat in made the dashboard look like a different product from every other
screen. The dashboard subsequently returned to the shared `PageHeader`.

The lesson is worth more than the mark: a decorative flourish on one screen
costs consistency across all of them, and consistency is what makes a product
feel finished. Brand illustration should live in one bounded composition,
not scattered through the app.

### Welcome mascots

Ian has now supplied the alien-and-cat DARPE artwork and requested a greeting
animation. `WelcomeBanner` replaces only the dashboard header, retaining its
real greeting, context and calendar action. The generated adaptation removes
the overlaid logo and globe and reconstructs the obscured clothing; it is an
illustration based on the supplied mark, not a replacement official logo.

The production asset is `public/brand/darpe-mascots-welcome.png`. It uses an
opaque lavender background because the image editor's transparency attempts
produced a painted checkerboard. A CSS edge mask joins it to the lavender banner.
Generation prompts and provenance are recorded beside the asset in `README.md`.

On desktop the pair occupies a 240px column. Below 640px it occupies 112px
beside the title; description and action span the width below. Space is reserved
before the image loads. Next Image supplies responsive image sizes.

After the image loads, the pair rises into view once (480ms), then tilts gently
as a greeting (800ms). This moves the illustration as a whole, not individual
hands. There is no loop, hover replay or extra animation dependency. Under
reduced motion the mascots remain static. Decorative art has empty alt text and
cannot intercept clicks. Do not repeat it in operational tables or forms.

### Motion

The welcome mascots are the one bounded decorative animation inside the app. On
the login screen the same pair peeks in and then drifts a few pixels up and down
on a four-second loop (`darpe-mascots-float`): a loop would be a distraction
beside a table, and is harmless on a screen nobody works on. Both the greeting
and the login lift the pair slightly on hover. Other motion is feedback — a hover tint, a focus ring, a pending state, a chart drawing itself
once as its data arrives, or a brief fade when navigating to another view.
All of it is switched off under `prefers-reduced-motion`.

At Ian's request, route content now fades from 60% to full opacity over 180 ms
with ease-out timing (`AppContent`). The shell stays fixed, content is never
hidden or delayed, and forms are not remounted to replay motion. Only pathname
changes trigger it; filters, calendar weeks and dialogs in search parameters do
not. The native Web Animations API cancels it on navigation or reduced motion.

**No animation library.** GSAP was considered and turned down: CSS keyframes and
transitions cover every case here, and a dependency shipped to every page to
move a few pixels is not a trade worth making.

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
  background       #EEE3F4    brand pale lavender, lightened for contrast
  foreground       #241C30    violet-tinted near-black (13.19:1 on background)
  card             #FFFFFF    every panel lifts off the ground
  sidebar          #FAF7FC    a lighter lavender navigation surface
  border / input   #DDCDEE    lavender-tinted 1px borders
  primary          #7C3AED    white on it 5.7:1; as text on background 4.59:1
  secondary/accent #E6D7F3    with #5B21B6 text
  muted-foreground #5F5670    5.55:1 on background
  ring             #7C3AED    focus ring, same as the accent
```

**The ground carries colour, the cards do not.** An earlier build used a
near-white `#FAF7FC` page with white cards on it, and the two were within a
hair of each other: nothing had an edge, and the whole product read as a
document rather than as software. The ground now uses `#EEE3F4` (previously
`#F3ECFA`), following Ian's request for more lavender in the app's surroundings.
It lightens the brand's `#ECDFF2` enough to keep existing primary text above
4.5:1 without recolouring icons or actions. White cards retain separation, and no surface anywhere
is a saturated violet — a dark brand-coloured ground would be worse than the
washed-out one it replaced.

The working accent is **`#7C3AED`**, not the presentation's deep `#482D79`.
Deep violet is accessible but reads as institutional — the product looked like
office software. The brand's brighter violet still passes comfortably: white on
it is 5.7:1, and as text on the lavender background 4.59:1. `#5B21B6` carries text on
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

### Language colours — the flag, where it does not collide

DARPE teaches **nine** languages, and each wears the colour its flag makes
people think of. That beats an arbitrary spread: the strongest association most
people carry for a language is its country's flag, so staff learn the mapping
once and stop reading the label.

| | | | |
| --- | --- | --- | --- |
| Spanish **amber** — Spain's gold | English **indigo** — Union Jack navy | French **blue** — the flag blue | Italian **moss** — the green stripe |
| German **slate** — the black band | Japanese **rose** — the crimson circle | Chinese **clay** — vermilion | Korean **teal** — the taegeuk's blue |
| Swedish **cyan** — its pale blue | | | |

**Where fidelity and distinctness pull against each other, distinctness wins.**
The whole job of the colour is picking a row out at a glance, and four of these
flags are mostly red while three are mostly blue. So Japanese takes crimson (its
flag is a red circle and nothing else) and Chinese the warmer vermilion beside
it; German goes graphite for the black in its flag rather than becoming a fourth
red.

**Violet is deliberately absent.** It is DARPE's own colour, and a language
wearing it would compete with the interface. Plum stays free to mean "not one of
ours".

The chip carries the colour twice: a saturated dot beside a tinted pill. A fully
saturated pill shouts across a table of fifty rows; the tint alone was too faint
to find.

`languageTone()` resolves deterministically — by stored code first (so renaming
a language keeps its colour), then by name in English or Spanish (`Sueco`,
`Svenska`), then plum. No migration and no stored colour: the mapping is
presentation. `src/lib/tone.test.ts` asserts **the rules, not the palette** —
that no two languages collide, that none takes violet, that either spelling
gives the same answer — so a future recolour changes one file, not the tests.

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

### Tables

**Every table in the product is `DataTable`** (`src/components/shared/data-table.tsx`).
Not a convention — the only implementation. Each screen used to lay out its own
`<table>`, so no two agreed on column widths, and the browser divided space by
content: one long student name made every other column narrow, and the same
column was a different width on two screens showing the same people.

Columns are declared with an explicit width and the table is `table-fixed`:

- **Widths are percentages**, so the proportions hold at any window size.
- **Exactly one column omits its width** — the identifying one, usually a
  person's name. It absorbs whatever is left.
- **Numbers are right-aligned and tabular.** Digits line up down a column or
  there is no reason to have a column.
- **A row that navigates is one link**, stretched across the row, so the whole
  row is clickable while staying a single tab stop. A cell with its own control
  declares `interactive: true`, which lifts it above that link.
- **Below `md` the table becomes cards.** Six columns do not fit on a phone, and
  a sideways-scrolling table is not a list anyone reads.

### Editing in place — there are no edit pages

**The product has no `/edit` route.** A record's own page *is* its editor: every
value on it is its own control and its own one-field write. That is what CRMs
settled on years ago (Notion, Linear, Attio) and it is what DARPE's staff need —
they administer data all day, and changing a phone number should not be four
navigations and a submit that rewrites ten columns.

The primitives are in `src/components/shared/inline-field.tsx`:

- `InlineText` — click the value, type, Enter or blur commits, Escape reverts.
- `InlineSelect` — `render` draws the closed control, so the same component is a
  status chip on one screen and a line of text on another.
- `InlineToggle` — a yes/no fact: active, closed.

All three are optimistic (the value changes on click; the server's answer
replaces it, or the old value returns with an error toast) and all three write
exactly one field. The `Select` trigger's own caret is always hidden
(`[&>svg]:hidden`) — a chevron inside a status pill made the cell read as a form
field rather than as a status.

**Forms are for creating only.** `/students/new`, `/teachers/new`, `/groups/new`.
A form makes sense when nothing exists yet and every field must be filled at
once; it makes no sense for changing one value on a record that already exists.

**Server rules do not move to the client.** A group's language is locked while it
has members; a teacher must teach the group's language. Those refusals come back
as an error toast saying why, rather than an option quietly missing from a menu.

### Forms

`FormItem` sets `grid content-start gap-2`. Without `content-start` the implicit
rows stretch inside a taller grid cell, which happens on every two-column row
where one field has a hint and the other does not — and the two inputs end up at
different heights. That was the asymmetry everyone could see and nobody could
name.

Sections carry an icon in a tinted tile (`FormSection`'s `icon` and `tone`), so a
long form reads as three short ones.

### Dates

**Never `<input type="date">`.** It renders a different widget in every browser,
in that browser's colours, at that browser's size — nothing else on the page
looks like it. `DateField` (`src/components/shared/date-field.tsx`) is the date
control everywhere, built on the pure `monthGrid` helpers so no `Date` object is
constructed and no date can shift by a day through a timezone.

Its calendar is **portalled to `<body>` and positioned `fixed`**, and flips above
the field when there is no room below. An absolutely positioned panel is clipped
by any ancestor that scrolls or hides overflow; inside a dialog — which does both
— it came out sliced in half with the dialog's scrollbars trying to reach it. Any
popover the product grows later has the same constraint.

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
- **Record lists — table or cards, by how the list is read.** A **table** is for
  a list that grows and is scanned down a column: students, and later payments.
  A **card grid** is for a short list of unlike facts read one at a time:
  teachers, of whom there are a handful. Getting this backwards is what made
  students unusable — cards stop being scannable past about a dozen records.
  Below `md` both become record cards, because no table fits a phone.
  A table row navigates with a stretched link (`after:absolute after:inset-0`
  on the name, `relative` on the row): the whole row is clickable while staying
  one link in the tab order.
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

### Money on screen

- Always show the currency: `$4,200 MXN`, never a bare `$4,200`. DARPE charges in pesos
  and dollars, and an unlabelled amount is ambiguous by half.
- **Never draw or sum two currencies as one figure.** Totals render side by side
  (`$4,200 MXN · $180 USD`). A chart plots one currency — mixing them into one bar
  height draws a shape that means nothing.
- Headline figures are whole units; cents are noise at a glance. This is a display
  rounding and never feeds a calculation — the stored value is always integer cents.
- A month with no payments shows `$0`, not a placeholder or a dash. Zero is a fact.
- Paid and unpaid are the only payout states, so they are the whole visual language:
  teal for settled, amber for still owed. Nothing in between exists.
- Never invent a financial figure to fill a layout. If the data does not exist, the
  screen says which decision is missing.

---

## 9. Interaction

- Every destructive action asks for confirmation.
- Every async action shows a pending state (`Saving...`) and disables its trigger.
- Client-side validation is UX; server-side validation is the real check. Both use
  the same Zod schema.
- Error messages are specific and actionable, never technical.
- Transitions: 150 ms on interactive states; a 180 ms opacity entrance on route
  content, respecting reduced motion. No exit delays or page movement.

---

## 10. Accessibility

- Every input has a visible `<label>`; placeholders are not labels.
- Focus rings are visible and use the accent color — never removed.
- Icon-only buttons need an accessible name.
- Text contrast meets WCAG AA (4.5:1); muted text is for secondary information only,
  never for anything the user must read to complete a task.
- Color never carries meaning alone — status badges pair color with text.
