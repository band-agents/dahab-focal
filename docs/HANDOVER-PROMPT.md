You are picking up an in-progress project called **Dahab Focal** — a services
marketplace for Dahab, South Sinai, Egypt (diving, freediving, snorkelling,
desert safari, kitesurfing, wellness, Bedouin culture, boat trips, courses,
rentals, transfers, photography — experiences, not food).

I have been building it with Claude across several sessions. You have no memory
of them, but the history, every decision and every bug already found is written
down in the repo. **Do not start working until you have read it.**

The repo is at `C:\Users\DANNN\dahab-focal`. The working branch is
`feat/admin-console`, pushed to the private repo `band-agents/dahab-focal` as
PR #1 and not yet merged.

## Read these first, in this order

1. `CLAUDE.md` — the non-negotiables.
2. `docs/HANDOVER-SKYEYE.md` — **the current state of the admin console
   ("Sky Eye") as of 25 Sep.** Where everything is, how to run it, why the
   database sometimes stops answering, the patterns every screen and every
   write follow, the bugs already found, and what is not done.
3. `docs/HANDOVER.md` — the whole project up to 15 Sep: the product, the
   design system, the schema, i18n. Its sections on the admin console are
   out of date; `HANDOVER-SKYEYE.md` replaces them.
4. `docs/CANVAS-FIXES.md` — what the design board still owes.

Then look at `apps/admin/lib/modules.ts` (the map of every module the business
needs, and which exist), `apps/admin/components/console/` (the console's own
components) and `apps/api/src/routers/admin-user-writes.ts` (how a write is
done here).

## Something running in parallel

A **separate chat is building the vendor dashboard** in its own worktree:
`C:\Users\DANNN\dahab-focal-vendor`, branch `feat/vendor-dashboard`. Do not
edit that folder or that branch from here. The files both sides are likely to
touch are `packages/tokens/tokens.json` and the seven
`packages/i18n/messages/*.json`; keep your changes there additive so the
eventual merge is a matter of keeping both.

## Things I want you to carry over

- **Reply to me in Egyptian Arabic, simply.** Code, comments, commit messages
  and docs stay in English.
- **Most of the people using the console are on a phone.** Design and test at
  375px first, then desktop, then Arabic RTL.
- **Speed matters to me.** Measure before changing anything; every database
  round trip is ~75 ms to Ireland, so independent queries run in parallel.
- **Run the console as a production build** (`dahab-admin-prod`) and rebuild
  after changes — dev mode is slow by design and was most of what I once
  called "very slow".
- `pnpm verify` is a gate, not a convenience. Read its output before every
  commit.
- Never lorem ipsum. Real Dahab content only.
- Stop and ask before adding a dependency.
- Tell me plainly when something is not built or not proven. This codebase is
  deliberately honest about that, and I want it kept that way.

## If the database is not answering

It is Supabase free tier, which pauses after 7 days idle. The API's `/health`
says `database: unavailable` and the log says `tenant/user … not found`. Tell
me; I restore it from the dashboard, and it takes about two minutes to come
back. It is not a code bug.

Start by reading those files, then tell me — in Egyptian Arabic — what you
understand the state to be and what you would do first. Do not change any code
until I answer.
