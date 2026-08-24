# DARPE Global Admin Platform — Claude Instructions

## Project

DARPE Global Admin Platform is a private admin web application for DARPE, a language-teaching business.

The application is initially used by three internal users:
- Dhanna — CEO
- Silvia
- Gabriela

Silvia's and Gabriela's job titles have not been confirmed yet. Do not assign them
titles or infer responsibilities from a title until DARPE confirms them.

Teachers are currently managed as data records and do NOT have accounts or logins.
Students are also data records.

The first goal is to provide a reliable internal system for managing students, teachers, schedules, and classes. Financial features and teacher accounts are later-phase functionality.

## Tech Stack

- Next.js — App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma ORM
- Supabase PostgreSQL
- Supabase Auth
- Zod
- React Hook Form
- Vitest
- pnpm

Error monitoring is not installed. Do not write code that imports Sentry or any other
monitoring SDK until one is actually added to the project.

Do not introduce new dependencies unless they are justified by an actual feature requirement.

## Architecture

Use feature-based organization under:

`src/features/`

Keep business logic separated from UI.

Typical structure:

- `components/` — UI
- `actions.ts` — server actions
- `queries.ts` — database reads
- `schemas.ts` — Zod validation
- pure utility/domain logic — separate files when appropriate

Database access belongs on the server.

Never expose database credentials or privileged server functionality to the client.

## Authentication

Authentication is handled by Supabase Auth.

Application-level user information belongs in the application's `Profile` table, which is
keyed by the Supabase Auth user id. `Profile` is the application-level identity record —
there is no `User` model in the Prisma schema.

Teachers are NOT authentication users in the current phase.

There are three internal users and they currently share the same operational permissions.

Keep the role field because it documents the intended architecture, but do not invent role-specific restrictions unless a real business requirement exists.

## Database

Prisma manages the application schema.

Supabase Auth manages authentication accounts separately from Prisma's application tables.

Do not attempt to make Prisma manage `auth.users`.

Prisma server connections use privileged database access, so Supabase Row Level Security must NOT be treated as the application's authorization layer.

Authorization must be enforced in server-side application code.

## Languages

DARPE teaches seven: Spanish, English, French, Italian, German, Japanese and
Swedish. `prisma/seed.ts` upserts them by code (`es en fr it de ja sv`); run
`pnpm db:seed` after adding one. Each has a distinct colour tone — see DESIGN.md.

`pnpm db:seed` also creates demo teachers, students and weekly slots when
`DARPE_SEED_DEMO=true`, for filling a development database. Every demo address
is on `@demo.darpe.invalid`, which is how they are found and deleted again.
Never enable it against a database holding real records you cannot separate.

## Current Core Domain

The current MVP domain includes:

- Profile
- Teacher
- Student
- Language
- ScheduleSlot
- ClassSession
- ClassParticipant
- Group / GroupMember
- AcademySettings
- Payment
- TeacherPayout

Teachers:
- can teach multiple languages
- currently do not log in
- can be active/inactive

Students:
- can have different teachers over time or in special cases
- have a status of TRIAL, ACTIVE, PAUSED or ARCHIVED
- recurring schedules are represented through ScheduleSlot

Classes:
- individual and group classes both exist. A `ScheduleSlot` belongs to **either** a
  student or a `Group`, never both and never neither — a database CHECK constraint
  enforces it, since Prisma cannot
- have a status of SCHEDULED, COMPLETED or CANCELLED
- classes can be rescheduled
- classes can be cancelled
- cancelled classes do not occupy a teacher's schedule
- restoring a cancelled class must respect teacher conflict rules

Attendance is recorded per participant on `ClassParticipant`, as PRESENT, ABSENT, LATE or
EXCUSED. Attendance is nullable: a class that has not happened yet simply has none.

## Class Lifecycle

Class status transitions are validated by pure logic in `src/features/sessions/lifecycle.ts`.
That module is the single source of truth for these rules — read it before changing
anything about class status, and extend it rather than re-checking status inline.

The rules it currently encodes:

- SCHEDULED may become COMPLETED or CANCELLED.
- COMPLETED and CANCELLED never convert directly into each other; the class must be
  reopened to SCHEDULED first, so every change to a finished class is deliberate.
- SCHEDULED and COMPLETED classes occupy their teacher's time. CANCELLED classes do not.
- Only a SCHEDULED class may have its date, time or duration edited. Completed and
  cancelled classes are locked until reopened.
- Attendance can be recorded on SCHEDULED and COMPLETED classes, never on a cancelled one.

Completing a class and recording its attendance happen in one server action, because a
completed class is a record of who actually attended.

## Scheduling Rules

ScheduleSlot represents a recurring weekly pattern.

