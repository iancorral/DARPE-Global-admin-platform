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

Roles are OWNER (Dhanna), ADMIN (Ian's maintenance account) and STAFF, which is
labelled **Member** on screen (Ian, 2026-09-22: "Staff" sounded like a lesser rank;
the stored enum value is unchanged). They differ in **one** thing only:
`canManageTeam` (`src/features/team/roles.ts`) lets OWNER and ADMIN use Settings →
Team, which adds people and resets passwords. Everything else is the same for
everyone — do not invent other role-specific restrictions unless a real business
requirement exists.

**An admin account can never be reset from the app** (`canResetPasswordOf`, enforced
in `resetTeamMemberPassword` and mirrored by hiding the button). The maintainer must
always be able to get in, and a reset by mistake — the owner included — would lock
out the one person who can fix things. The app has no delete or disable either, so
that was the only lever. An admin changes their own password under Your account;
a forgotten one is recovered in the Supabase dashboard.

**Settings → Team** (`src/features/team/`) creates the Supabase Auth user *and* its
`profiles` row in one action, deleting the auth user again if the profile fails, so
the two-step trap below cannot happen from the app. It needs `SUPABASE_SECRET_KEY`
on the server (`src/lib/supabase/admin.ts`); without it the section says so and the
rest of the app is unaffected. A new account and a reset both leave
`passwordSetAt` null, so the person is asked to choose their own. Nobody can reset
their own password there — that is Settings → Your account.

**Notes** (`/notes`, `src/features/notes/`) are two boards on one screen:

- **Mine** — private to each profile, the admin's included. Every read and write
  goes through `reachable()` in `actions.ts`, so another person's private note id
  matches nothing. "Private" means private inside the app; whoever owns the
  database can still read them.
- **Team** — `shared: true`. Any staff member reads and edits these, and each can
  be pointed at one person (`assigneeId`). It exists because DARPE's own tracking
  sheet is a shared list with a *Responsable* column, so a private notebook could
  never replace it (Ian, 2026-09-22).

Both carry checklists, colours, a reminder date, pinning, archive and an
**importance** (`NOTE_PRIORITIES`: URGENT, IMPORTANT, or none) — their sheet's
*Importancia* column, cycled on one button. The dashboard shows a person's own
urgent/pinned/due notes plus the team tasks assigned to them; an unassigned team
task stays on the board.

**Creating an account is two steps, and skipping the second one breaks the app.**
A Supabase Auth user needs a matching `profiles` row with the *same id*, because
`Profile` is what the application reads. An auth user without one used to bounce
forever between the session guard and the app; it now lands on `NoProfile`
(`src/features/auth/components/no-profile.tsx`), which says what is missing and
offers Sign out. The `(app)` layout is the only place that distinguishes the two
cases — no session redirects to `/login`, a session without a profile does not.

**Passwords are the person's own.** `Profile.passwordSetAt` is null while
somebody is still on the password whoever created the account chose. While it is
null the dashboard carries a notice, and Settings → Your account is where they
change it (`changePassword` in `src/features/auth/actions.ts`). That action
**re-checks the current password before updating**: Supabase would accept the
change from the session alone, so an unattended signed-in laptop would otherwise
be enough to lock the owner out. The minimum is `MIN_PASSWORD_LENGTH` (10) with
no composition rules, and Supabase enforces its own minimum underneath.

## Database

Prisma manages the application schema.

Supabase Auth manages authentication accounts separately from Prisma's application tables.

Do not attempt to make Prisma manage `auth.users`.

Prisma server connections use privileged database access, so Supabase Row Level Security must NOT be treated as the application's authorization layer.

Authorization must be enforced in server-side application code.

## Languages

DARPE teaches nine: Spanish, English, French, Italian, German, Japanese,
Swedish, Chinese and Korean. `prisma/seed.ts` upserts them by code
(`es en fr it de ja sv zh ko`); run `pnpm db:seed` after adding one. Each has a distinct colour tone — see DESIGN.md.

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
- have **two** independent states, because DARPE asks two questions about a
  student and one field could not answer both:
  - `status` — ACTIVE, PAUSED or ARCHIVED. There is **no trial state**: DARPE
    gives no trial classes. Somebody who wants to try one books an advisory,
    which is an ordinary paid class.
  - `billing` — PAID, PENDING, RESERVED, BENEFIT or COLLABORATION, DARPE's own
    vocabulary. BENEFIT is a DARPE teacher taking classes with another DARPE
    teacher; COLLABORATION is classes in exchange for work, such as videos
    about the academy. Neither is a payment state — they are why no money is
    expected.
- staff still read **one chip per student**: `statusChip` in
  `src/features/students/status-chip.ts` shows the lifecycle whenever it is not
  ACTIVE and the billing state when it is. Somebody who stopped studying reads
  as "Inactive", never as owing for a course they are not taking.
- `pausedAt` records when a pause began, so "paused for over a month" is a fact.
  `src/features/students/pause.ts` owns that rule (`PAUSE_ARCHIVE_DAYS = 30`).
  **Archiving is never automatic**: the rule asks the question and staff act on
  it, because people vanishing from the lists for reasons nobody in the office
  can explain is worse than a stale record.
- **"Inactive" means archived.** The register's INACTIVO is ARCHIVED, never
  PAUSED (Ian, 2026-09-14), and the app never shows the word "Inactive": a pause
  reads "Paused". Teachers use the same word — an inactive teacher is labelled
  "Archived". The 13 register-inactive students were archived that day and
  removed from the future classes they had no attendance in.
- generation adds only ACTIVE group members (`ELIGIBLE_STUDENT_STATUSES`). It
  used to add every member, so a student who had stopped stayed in each newly
  generated class of their old group
- `level` is CEFR A1–C2, validated in Zod against `STUDENT_LEVELS` but stored as
  text: DARPE is still settling how it grades, and a list is cheaper to change
  than a Postgres enum.
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
- Archiving a group (`active: false`, labelled "Archived", no longer "Closed") keeps
  its history and stops generation, like an inactive teacher. It also removes the
  group's future SCHEDULED classes that have no attendance
  (`removeUpcomingGroupClasses`), so an archived group does not linger on the calendar.
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

`TeacherPayout` — one row per teacher per **pay week**. Its point is `paidOn`: null
means still owed, a date means settled. Unique on `(teacherId, periodStart,
periodEnd)`, so paying a week twice updates it instead of duplicating it.

**Teacher pay is computed, not typed** (meeting 2026-09-21), by the pure rules in
`src/features/finance/teacher-pay.ts`:
- a pay week is Monday–Sunday, paid the **Friday after** (`paydayFor`, Monday + 11
  days). `?week=` on `/payments?tab=payouts` picks it; the default is last week.
- individual classes pay $200 an hour. Group classes pay $170 an hour for two
  students, $10 more per extra student, capped at $200 for five (`groupHourlyCents`,
  size clamped to 2–5). Group size counts participants not marked ABSENT or EXCUSED.
- only COMPLETED classes are paid. This contradicts "cancelled classes are paid"
  in the 2026-08-24 section below and is **still to be confirmed with DARPE** —
  change `teacher-pay.ts`, nowhere else.
- `payTeacherWeek` recomputes the amount on the server (`teacherWeekPayCents`) and
  never trusts a figure from the client. If classes change after a week was paid,
  the card offers "Update to $X".
- "Owed to teachers" (`getTeacherOwed`) sums completed classes in unpaid weeks,
  looking back `OWED_LOOKBACK_WEEKS` (12).
- the rates are constants, not Settings — whether they should be editable is open.

Amounts are integer cents (`amountCents`), always. `parseAmountToCents` splits on the
decimal point rather than multiplying by 100, because `2380.15 * 100` is not 238015 in
floating point.

**Everything is in pesos** (meeting 2026-09-21). A payment in USD, CAD or EUR is
entered with the rate of the day ("Pesos per 1 USD") and stored at its MXN value in
`amountCents`, with `originalCurrency`, `originalAmountCents` and
`exchangeRateMicros` kept beside it so the conversion can be read back.
`src/features/finance/currency.ts` owns the conversion; rates are integer micros.
Payments recorded before this change may still carry USD — `totalByCurrency` keeps
them separate rather than adding them to pesos.

The 36 payments imported from the register were **deleted on 2026-09-21** at DARPE's
request; staff register payments from scratch.

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

**The week pager is a bar of its own, and it is links, never buttons.**
`WeekPager` (`src/features/sessions/components/week-pager.tsx`) sits directly
above the grid and spans it: arrows pushed to the two ends, the week's dates
centred between them in uppercase. That shape is Ian's, from a reference he
sent — the control spans the thing it moves. It is the only week navigation:
"Back to this week" appears under the dates once you leave the current week.
The "Today" button and the jump-to-date picker were removed (Ian, 2026-09-14)
because they repeated what the pager already shows. `CalendarToolbar` holds only
the teacher filter and generation.

**The grid fits the screen.** `WeekGrid` measures the space below it and sets
the hour height between 42px and 60px, so the whole day fits without scrolling
wherever the screen allows; a shorter screen still scrolls inside the grid. Move
mode keeps its fixed 80px.

**A group class is called by its group's name** everywhere — calendar card,
class dialog, dashboard lists, move banner — through `sessionTitle` in
`src/features/sessions/session-title.ts`, the way DARPE's timetable writes
"Grupo VII". The members are listed in the class dialog, where attendance is
taken.

Every one of those is a `<Link>`, built by `weekPagerLinks` in
`src/features/sessions/week-pager.ts`. They used to be buttons that navigated
inside a `useTransition` and disabled themselves while it was pending, so a slow
calendar query left every week control dead with nothing explaining why — Ian
reported the calendar as having no way to reach another week at all. **Do not
put navigation behind a pending flag again.**

Do not replace the current calendar implementation with a calendar library unless a real requirement makes it necessary.

## Confirmed by DARPE (2026-08-24)

Answers from DARPE's own meeting. These are decisions, not guesses — do not
re-open them without being told to.

**Not a physical school.** DARPE teaches online to students in different places.
There is no campus, no term calendar, and no fixed opening hours. Holidays and
vacations are arranged directly between teacher and student, so **no holiday
automation belongs in this app**. Dhanna's classes at Humanitas university are
outside the system entirely.

**Course prices** (a course is one month, four weeks, material included):

| Course | MXN | USD | Hours |
| --- | --- | --- | --- |
| Advisory | $370/hr | $25/hr | 1 hour |
| Group extensive | $1,350/mo | $70/mo | 8 h/month |
| Individual extensive | $2,999/mo | $180/mo | 8 h/month |
| Individual intensive | $5,300/mo | $380/mo | 16 h/month |

Card payments carry a $60 MXN commission. Individual extensive went from $2,800
to **$2,999 in September 2026** for new students (Ian, 2026-09-12). The table
is the default in `src/features/finance/pricing.ts`, and staff change it from
**Settings → Course prices**, which writes one `CoursePrice` row per edited
modality (`resolveCoursePrices` lays those over the defaults). Prices are
reviewed for next year. Several students are on the price they started at,
because Dhanna honours the original rate — so what the payments screen shows
is always the *list price*, never an amount a particular student owes.

**Teacher pay is per course, not per hour.** A completed individual extensive
course (8 h) pays the teacher $1,600; individual intensive (16 h) pays $3,200;
group (8 h) pays $1,360. The hourly figures in DARPE's own sheet are a pricing
exercise, not how anyone is paid.

**Cancelled classes are paid.** Teachers are flexible, but students must give at
least an hour's notice — the teacher has already organised their day around it.
*Not implemented:* the weekly pay breakdown counts only COMPLETED classes, and
whether a late cancellation pays the teacher is being re-confirmed (see Money).

**Class length is one hour**, and the picker offers half-hour steps
(`DURATION_OPTIONS`).

**Groups are deleted when their course ends**, which is why the numbering in the
register has gaps. Note that closing a group (`active: false`) keeps its history
where deleting it does not.

**Accounts are individual** — Dhanna, Silvia and Gabriela each get their own, and
all three see everything, money included. More profiles may come later.

**The UI stays in English.** Several languages are wanted eventually; that is a
later iteration, not this one.

## Business Rules Still Evolving

Do not invent business rules when requirements are unclear.

Known business context:
- teachers and the client organization agree on availability/schedules
- internal staff organize the final schedule
- Google Calendar is currently used operationally
- classes may be rescheduled or cancelled
- individual and group classes both exist, and both support recurring schedules
- students pay by bank transfer and by card through Stripe; Stripe is still only
  a label on a payment, not an integration

Still genuinely open, and not to be guessed at:
- how often teachers are settled — per class is confirmed, but whether that is
  paid out weekly or monthly is not
- whether the price table above or the register's is correct, and what happens
  to students on their original rate
- what "owed by a student" should mean, now that a course has a known price
- whether every student has a start date recorded anywhere

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

**An exported server action is a public endpoint.** Anything `export async
function` in a `"use server"` file can be called by anyone who can reach the
app, so every one of them starts with `requireUser()` and parses its input with
Zod — and an action no screen calls is deleted rather than left lying around
(`deletePayment` went that way on 2026-09-22).

### Hardening in place (audited 2026-09-22)

- **Security headers** for every response, set in `next.config.ts`: a CSP that
  is `'self'` throughout — the app loads no third-party script, style, font or
  image, and the browser never talks to Supabase directly — plus HSTS,
  `nosniff`, `frame-ancestors 'none'` with `X-Frame-Options`, a referrer policy
  and a `Permissions-Policy` that turns the camera, microphone, geolocation,
  payment and USB APIs off. `poweredByHeader` is off. The one loose thread is
  `'unsafe-inline'` on scripts, which Next's inline bootstrap needs until the
  proxy rewrites the header with a per-request nonce.
- **`robots.txt` disallows everything** (`src/app/robots.ts`) and, like the
  manifest, is excluded from the session guard — behind it, the file telling
  crawlers to stay away came back as the login page.
- **Row Level Security is on for all 17 tables with zero policies**, so the
  Supabase REST API answers nothing to `anon` or `authenticated` even though
  those roles hold grants. Prisma connects as the owner and authorization
  stays in application code. Verified against the live database, not just the
  migrations.
- **No secrets reach the browser**: the only `NEXT_PUBLIC_` values are the
  Supabase URL and publishable key, and `SUPABASE_SECRET_KEY` is read exclusively
  by `src/lib/supabase/admin.ts`, which is `server-only`.
- **Provider errors are not forwarded** to the screen: sign-in failures read
  "Invalid email or password" (no account enumeration) and the team actions
  return their own wording rather than Supabase's.
- **Dependencies**: `pnpm audit --prod` is clean. Next was on 16.2.10, which
  carries a critical unauthenticated RCE and a **proxy-bypass** advisory —
  exactly the guard this app relies on — so it is pinned at 16.3.5. The `shadcn`
  CLI moved to devDependencies, and `pnpm-workspace.yaml` holds overrides for
  transitive advisories upstream has not resolved. Re-run `pnpm audit` before
  each deploy; the machine's pnpm also refuses packages published in the last
  few hours, which is worth keeping.

Still open, and worth doing before this is on the public internet for long:
sign-in throttling (Supabase's own auth rate limits are the only thing in front
of the login form today; its captcha option is the next step), and a nonce-based
CSP.

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
- **there are no edit pages.** A record's own page is its editor: every field on a
  student, teacher or group is edited in place by `quickEditStudent`,
  `quickEditTeacher` or `quickEditGroup` — one field, one write, the same
  server-side validation the create form uses. Forms exist only at `/new`.
  The pause date still goes through `pausedAtForChange`, so there is one rule for
  pausing, not two, and `quickEditGroup` re-runs the group's own rules (teacher
  must teach the language; language locked while it has members).
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

