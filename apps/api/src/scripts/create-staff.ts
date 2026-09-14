import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { eq } from 'drizzle-orm';

import { MIN_PASSWORD_LENGTH, roleSchema, type Role } from '@dahab/api-contract';
import { createDatabase, schema } from '@dahab/db';

import { hashPassword } from '../auth/password.ts';

/**
 * Creates or updates a staff account that can sign in to the console.
 *
 *   pnpm staff:create --email you@example.com --role admin
 *
 * The password is read from a prompt with echo off, or from STAFF_PASSWORD.
 * It is never taken from an argument: anything on a command line lands in the
 * shell history, in the process list, and in any CI log that echoes its own
 * commands.
 *
 * Re-running for an existing address sets a new password rather than failing,
 * which is also how a forgotten one is reset while there is no email
 * transport to send a link with.
 */

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    role: { type: 'string', default: 'admin' },
    vendor: { type: 'string' },
  },
});

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const email = values.email?.trim().toLowerCase();
if (email === undefined || !email.includes('@')) {
  fail('Usage: pnpm staff:create --email you@example.com [--role admin] [--vendor <uuid>]');
}

const parsedRole = roleSchema.safeParse(values.role);
if (!parsedRole.success) {
  fail(`--role must be one of: ${roleSchema.options.join(', ')}`);
}
const role: Role = parsedRole.data;

if ((role === 'vendorOwner' || role === 'vendorStaff') && values.vendor === undefined) {
  fail('A vendor role needs --vendor <uuid>: the role is meaningless without one.');
}

async function readPassword(): Promise<string> {
  const fromEnv = process.env['STAFF_PASSWORD'];
  if (fromEnv !== undefined && fromEnv !== '') return fromEnv;

  if (!process.stdin.isTTY) {
    fail('No TTY to prompt on. Set STAFF_PASSWORD in the environment instead.');
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  // Echo off, so the password does not end up on a shared screen or in a
  // terminal scrollback that gets pasted into a chat later.
  const output = process.stdout as NodeJS.WriteStream & { muted?: boolean };
  const write = output.write.bind(output);
  let muted = false;
  output.write = ((chunk: string | Uint8Array, ...rest: unknown[]) =>
    muted ? true : write(chunk as string, ...(rest as []))) as typeof output.write;

  try {
    const promise = rl.question(`Password for ${email} (at least ${MIN_PASSWORD_LENGTH} chars): `);
    muted = true;
    const answer = await promise;
    muted = false;
    write('\n');
    return answer;
  } finally {
    muted = false;
    output.write = write;
    rl.close();
  }
}

const password = await readPassword();
if (password.length < MIN_PASSWORD_LENGTH) {
  fail(`That password is ${password.length} characters; the minimum is ${MIN_PASSWORD_LENGTH}.`);
}

const { db, close } = createDatabase();

try {
  const passwordHash = await hashPassword(password);
  const now = new Date();

  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  let userId: string;
  if (existing === undefined) {
    const [created] = await db
      .insert(schema.users)
      .values({
        email,
        // Staff are created by this script, not by a sign-up form, so the
        // address is trusted the moment it is typed here.
        emailVerifiedAt: now,
        passwordHash,
        passwordUpdatedAt: now,
        isGuest: false,
      })
      .returning({ id: schema.users.id });
    if (created === undefined) throw new Error('The user row was not written.');
    userId = created.id;
    process.stdout.write(`Created ${email}\n`);
  } else {
    userId = existing.id;
    await db
      .update(schema.users)
      .set({
        passwordHash,
        passwordUpdatedAt: now,
        // A password reset clears the lockout; otherwise the person who just
        // proved who they are still cannot get in.
        failedSignInCount: 0,
        lockedUntil: null,
        updatedAt: now,
      })
      .where(eq(schema.users.id, userId));
    process.stdout.write(`Updated the password for ${email}\n`);
  }

  await db
    .insert(schema.userRoles)
    .values({ userId, role, vendorId: values.vendor ?? null })
    .onConflictDoNothing();

  await db
    .insert(schema.userPreferences)
    .values({ userId })
    .onConflictDoNothing();

  process.stdout.write(`Role: ${role}${values.vendor === undefined ? '' : ` (${values.vendor})`}\n`);
} finally {
  await close();
}
