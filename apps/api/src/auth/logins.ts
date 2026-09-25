import { and, eq, isNull, ne } from 'drizzle-orm';

import { schema } from '@dahab/db';
import type { Database } from '@dahab/db';

/**
 * The pieces every place that makes or changes a login needs: whether a
 * sign-in name is already somebody else's, and ending a person's sessions.
 *
 * Used by the operator dashboard (an owner making a login for a guide, anyone
 * changing their own) and by Sky Eye (making a centre's logins, resetting a
 * forgotten password), so the two cannot disagree about what "taken" means.
 */

export type LoginField = 'username' | 'email' | 'phone';

/**
 * The first of these that already belongs to another account, or null.
 * `exceptUserId` is the account being edited, which may of course keep its
 * own name.
 */
export async function takenLoginField(
  db: Database,
  wanted: {
    readonly username?: string | null | undefined;
    readonly email?: string | null | undefined;
    readonly phone?: string | null | undefined;
  },
  exceptUserId?: string,
): Promise<LoginField | null> {
  for (const field of ['username', 'email', 'phone'] as const) {
    const value = wanted[field];
    if (value === undefined || value === null) continue;
    const column = schema.users[field];
    const [row] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(and(eq(column, value), ...(exceptUserId === undefined ? [] : [ne(schema.users.id, exceptUserId)])))
      .limit(1);
    if (row !== undefined) return field;
  }
  return null;
}

/**
 * Ends every live session of a person, except the one named. After a password
 * changes, a device that knew the old one must not stay signed in.
 */
export async function endSessions(db: Database, userId: string, now: Date, keepSessionId?: string): Promise<void> {
  await db
    .update(schema.sessions)
    .set({ revokedAt: now })
    .where(
      and(
        eq(schema.sessions.userId, userId),
        isNull(schema.sessions.revokedAt),
        ...(keepSessionId === undefined ? [] : [ne(schema.sessions.id, keepSessionId)]),
      ),
    );
}