Dashboard (`/dashboard`), redesigned 2026-09-22:
- a **2×2 of equal cards** from `lg` up (Ian, 2026-09-22 — both earlier layouts
  left the two columns ending at different heights): Today │ Needs attention
  (+ notes) on a fixed-height top row where a long list scrolls inside its own
  card, Class activity │ Money below. One column on a phone, chart last.
  **Today** is a timeline (`today-timeline.tsx`; one line per class with the
  teacher right beside the name — ended ones fade, the running one says "Now",
  exactly one says "Next" — `timelinePhases` in `src/features/dashboard/timeline.ts`).
  **Needs attention** is an inbox grouped by day (`attention-inbox.tsx`, 6 rows
  then "N more", "All caught up" when empty). The two lists used to share one
  row component and read as the same card twice — keep them visually different.
- calendar cards, the legend and both dashboard lists carry the language's
  two-letter code (`languageCode` in `src/lib/tone.ts`) beside its colour.
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
- `/payments` — two tabs. **Students**: everyone on a course, their plan, its list
  price and whether they have paid, with the status chip editable in place.
  **Teacher pay** (`?tab=payouts&week=`): one card per teacher for the pay week,
  with the computed amount, "See classes", a method and "Mark paid" (undoable).
  Teachers with no completed classes are listed on one line underneath, because a
  zero is how staff know the week was checked.
