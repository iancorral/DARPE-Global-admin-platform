# DARPE Admin Platform

Administrative platform for **DARPE Global**, a language school. It gives the
administrative team a single place to manage teachers, students, recurring schedules
and classes.

Custom software built for one client — not a multi-tenant product.

---

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma 7 |
| Auth | Supabase Auth |
| Validation | Zod + React Hook Form |
| Hosting | Vercel |

---

## Requirements

- Node.js 22 or later
- pnpm (`corepack enable`)
- A Supabase project

---

## Getting started

```bash
git clone https://github.com/iancorral/DARPE-Global-admin-platform.git
cd DARPE-Global-admin-platform
pnpm install
```

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://..."        # Supabase pooled connection (port 6543)
DIRECT_URL="postgresql://..."          # Supabase direct connection (port 5432)
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
```

Both database URLs come from the Supabase dashboard under **Connect → ORM**. The
pooled URL serves application traffic; the direct URL is used for migrations, which
require an unpooled session.

Generate the Prisma client and start the dev server:

```bash
pnpm prisma generate
pnpm dev
```

The app runs at `http://localhost:3000`.

---

## Database

```bash
pnpm prisma migrate dev --name <migration_name>   # apply a schema change
pnpm prisma generate                              # regenerate the client
pnpm prisma db seed                               # seed reference data (languages)
pnpm prisma studio                                # inspect data locally
```

`prisma/schema.prisma` holds the models. Connection URLs live in `prisma.config.ts`,
not in the schema — this changed in Prisma 7.

---

## Project structure

```
src/
├── app/                 Routing only — thin pages that compose features
│   ├── (auth)/          Public routes (login)
│   └── (app)/           Authenticated routes, protected by the shared layout
├── features/            Vertical slices, one folder per domain area
│   └── <feature>/
│       ├── schemas.ts   Zod schemas, shared by client and server
│       ├── queries.ts   Reads (server-only)
│       ├── actions.ts   Writes (server actions)
│       └── components/  UI specific to the feature
├── components/
│   ├── ui/              shadcn components — owned by this project
│   └── shared/          Cross-feature components
├── lib/                 db, auth, env, datetime utilities
└── generated/prisma/    Prisma client output (not committed)
```

Features are organised vertically rather than by technical layer, so everything about
a domain area lives in one place.

---

## Conventions

- **Server Components by default.** `"use client"` only on interactive leaves.
- **Data access is server-only.** `src/lib/db.ts` and every `queries.ts` / `actions.ts`
  import `server-only`, so the build fails if client code reaches for the database.
- **Server Actions follow one order:** authenticate → validate → mutate → revalidate.
  `requireUser()` runs first in every action; middleware protects navigation, not data.
- **Validation is shared.** One Zod schema validates in the browser for UX and again on
  the server for security.
- **Timestamps are stored in UTC** and rendered in the viewer's timezone. Never format
  a business date without passing an explicit timezone — see `src/lib/datetime.ts`.
- **Soft deletes.** Records with history are archived, never removed.
- **Money is stored as integer centavos.** Never floating point.
- Code, comments and identifiers in English. Files kebab-case, components PascalCase.

Visual and interaction guidelines live in [`DESIGN.md`](./DESIGN.md).

---

## Scripts

```bash
pnpm dev      # development server
pnpm build    # production build
pnpm start    # serve the production build
pnpm lint     # lint
```

---

## License

Copyright © 2026 Ian Corral. All rights reserved.

This software was developed for DARPE Global, a language education company that provides personalized online language courses.
