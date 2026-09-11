You are picking up an in-progress project called **Dahab Focal** — a services
marketplace for Dahab, South Sinai, Egypt (diving, freediving, snorkelling,
desert safari, kitesurfing, wellness, Bedouin culture, boat trips, courses,
rentals, transfers, photography — experiences, not food).

I have been building it with Claude across three sessions. You have no memory of
them, but the entire history, every decision, and every bug already found is
written down in the repo. **Do not start working until you have read it.**

The repo is at `C:\Users\DANNN\dahab-focal`. The working branch is
`feat/admin-console`, 22 commits ahead of `master`, pushed to the private repo
`band-agents/dahab-focal` as PR #1.

## Read these first, in this order

1. `docs/HANDOVER.md` — **start here.** Written specifically for you. It is the
   map: what the product is, where everything lives, what happened in each
   session, the exact design values, the architecture, the rules that bite, every
   bug already produced, what is real versus fixtures, and the one blocker.
2. `CLAUDE.md` — the non-negotiables.
3. `docs/FOUNDATION.md` — sessions 1 and 2: the backend packages and the design
   import, with every judgment call recorded.
4. `docs/SESSION-ADMIN-VENDOR.md` — session 3: the two dashboards.
5. `docs/CANVAS-FIXES.md` — what the design board still owes. Read its status
   banner first; sections 1 and 3 are done and not the way the file proposes.

Then look at the code itself — `packages/tokens/tokens.json`,
`packages/api-contract/src/pricing/compute.ts`, `apps/admin/lib/api.ts` and
`apps/vendor/src/pricing.ts` are the four files that explain the most.

The design system lives outside the repo, in `C:\Users\DANNN\Downloads`:
`Dahab Focal - Design System.html` (revision v3, the design of record) and
`Dahab Focal - Board 03 Home.html` (the approved traveller Home board, which the
mark generator reads). The Claude Design project itself is read-only from a code
session, so design changes are delivered as prompts I paste in myself — there
are five of those in `docs/`.

## Things I want you to carry over

- **Reply to me in Egyptian Arabic, simply.** Code, comments, commit messages
  and docs stay in English.
- `pnpm verify` and `pnpm shoot` are gates, not conveniences. Run them at the end
  of every session and **read their output before committing** — a broken commit
  was pushed once already because that did not happen.
- Never lorem ipsum. Real Dahab content only — the dive sites, the
  neighbourhoods, the seeded operators.
- Stop and ask before adding a dependency.
- If the design board is missing a value, flag it as an open question and use an
  obviously provisional placeholder. Never a plausible guess.
- Tell me plainly when something is fixtures rather than real. This codebase is
  deliberately honest about what it has not proven, and I want it kept that way.

## Where it stands

228 tests across 11 packages, both gates passing. The admin console has all
eight screens and the vendor app has five, but **seven of the eight admin screens
still read hand-written fixtures, nothing writes, and there is no
authentication** — anyone with the URL is in.

**The one blocker is mine, not yours:** there is no database yet. The schema has
never been applied to a live Postgres, because this machine has no Docker, psql,
WSL or admin rights. I need to create a Neon or Supabase project, run
`CREATE EXTENSION IF NOT EXISTS postgis;`, and put the connection string in
`.env` as `DATABASE_URL`. Once I give you that, the next steps are
`pnpm db:migrate && pnpm db:seed`, then auth, then the writes, then the
remaining screens onto the API.

Start by reading `docs/HANDOVER.md`, then tell me — in Egyptian Arabic — what you
understand the state to be and what you would do first. Do not change any code
until I answer.