- What a student pays is **inferred from their modality**, never invoiced: DARPE has
  no invoices, so there are no invoice numbers or due dates anywhere. `pricing.ts`
  holds the default list prices; Settings → Course prices overrides them per
  modality (`CoursePrice`), and `getCoursePrices()` in `src/features/settings/queries.ts`
  is what every money screen reads. The column is labelled "Course", not "Owes",
  because several students are on the rate they started at and the app cannot know
  which.
- `/finance` — one **month at a time**, chosen by `?month=YYYY-MM` and paged with
  links (`MonthPager`), defaulting to the current month. `src/features/finance/months.ts`
  is the pure logic and owns where the pager may stop: back to the first month
  holding a payment, forward no further than the current month *unless* a payment
  is dated later, so money that exists can always be reached and empty years
  cannot be wandered into. The six-month chart **ends at the selected month** and
  draws it solid while the rest fade, and the headline is always paired with the
  month before it.
  - **"Owed to teachers" deliberately does not follow the pager.** It is a fact
    about now; nothing records what was owed part-way through a month that has
    since been settled, so both that card and the payouts list say "any period".
    Keep period figures and current state visually separate here.
  - A month means a **calendar** month, and the page says so. If DARPE turns out
    to close its books on another day, `getFinanceOverview` is the one place that
    changes. Their register tracks a "próxima fecha de pago" per student, so a
    per-student cycle is also possible — unconfirmed, do not build it on a guess.
  - No "outstanding from students" figure.
