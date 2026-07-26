import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { currentUser } from "@/lib/identity";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  classes,
  classMembers,
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
  let body: { name?: string; durationMin?: number };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  if (!name) return new NextResponse("Name required", { status: 400 });

  // Validate duration (1..1440 min). Out-of-range values fall back to default.
  let durationMin = 90;
  const reqDur = Number(body.durationMin);
  if (Number.isFinite(reqDur) && reqDur >= 1 && reqDur <= 1440) {
    durationMin = Math.round(reqDur);
  }

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
        .values({ teacherId: me.id, name, code, durationMin })
        .returning();
      return NextResponse.json({
        ok: true,
        id: inserted[0].id,
        code,
        name,
        durationMin,
      });
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
      const [m] = await Promise.all([
        db!
          .select({ count: sql<number>`count(*)` })
          .from(classMembers)
          .where(eq(classMembers.classId, c.id)),
      ]);
      return {
        id: c.id,
        name: c.name,
        code: c.code,
        role: c.teacherId === me.id ? "teacher" : "member",
        memberCount: Number(m[0]?.count ?? 0),
        durationMin: c.durationMin,
        status: c.status,
        task: c.task,
        startedAt: c.startedAt ? c.startedAt.getTime() : null,
        endsAt: c.endsAt ? c.endsAt.getTime() : null,
      };
    }),
  );

  return NextResponse.json({ classes: result });
}
