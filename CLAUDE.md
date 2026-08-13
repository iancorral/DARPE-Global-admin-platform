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

## Current Core Domain

The current MVP domain includes:

- Profile
- Teacher
- Student
- Language
- ScheduleSlot
- ClassSession
- ClassParticipant

Teachers:
- can teach multiple languages
- currently do not log in
- can be active/inactive

Students:
- can have different teachers over time or in special cases
- have a status of TRIAL, ACTIVE, PAUSED or ARCHIVED
- recurring schedules are represented through ScheduleSlot

Classes:
- can currently be individual
- group classes are a future requirement and are not yet represented by ScheduleSlot
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
- Monday through Saturday
- teacher filter
- sessions positioned according to their actual time and duration
- overlapping sessions are displayed side-by-side
- cancelled sessions remain visible but visually distinct

Sunday schedules are supported by the data model and generation logic, even though the current visual calendar does not display a Sunday column.

Do not replace the current calendar implementation with a calendar library unless a real requirement makes it necessary.

## Business Rules Still Evolving

Do not invent business rules when requirements are unclear.

Known business context:
- teachers and the client organization agree on availability/schedules
- internal staff organize the final schedule
- Google Calendar is currently used operationally
- classes may be rescheduled or cancelled
- individual and group classes exist in the business, but group recurring classes are not yet implemented
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
- group-class architecture
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

Last shipped work: `feat: add class completion and attendance recording` (commit `17e75a2`).

Scheduling:
- recurring ScheduleSlots
- slot validity windows
- monthly session generation
- idempotent generation
- teacher conflict detection
- rescheduling
- cancellation
- restoration with conflict validation
- interactive weekly calendar
- teacher filtering
- timezone-aware session positioning

Class lifecycle:
- class completion
- per-participant attendance recording (PRESENT / ABSENT / LATE / EXCUSED)
- status transition validation in `src/features/sessions/lifecycle.ts`
- scheduling edits locked on completed and cancelled classes
- completed classes still occupy the teacher's time; cancelled classes do not

Testing:
- Vitest is installed and configured (`vitest.config.mts`), run with `pnpm test`
- current suites cover pure domain logic without database access:
  `src/features/sessions/conflicts.test.ts` and `src/features/sessions/lifecycle.test.ts`

### Latest verification

All four checks were run on 2026-08-13 against this state and passed:

| Command | Result |
| --- | --- |
| `pnpm lint` | clean, no errors or warnings |
| `pnpm typecheck` | clean, no type errors |
| `pnpm test` | 2 test files, 14 tests passed |
| `pnpm build` | succeeded — Next.js 16.2.10, 11 routes generated |

Re-run these rather than trusting this table after any code change; it is a snapshot, not a
standing guarantee.

The next feature should be determined from the project's actual requirements and current repository state.

Do not assume the next feature solely from previous conversation context.