- both screens and the dashboard panel degrade to a "run the pending migration" state on
  Prisma P2021 (`isMissingTable` in `src/lib/db-errors.ts`) instead of crashing. Only
  that one code is caught.

Navigation: grouped sidebar — Overview (Dashboard), Operations (Calendar, Students,
Groups, Teachers), Money (Finance, Payments), Workspace (Notes, Settings). Navigation never
links to a missing page. On a desktop the sidebar **folds to an icon rail** (Ian,
2026-09-22), mainly to give the calendar its width. The toggle is the menu's **last row**,
"« Collapse", styled exactly like the entries above it (GitLab, the Azure portal).
Three placements at the top failed review: a panel icon read as a strange box, a
☰ beside the wordmark crowded it off-centre, and a round handle on the border
looked like nothing else in the app. The top belongs to the brand alone: every entry keeps its name as
a tooltip and for screen readers, and the state lives in a cookie
(`src/components/shared/sidebar-state.ts`) that the `(app)` layout reads, so the
first paint is already the right width instead of opening and snapping shut. A phone has five tabs (Home, Calendar, Students, Groups,
Teachers) and a slim top bar, `MobileTopBar`, whose avatar opens a bottom sheet
with Notes, Finance, Payments, Settings and Sign out — the pattern Gmail and Google
Calendar use — instead of a sixth tab.

