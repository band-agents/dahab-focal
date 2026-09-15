# Deploying

Two pieces, two hosts:

| Piece | Where | Why there |
| --- | --- | --- |
| `apps/api` | Render (or Railway) | A long-lived Node process holding a Postgres pool. A pool per serverless invocation exhausts the connection limit long before the traffic justifies it. |
| `apps/admin` | Vercel | Next.js 15, server-rendered, and it only ever talks to the API over HTTP. |
| Database | Supabase | Already live: project `oggsssfydturfqjynwli`, PostGIS 3.3.7, 59 tables. |

**Honest status:** the configuration below is written and reviewed, and the
API has been exercised end to end locally in production mode. **Neither host
has actually been deployed to yet** — that needs accounts only the owner can
create. Nothing here has been proven against Render's or Vercel's builder, so
expect the first deploy to surface something.

---

## 1. The API, on Render

`render.yaml` at the repository root is a Blueprint. Point a new Blueprint at
the repo and Render creates the service from it.

Everything marked `sync: false` is a secret you set once in the dashboard.
Render never reads a value from the file, and none of these may enter a commit:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The Supabase **session pooler** string, not the direct one. |
| `AUTH_SECRET` | `openssl rand -base64 48`. Rotating it signs every session out at once, which is the intended blast radius. |
| `CORS_ORIGINS` | The browser origins allowed to call the API, comma separated. **The admin console does not need an entry** — it renders on a server. Leave it empty until a browser surface ships. |
| `OTP_TRANSPORT` | A real SMS gateway. The API refuses to start in production while this is `console`, because the console transport prints every one-time code into the log. |

The API **will not boot** if `AUTH_SECRET` is missing or short, if
`DATABASE_URL` is unset in production, or if `OTP_TRANSPORT` is still
`console`. That is deliberate: a process that will not come up is a deploy
that fails loudly, and one that comes up broken is an outage nobody is paged
for.

`healthCheckPath` is `/health`, which is the same procedure the console reads
— so "healthy" means the database answered, not merely that node is running.

**Railway instead:** root directory the repo root, build command
`corepack enable && pnpm install --frozen-lockfile --filter @dahab/api...`,
start command `node --experimental-strip-types apps/api/src/index.ts`. Same
variables.

**A container instead:** `apps/api/Dockerfile`, built from the repository
root — `docker build -f apps/api/Dockerfile -t dahab-api .`. It has not been
built here; this machine has no Docker.

### There is no compile step

Node 22 strips the types itself, which is exactly what `pnpm --filter
@dahab/api start` does locally. What runs in production is the source in this
repository rather than a build output that can drift from it.

---

## 2. The console, on Vercel

Import the repo and set **Root Directory to `apps/admin`**. `vercel.json`
there carries the rest: the install and build commands reach back to the
workspace root, and the response headers are set (`X-Frame-Options: DENY`
matters — the console holds a session cookie and must not be framed).

| Variable | Value |
| --- | --- |
| `DAHAB_API_URL` | The Render service's URL, e.g. `https://dahab-focal-api.onrender.com`. No trailing slash. |

That is the only one. **`DAHAB_ADMIN_TOKEN` is gone** — the console no longer
holds a service credential; every call carries the signed-in operator's own
token, which is what lets the audit log name them.

> The Supabase↔Vercel integration provisions `POSTGRES_URL`, not
> `DATABASE_URL`, and the console does not read the database directly at all.
> Do not wire that integration to the console; it needs `DAHAB_API_URL` and
> nothing else.

---

## 3. The first account

There is no sign-up. Accounts are created from the command line, against
whichever database `DATABASE_URL` points at:

```bash
pnpm staff:create --email you@example.com --role admin
```

The password is read from a muted prompt, or from `STAFF_PASSWORD` in the
environment when there is no TTY. It is never taken from an argument —
anything on a command line lands in shell history and in the process list.

Re-running for an address that already exists sets a new password and clears
any lockout, which is also how a forgotten password is reset while there is no
mail transport to send a link with.

Minimum length is 12 characters and there are no composition rules;
composition requirements measurably push people towards `Password1!` and
towards reuse, which is why NIST dropped them.

---

## 4. Order

1. Deploy the API. Confirm `GET /health` returns `"status":"ok"` and
   `"database":"ok"` — `degraded` means it cannot reach Supabase.
2. `pnpm staff:create` against the production database.
3. Deploy the console with `DAHAB_API_URL` pointing at the API.
4. Open it. You should be redirected to `/en-GB/sign-in`; if you reach a board
   without signing in, stop and do not put the URL anywhere.

---

## What is not covered

- **No custom domain or TLS termination** beyond what the platforms give.
- **No CI.** `pnpm verify` and `pnpm shoot` are run by hand. Both are gates
  and neither currently blocks a deploy.
- **No backups configured** beyond Supabase's own.
- **No rate limiting** in front of the API. Sign-in has a per-account lockout
  (ten tries, fifteen minutes) but nothing limits requests by IP, and a
  hostel's shared connection is one IP and forty travellers — so an IP limit
  needs designing rather than adding.
- **No error tracking.** Logs are structured JSON on stdout and that is all.
