import { sql } from "drizzle-orm";
import { db } from "./index";

let ensured = false;

/**
 * Idempotently create all tables. Runs at most once per server instance, and is
 * a no-op when the database is not configured. Keeps the app deployable without
 * a separate migration step.
 */
export async function ensureSchema(): Promise<void> {
  if (!db || ensured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id serial PRIMARY KEY,
      github_id text NOT NULL UNIQUE,
      email text,
      name text,
      image text,
      role text NOT NULL DEFAULT 'student',
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_sandbox (
      user_id integer PRIMARY KEY REFERENCES users(id),
      sandbox_id text NOT NULL,
      cwd text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_progress (
      user_id integer NOT NULL REFERENCES users(id),
      lesson_id text NOT NULL,
      done boolean NOT NULL DEFAULT false,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, lesson_id)
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS classes (
      id serial PRIMARY KEY,
      teacher_id integer NOT NULL REFERENCES users(id),
      name text NOT NULL,
      code text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS class_members (
      class_id integer NOT NULL REFERENCES classes(id),
      user_id integer NOT NULL REFERENCES users(id),
      PRIMARY KEY (class_id, user_id)
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS class_assignments (
      class_id integer NOT NULL REFERENCES classes(id),
      lesson_id text NOT NULL,
      PRIMARY KEY (class_id, lesson_id)
    );
  `);
  ensured = true;
}