A slot contains:
- student
- teacher
- weekday
- wall-clock start time
- duration
- validity window
- active state

ClassSession represents a real scheduled occurrence.

Important distinction:

- `ScheduleSlot` = recurring pattern
- `ClassSession` = actual class

`ClassSession.startsAt` is the real, editable date/time.

`slotOccurrenceOn` identifies the original recurring occurrence and must remain unchanged when a session is rescheduled.

Generating sessions must be idempotent.

Existing sessions must never be modified or deleted by generation.

Generation must:
- only use eligible students
- exclude inactive teachers
- respect ScheduleSlot validity windows
- avoid duplicate occurrences
- detect teacher conflicts
- never overwrite existing sessions
- report created, skipped, and conflicted occurrences

Teacher scheduling conflicts use actual time overlap.

Back-to-back classes are allowed.

Cancelled sessions do not block a teacher.

## Groups

A group is **one teacher and one language**, taught to several students. Settled rules:

- Only students who study the group's language, and who are active or on trial, may
  join. Checked on the server every time.
- The class language comes from the **group**, never from a member.
- A group with no members generates nothing — a class with nobody in it is not a class.
- A generated group class carries **one `ClassParticipant` per member**, which is what
  makes attendance per student work exactly as it does for an individual class.
- Removing a member never touches classes that already happened; they keep the student
  and their attendance.
- Closing a group (`active: false`) keeps its history and stops generation, like an
  inactive teacher.
- The group's language is locked while it has members: they joined because they study it.
- **Editing a recurring series from a group class is refused** with a message pointing at
  the group. Splitting a group series would have to decide what happens to every member's
  attendance, and that rule is not settled — do not invent it.

## Money

Two records, both deliberately small. DARPE's finance rules are not settled, so the
schema stores what is already true and nothing that would encode a guess.

`Payment` — money a student actually handed over. `receivedOn` is the day it arrived,
and **revenue counts on that date**: DARPE recognises money on receipt, not on invoice
or on the class it pays for. There is no invoice, no expected amount and no due date,
so the app can never show "outstanding from students" — the finance screen says so
rather than leaving a hole where a figure should be.

`TeacherPayout` — one row per teacher per period. Its point is `paidOn`: null means
still owed, a date means settled. The amount is typed in by staff, because the rates
live with them and not in this system yet. Unique on `(teacherId, periodStart,
periodEnd)`, so recording a period twice updates it instead of duplicating it.

Hours are **never stored on a payout**. They are derived from COMPLETED classes in the
period (`teachingLoad` in `src/features/finance/money.ts`), split individual/group, so
they can never drift from the calendar. Whether cancelled classes are paid is still
unconfirmed — currently they count for nothing, and only COMPLETED classes do.

Amounts are integer cents (`amountCents`), always. `parseAmountToCents` splits on the
decimal point rather than multiplying by 100, because `2380.15 * 100` is not 238015 in
floating point. **MXN and USD are never added together** — `totalByCurrency` returns one
total per currency and every screen shows them side by side. A single mixed figure would
be true in neither currency.

Payment methods are CASH, STRIPE and TRANSFER. Stripe is a label here, not an
integration: nothing in this app talks to Stripe.

## Timezone

DARPE currently operates in:

`America/Chihuahua`

Store actual session timestamps as UTC.

Recurring schedule times are wall-clock times in the academy timezone.

Use the existing datetime utilities rather than implementing timezone conversion ad hoc.

Do not assume UTC represents the academy's local wall-clock time.

## Calendar

The calendar is a weekly interactive calendar.

Current view:
- Monday through Sunday
- teacher filter
- sessions positioned according to their actual time and duration
- overlapping sessions are displayed side-by-side
- cancelled sessions remain visible but visually distinct

The grid shows 07:00–22:00 by default and widens further if a class falls
outside it. Hours outside the academy's normal working day
(`src/features/sessions/business-hours.ts`, currently 08:00–20:00) are tinted
and their creation positions read "Add (outside hours)" — **fully bookable, just
marked**, because DARPE teaches online across time zones and an early or late
class is ordinary. Both ranges are parameters, ready for a Settings screen to
supply the academy's real hours.

Sunday is displayed. It always worked in the data model and in generation, but the
view used to stop at Saturday, so a Sunday class existed and was invisible. Whether
DARPE actually teaches on Sundays is still unconfirmed — the column is there so a
one-off weekend class cannot go missing.

Do not replace the current calendar implementation with a calendar library unless a real requirement makes it necessary.

## Business Rules Still Evolving

Do not invent business rules when requirements are unclear.

