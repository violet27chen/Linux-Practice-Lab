import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Auth.js (NextAuth v5, beta) configured for GitHub OAuth only.
 *
 * Session strategy is JWT — Auth.js stores no session in the DB. On sign-in we
 * upsert a `users` row (first registrant becomes the teacher) and stash the
 * numeric `userId` + `role` into the JWT, so every server route can read them
 * from `auth()` without a DB lookup. All teaching data lives in our own Neon
 * tables, not Auth.js's optional adapter.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!db) return true; // anonymous mode: skip DB upsert
      await ensureSchema();
      const githubId = String((user as { id?: string }).id ?? user.email ?? "");
      if (!githubId) return true;
      // First user in the database is promoted to teacher.
      const existing = await db.select({ id: users.id }).from(users).limit(1);
      const role = existing.length === 0 ? "teacher" : "student";
      await db
        .insert(users)
        .values({
          githubId,
          email: user.email,
          name: user.name,
          image: user.image,
          role,
        })
        .onConflictDoNothing({ target: users.githubId });
      return true;
    },
    async jwt({ token, user, account }) {
      if (account && user && db) {
        const githubId = String((user as { id?: string }).id ?? user.email ?? "");
        const rows = await db
          .select()
          .from(users)
          .where(eq(users.githubId, githubId))
          .limit(1);
        if (rows[0]) {
          token.uid = rows[0].id;
          token.role = rows[0].role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) {
        (session as { userId?: number }).userId = token.uid as number;
        (session as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
