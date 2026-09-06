import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgres://dahab:dahab@localhost:5432/dahab_focal',
  },
  // PostGIS lives in its own schema; drizzle must not try to manage it.
  schemaFilter: ['public'],
  verbose: true,
  strict: true,
});
