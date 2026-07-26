import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { currentUser } from "@/lib/identity";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  classes,
  classMembers,
  classAssignments,
  users,
} from "@/db/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Create a class (teacher only) or list the current user's classes. */
export async function POST(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (me.role !== "teacher") {
    return NextResponse.json({ error: "teacher only" }, { status: 403 });
  }
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  if (!name) return new NextResponse("Name required", { status: 400 });

  try {
    await ensureSchema();
  } catch {
    /* ignore */
  }
  if (!db) return NextResponse.json({ error: "db off" }, { status: 503 });

  let code = "";
  for (let i = 0; i < 5; i++) {
    code = randomBytes(4).toString("hex");
    try {
      const inserted = await db
        .insert(classes)
        .values({ teacherId: me.id, name, code })
        .returning();
      return NextResponse.json({ ok: true, id: inserted[0].id, code, name });
    } catch {
      // code collision — try again
    }
  }
  return NextResponse.json({ error: "could not allocate code" }, { status: 500 });
}

export async function GET() {
  const me = await currentUser();
  if (!me || !db) return NextResponse.json({ classes: [] });
  try {
    await ensureSchema();
  } catch {
    /* ignore */
  }
  const owned = await db
    .select()
    .from(classes)
    .where(eq(classes.teacherId, me.id))
    .orderBy(desc(classes.createdAt));
  const memberRows = await db
    .select({ classId: classMembers.classId })
    .from(classMembers)
    .where(eq(classMembers.userId, me.id));
  const memberIds = memberRows.map((r) => r.classId);
  const joined =
    memberIds.length > 0
      ? await db
          .select()
          .from(classes)
          .where(sql`${classes.id} in ${memberIds}`)
          .orderBy(desc(classes.createdAt))
      : [];

  const seen = new Set<number>();
  const all = [...owned, ...joined].filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const result = await Promise.all(
    all.map(async (c) => {
      const [m, a] = await Promise.all([
        db!
          .select({ count: sql<number>`count(*)` })
          .from(classMembers)
          .where(eq(classMembers.classId, c.id)),
        db!
          .select({ count: sql<number>`count(*)` })
          .from(classAssignments)
          .where(eq(classAssignments.classId, c.id)),
      ]);
      return {
        id: c.id,
        name: c.name,
        code: c.code,
        role: c.teacherId === me.id ? "teacher" : "member",
        memberCount: Number(m[0]?.count ?? 0),
        assignmentCount: Number(a[0]?.count ?? 0),
      };
    }),
  );

  return NextResponse.json({ classes: result });
}