Design system (see DESIGN.md for the rules; these are the modules):
- `DataTable` (`src/components/shared/data-table.tsx`) is the **only** table.
  Columns declare a percentage width and the table is `table-fixed`, so the same
  column is the same width on every screen. Never hand-roll a `<table>`.
- `DateField` (`src/components/shared/date-field.tsx`) is the **only** date
  control — `<input type="date">` renders a different widget per browser. Built
  on the pure helpers in `src/lib/month-grid.ts`.
- `TabSwitch`, `FormSection` (icon + tone per section) and the editable cells in
  `src/features/students/components/quick-edit.tsx` are the other shared pieces.
- the create forms' side panel is `SimilarRecords`
  (`src/features/directory/components/similar-records.tsx`): the most recently
  added records, narrowing to similar names as one is typed, so a duplicate is
  caught before it is saved. On a phone the matches repeat as one line under the
  name field (`SimilarRecordsInline`). The explanatory notes that used to sit
  there are gone.
- **UI copy is short and standard.** No paragraphs explaining how the app works,
  no internal reasoning, no people's names in help text (Ian, 2026-09-14). If a
  sentence tells staff something they already know, delete it. Design rationale
  belongs in code comments and these docs, never on screen.

Brand assets (`public/brand/`, documented in `public/brand/LOGOS.md`):
- the favicon, `apple-icon.png` and `manifest.ts` are wired up, so the app
  installs on Android and Windows and has a proper home-screen icon on iOS
