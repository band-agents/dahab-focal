# The API, for Railway, Render, Fly or any other container host.
#
# Build from the REPOSITORY ROOT, not from this directory:
#
#   docker build -f apps/api/Dockerfile -t dahab-api .
#
# The API is a long-lived Node process holding a Postgres pool, which is why
# it is a container rather than a serverless function: a pool per invocation
# would exhaust the database's connection limit long before the traffic
# justified it.
#
# There is no compile step. Node 22 strips the types itself — the same thing
# `pnpm --filter @dahab/api start` does locally — so what runs in production
# is the source in this repository, not a build output that can drift from it.

FROM node:22-alpine AS deps

# corepack pins pnpm to the version in package.json's packageManager field, so
# the lockfile is resolved by the same pnpm that wrote it.
RUN corepack enable

WORKDIR /app

# Only the manifests first, so a change to source code does not invalidate the
# dependency layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/api-contract/package.json ./packages/api-contract/
COPY packages/db/package.json ./packages/db/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/config/package.json ./packages/config/

# `--frozen-lockfile` fails rather than silently resolving something new; a
# deploy that quietly upgrades a dependency is a deploy nobody reviewed.
RUN pnpm install --frozen-lockfile --filter @dahab/api...

FROM node:22-alpine AS runtime

RUN corepack enable
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages

COPY package.json pnpm-workspace.yaml ./
COPY apps/api ./apps/api
COPY packages ./packages

# Not root. A container that is compromised should not also be privileged.
USER node

# Railway and Render both inject PORT; 4000 is the local default and a
# documented fallback rather than a hardcoded port.
ENV PORT=4000
EXPOSE 4000

# The health check the platform polls is the same procedure the console reads,
# so "healthy" means the database answered, not merely that node is running.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>r.json()).then(j=>process.exit(j.result.data.status==='ok'?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--experimental-strip-types", "apps/api/src/index.ts"]