Known business context:
- teachers and the client organization agree on availability/schedules
- internal staff organize the final schedule
- Google Calendar is currently used operationally
- classes may be rescheduled or cancelled
- individual and group classes both exist, and both support recurring schedules
- payments currently happen mainly by bank transfer and cash
- Stripe may be relevant later
- vacations and holidays need proper business validation before implementing automation

When a requirement is unclear, stop and ask rather than guessing.

## Scope

Prioritize working business functionality over visual complexity.

Do not prematurely implement:
- analytics
- complex dashboards
- payroll
- invoices
- payment processing
- teacher accounts
- file management
- unnecessary permissions

These may belong to later phases.

Do not build fake data-driven features just to make the UI look complete.

## Code Quality

Prefer:
- simple solutions
- readable code
- strong typing
- server-side validation
- reusable domain logic
- small focused modules
- explicit business rules

Avoid:
- premature abstraction
- duplicated business logic
- unnecessary dependencies
- large monolithic components
- silent fallback behavior that hides errors

Pure business logic should remain testable without database access whenever practical.

## Security

Never:
- commit `.env` files
- expose secrets to the client
- trust client-side authorization
- trust user-provided IDs without validation
- perform privileged database operations from client components

Validate server action inputs with Zod.

Authentication and authorization must be checked on the server.

## Git Workflow

Ian owns the repository history. Claude Code must NOT run any of the following unless Ian
explicitly requests that specific action in the current conversation:

- creating commits (`git commit`)
- creating or switching branches
- pushing to any remote (`git push`)
- opening or updating pull requests

This is not a default that can be inferred from context. Finishing a feature, passing every
check, or being told "go ahead" with the implementation is NOT permission to commit. Leave
the changes in the working tree and let Ian review and commit them.

Reading git state (`git status`, `git diff`, `git log`) is always fine.

When Ian does ask for a commit, use a clear conventional commit message.

Work incrementally.

Before implementing a significant feature:

1. Inspect the existing implementation.
2. Explain the proposed approach.
3. Identify affected files and potential risks.
4. Wait for approval when the change is substantial.
5. Implement.
6. Run relevant validation/tests.
7. Review the resulting diff and report the result.

Do not modify unrelated working code.

Do not refactor unrelated areas unless necessary for the current feature.

## Claude Code Behavior

Before changing code, inspect the relevant existing implementation.

Prefer extending existing patterns over introducing new ones.

Do not assume requirements that have not been established.

If an architectural or business decision is unclear, ask before implementing it. An unclear
business requirement must be confirmed with Ian before it is implemented — never guess at
one and never encode a guess as if it were a decided rule.

### Small, focused changes

Keep each change small and scoped to the feature being asked for.

- Change the fewest files that genuinely accomplish the task.
- Do not bundle drive-by refactors, renames, formatting sweeps, or dependency changes into a
  feature change.
- If you notice something worth fixing outside the current scope, mention it instead of
  fixing it.
- Prefer several small reviewable steps over one large change. Ian reviews every diff.

### Concise implementation reports

After implementing, report briefly. A good report is a short paragraph or a few bullets:

- what changed, by file
- the one or two decisions that actually mattered, and why
- verification results (lint, typecheck, tests, build) as actual outcomes
- anything left undone, blocked, or needing Ian's confirmation

Do not restate the whole diff, re-explain code that speaks for itself, or pad the report with
summary tables and headings. If tests fail or a step was skipped, say so plainly.

After implementation, verify the result with the project's available linting, type checking, tests, and build commands when relevant.

Always explain important architectural decisions briefly so the developer can understand what is being built.

## Current Project State