- the sidebar shows DARPE's real wordmark; the mascots peek from the dashboard
  greeting (on every screen size) and from the login's brand panel, and
  nowhere else. On the login they also drift slowly — the one looping
  animation in the product, allowed there because nobody works on that screen
- both were supplied opaque; `scripts/cutout-mascots.mjs` regenerates the
  transparent WebP versions the app uses. Re-run it if the artwork changes.
- every icon comes from `darpe-golden-globe.png` via `scripts/build-icons.mjs`:
  it cuts the white out and writes the ICO plus each PNG size. **The favicon
  and the `purpose: "any"` icons are the bare globe on a transparent ground**
  (Ian, 2026-09-12: no violet square in the tab). Only `apple-icon.png` and the
  maskable icon keep the violet fill, because iOS paints transparency black and
  Android crops maskable icons edge to edge. The script also fixes a build
  failure — the supplied ICO used a colour type Turbopack refuses to decode
- `src/proxy.ts` **must keep `manifest.webmanifest` out of the session guard**.
  Behind it the manifest came back as the login page's HTML, which silently
  makes the app uninstallable on Android and Windows
- **iPhone launch screens** (2026-09-23): one image per screen size in
  `public/brand/splash/`, rendered by `scripts/build-splash.mjs` and declared by
  `src/app/splash-screens.ts` — keep the two lists in step. They cover the second
  or two a cold Vercel function takes after idle hours. Android derives its own
  from the manifest. `darpe-splash-master.png` is the old violet globe; unused
- **the app is deliberately not offline-capable**: a service worker caching a
  scheduling tool is a way to show somebody last week's calendar

