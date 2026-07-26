import { auth } from "@/auth";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { userSandbox, users, type UserRow } from "@/db/schema";

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