The pilot scheduling and operations foundation is merged into `main` (PR #5). Always confirm
the real state with `git status` and `git log` rather than trusting this section.

Scheduling and calendar:
- recurring ScheduleSlots with validity windows
- idempotent monthly generation with teacher-conflict reporting
- one-off classes and finite weekly series created directly from calendar positions
- single-session edits, "this and future" series splits, and end-series — history is
  never rewritten; the old rule is ended and a new one takes over
- direct move mode held in `?moving=`; cancellation and restoration with conflict checks
- desktop week grid and bounded mobile day agenda; teacher filter; timezone-aware layout
- every scheduling decision and its write share one Serializable transaction
  (`inSchedulingTransaction`), with Prisma `P2034` translated to a retry message

Class lifecycle:
- completion + per-participant attendance (PRESENT / ABSENT / LATE / EXCUSED) in one action
- transitions validated by `src/features/sessions/lifecycle.ts`; the completion write
  re-checks the status inside its transaction, so a concurrent cancellation rolls it back
- scheduling edits locked on completed and cancelled classes; completed classes occupy the
  teacher's time, cancelled ones do not

Students and teachers:
- lists with client-side, accent-insensitive search and a status filter; archived students
  and inactive teachers stay reachable there (default views hide them)
- create and edit flows for both; editing reuses the creation form, and the student form
  includes status — pausing, archiving and reactivating are ordinary edits
- student profile shows the recurring pattern plus concrete classes: bounded upcoming and
  history lists with attendance, each row linking to its calendar week
  (`getStudentSessions` in `src/features/students/queries.ts`)
- teacher profile at `/teachers/[id]`: active state, languages, contact, assigned
  students, upcoming classes, and this-week counts (Monday–Sunday, academy time) —
  no hours, rates or earnings until financial records exist
- teacher active flag is edited on the teacher form; eligibility and generation refuse
  inactive teachers on the server, so deactivation needs no cascade
- `Teacher.hourlyRateCents` and `Teacher.notes` exist in the schema but have no UI —
  rate is a finance-phase concern

Dashboard (`/dashboard`):
- greets the signed-in staff member by the first word of their `Profile.name`
  (server-rendered, academy wall-clock hour; blank name degrades to the plain greeting)
- operational only, timezone-correct via `src/features/dashboard/windows.ts`: today's
  classes, "needs attention", next upcoming, this-week status counts, active/trial
  student and active teacher counts, and a month line (classes completed and still
  scheduled this academy month) — actionable sections render above summary counts
- **a class needs attention once it has fully ended and is still SCHEDULED** — the rule
  lives in `src/features/dashboard/overdue.ts`, not in the query. Because SQL cannot add
  a row's own duration to its start, the query splits: classes older than
  `OVERDUE_WINDOW_MINUTES` have certainly ended and are counted in the database, while
  the ones inside that window are fetched and judged by `hasFullyEnded`. A class still
  running is never overdue; an earlier class from today is.
- all dashboard strings live in `src/features/dashboard/copy.ts` for a later translation
  pass
- a money panel fed by real payments (`src/features/finance/provider.ts`): this month in
  pesos, the change on last month, six months of history and what is still owed to
  teachers. The sample-data fixture that used to fill it is gone.

Visual foundation:
- brand tokens from the DARPE presentation live in `src/app/globals.css` (deep violet
  `#482D79` primary, warm `#FAF7FC` background, pale-lavender tints); contrast rationale
  is documented in DESIGN.md §3 — mauve and lavender gray never carry text
- two type roles via `next/font`: Instrument Sans (`font-sans`) for everything
  operational, Newsreader (`font-serif`) only for the wordmark, greeting, page titles
  and key figures
- shared layout primitives in `src/components/shared/`: `PageContainer` (bounds pages at
  1440px, calendar at 1680px), `PageHeader`, `Section`, `EmptyState`, and `DarpeMotif` —
  an original decorative mark, never a logo, since DARPE's official mark is still needed

Money screens:
- `/payments` — payments received this month, and every active teacher's period with
  their hours and whether they have been paid. A teacher who taught nothing still
  appears, because a zero is how staff know the period was checked.
- `/finance` — received this month and owed to teachers, six months of peso history, a
  breakdown by method, and the unpaid payouts. No "outstanding from students", with a
  line on the page explaining why.
- both screens and the dashboard panel degrade to a "run the pending migration" state on
  Prisma P2021 (`isMissingTable` in `src/lib/db-errors.ts`) instead of crashing. Only
  that one code is caught.

Navigation: grouped sidebar — Overview (Dashboard), Operations (Calendar, Students,
Groups, Teachers), Money (Finance, Payments), Workspace (Settings). Navigation never
links to a missing page. Mobile keeps four tabs: Home, Calendar, Students, Teachers —
money and settings are desk work.

Testing:
- Vitest (`vitest.config.mts`), run with `pnpm test`
- suites cover pure domain logic without database access: conflicts, lifecycle,
  eligibility, schemas, series and series editing, scheduling, calendar layout, calendar
  return, element ids, trigger focus, dev origins, names, tone, list search
  (`src/lib/search.test.ts`), the dashboard's windows, overdue rule and copy, and money
  (`src/features/finance/money.test.ts` — cents parsing, per-currency totals, teaching
  load)

### Latest verification

All four checks were run on 2026-08-23 against this state and passed:

| Command | Result |
| --- | --- |
| `pnpm lint` | clean, no errors or warnings |
| `pnpm typecheck` | clean, no type errors |
| `pnpm test` | 28 test files, 507 tests passed |
| `pnpm build` | succeeded from a clean `.next` — 20 routes |

Re-run these rather than trusting this table after any code change; it is a snapshot, not a
standing guarantee.

The next feature should be determined from the project's actual requirements and current repository state.

Do not assume the next feature solely from previous conversation context.