Real data (imported 2026-09-12 from DARPE's register workbook):
- teachers' languages are exactly the list Ian supplied on 2026-09-12; a teacher who
  wants another language adds it themselves
- students, their register payments and the HORARIOS weekly timetable were imported
  by `scripts/import-excel.ts` (fed by `scripts/dump-excel.py`, which needs Python
  with `openpyxl`). **`scripts/` is git-ignored**, so this tooling exists only on the
  machine it was written on; the report with every decision and open question is
  `private-data/import-excel-report.txt`, also ignored. Slots start on 2026-09-14
  and no classes have been generated from them — that is the calendar's "Generate
  month" button, so staff see the conflict report themselves
- register payments carry a note saying the method was not recorded; amounts ending
  in $60 were recorded as Stripe (the card fee), everything else as transfer. Both
  need confirming with DARPE
- the 2026-09-21 meeting changes were applied by `scripts/meeting-2026-09-21.ts`
  (dry run by default, `--apply` writes; also git-ignored): old slots end on
  2026-09-21 and their replacements start 2026-09-22; Tania removed; Dhanna teaches
  Japanese and took Grupo VI; Grupo VII archived; Grupo IX (Arianne, French, Sat
  09:00–11:00) created; register payments deleted. September and October were then
  generated through the calendar. Several lines of that meeting were ambiguous and
  are listed as questions for DARPE; Jorge and Brayan have no fixed slot on purpose
- HUMANITAS is excluded by design; "ITALIANO" in the timetable names no student
  or group — it is Grupo X (Pagella, Tue and Sat 09:00, still no members), which
  DARPE has yet to confirm
- **Conversation club** is real and new (Ian, 2026-09-22): an open English
  conversation club, with nobody signed up yet. Created as a group with no
  members and **no weekly pattern**, so it is visible and generates nothing until
  staff fill it in. Gabriela Payán is a placeholder teacher they can change.
- the 2026-09-22 workbook (`private-data/registro-2026-09-22.xlsx`, ignored)
  confirmed: Vale and Iván are teachers, Ángel Caballero is Vale's, Jesús Gómez
  is Iván's, and the Diana in Grupo VI is the teacher Diana taking Japanese as
  BENEFIT. Grupo IX had a duplicate Saturday 10:00 pattern from the import beside
  the meeting's 09:00 one; the 10:00 one had generated nothing and was deleted
  (`scripts/fixes-2026-09-22.ts`)

**`pnpm build` runs `prisma generate` first.** The client lives in the ignored
`src/generated/prisma`, and Vercel reuses its cached `node_modules`: on a cached
install the `postinstall` hook is skipped, so the second deploy failed with
"Can't resolve '@/generated/prisma/client'" (2026-09-22). Generating in the build
itself does not depend on the cache. Keep both — `postinstall` is what makes it
appear after a local `pnpm install`.

**Never run `pnpm build` while `pnpm dev` is running.** Both write `.next/`. On
2026-09-14 a build during a dev session left the dev server serving stale CSS:
Ian's iPhone showed the login without its new styles or mascots, while a clean
server rendered the same page correctly in WebKit. Stop dev, build, then start
dev again.

Screenshots for review:
- `pnpm shots` drives the running app with Playwright and writes `.screenshots/`
  (gitignored). Needs `pnpm dev` running and `DARPE_SHOT_EMAIL` /
  `DARPE_SHOT_PASSWORD` in the environment — it signs in through the real form,
  so it captures what staff actually see. Playwright is a devDependency and
  nothing in `src/` imports it.

Testing:
- Vitest (`vitest.config.mts`), run with `pnpm test`
- suites cover pure domain logic without database access: conflicts, lifecycle,
  eligibility, schemas, series and series editing, scheduling, calendar layout, calendar
  return, element ids, trigger focus, dev origins, names, tone, list search
  (`src/lib/search.test.ts`), the dashboard's windows, overdue rule and copy, and money
  (`src/features/finance/money.test.ts` — cents parsing, per-currency totals, teaching
  load)

### Latest verification

All five checks were run on 2026-09-22 against this state and passed (the build
with the dev server stopped):

| Command | Result |
| --- | --- |
| `pnpm lint` | clean, no errors or warnings |
| `pnpm typecheck` | clean, no type errors |
| `pnpm test` | 43 test files, 619 tests passed |
| `pnpm build` | succeeded — 21 routes plus the proxy |
| `pnpm audit --prod` | no known vulnerabilities |

`pnpm shots` also captures the login screen and now covers the calendar and
settings at both widths, so a change to either is reviewable without a browser.

Re-run these rather than trusting this table after any code change; it is a snapshot, not a
standing guarantee.

The next feature should be determined from the project's actual requirements and current repository state.

Do not assume the next feature solely from previous conversation context.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
