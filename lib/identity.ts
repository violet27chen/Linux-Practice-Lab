import { auth } from "@/auth";
import { db } from "@/db";
import { and, eq, or, sql } from "drizzle-orm";
import {
  userSandbox,
  users,
  classes,
  classMembers,
  type UserRow,
} from "@/db/schema";

export interface CurrentUser extends UserRow {}

/** Resolve the logged-in user row (with role), or null if anonymous/db-off. */
export async function currentUser(): Promise<CurrentUser | null> {
  const uid = await resolveUserId();
  if (!uid || !db) return null;
  const rows = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  return rows[0] ?? null;
}

export interface DbSandbox {
  sandboxId: string;
  cwd: string;
}

/**
 * Resolve the logged-in user id from the Auth.js session, or `null` when the
 * request is anonymous or auth is not configured. Never throws — auth failures
 * degrade to anonymous mode.
 */
export async function resolveUserId(): Promise<number | null> {
  try {
    const session = await auth();
    const uid = (session as { userId?: number }).userId;
    return typeof uid === "number" ? uid : null;
  } catch {
    return null;
  }
}

/** Load a logged-in user's persisted sandbox (null if none / db off). */
export async function getDbSandbox(userId: number): Promise<DbSandbox | null> {
  if (!db) return null;
  const rows = await db
    .select()
    .from(userSandbox)
    .where(eq(userSandbox.userId, userId))
    .limit(1);
  return rows[0]
    ? { sandboxId: rows[0].sandboxId, cwd: rows[0].cwd }
    : null;
}

/** Persist (upsert) a user's sandbox id + cwd. No-op when db is off. */
export async function saveDbSandbox(
  userId: number,
  sandboxId: string,
  cwd: string,
): Promise<void> {
  if (!db) return;
  await db
    .insert(userSandbox)
    .values({ userId, sandboxId, cwd })
    .onConflictDoUpdate({
      target: userSandbox.userId,
      set: { sandboxId, cwd, updatedAt: new Date() },
    });
}

/**
 * Resolve the user's currently active class (a class they are a member of that
 * is `active` and not yet past `endsAt`). Used as the gate for allocating a
 * machine. Returns `{ classId, endsAt }` or `null` when there is none.
 */
export async function getActiveClassForUser(
  userId: number,
): Promise<{ classId: number; endsAt: number | null } | null> {
  if (!db) return null;
  // A user is in an active class if they are a member of one OR they are the
  // teacher who owns one. Both cases grant a sandbox while the class is live.
  const memberRows = await db
    .select({ classId: classMembers.classId })
    .from(classMembers)
    .where(eq(classMembers.userId, userId));
  const memberIds = memberRows.map((r) => r.classId);

  const rows = await db
    .select({
      classId: classes.id,
      endsAt: classes.endsAt,
      status: classes.status,
    })
    .from(classes)
    .where(
      and(
        eq(classes.status, "active"),
        or(
          eq(classes.teacherId, userId),
          memberIds.length > 0
            ? sql`${classes.id} in ${memberIds}`
            : sql`1 = 0`,
        ),
      ),
    );
  const now = Date.now();
  const live = rows.filter(
    (r) => !r.endsAt || new Date(r.endsAt).getTime() > now,
  );
  if (live.length === 0) return null;
  live.sort(
    (a, b) =>
      new Date(b.endsAt ?? 0).getTime() - new Date(a.endsAt ?? 0).getTime(),
  );
  return {
    classId: live[0].classId,
    endsAt: live[0].endsAt ? new Date(live[0].endsAt).getTime() : null,
  };
}
