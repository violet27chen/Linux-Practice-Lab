import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";

// A user is created on first GitHub sign-in. The first user to register becomes
// the teacher; everyone after is a student. Role can later be promoted manually.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  githubId: text("github_id").notNull().unique(),
  email: text("email"),
  name: text("name"),
  image: text("image"),
  role: text("role").notNull().default("student"), // "student" | "teacher"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Persisted sandbox for a logged-in user, so their environment survives cookie
// clears / device switches. If the stored sandbox has expired, routes recreate
// it transparently (same 410 self-heal used for anonymous sessions).
export const userSandbox = pgTable("user_sandbox", {
  userId: integer("user_id").primaryKey().references(() => users.id),
  sandboxId: text("sandbox_id").notNull(),
  cwd: text("cwd").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Per-lesson completion, replacing the old localStorage `lp_done` for logged-in
// users so progress is attributable and visible to teachers.
export const userProgress = pgTable(
  "user_progress",
  {
    userId: integer("user_id").notNull().references(() => users.id),
    lessonId: text("lesson_id").notNull(),
    done: boolean("done").notNull().default(false),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.lessonId] }),
  }),
);

// A class created by a teacher. Students join with the share `code` (which also
// acts as the access key that authorizes a machine). A class is `draft` until the
// teacher opens it (`active`); `durationMin` drives each member's sandbox lifetime
// and `endsAt` is when the sandbox is reclaimed. `task` is the teacher-authored
// prompt and `answerCmd` is the shell command used to auto-grade it.
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  durationMin: integer("duration_min").notNull().default(90),
  task: text("task").notNull().default(""),
  answerCmd: text("answer_cmd").notNull().default(""),
  status: text("status").notNull().default("draft"), // "draft" | "active" | "ended"
  startedAt: timestamp("started_at"),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const classMembers = pgTable(
  "class_members",
  {
    classId: integer("class_id").notNull().references(() => classes.id),
    userId: integer("user_id").notNull().references(() => users.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.classId, t.userId] }),
  }),
);

// Per-student completion of a class task. `done` is set when the student's
// sandbox passes the class `answerCmd` (auto-graded). Replaces the old
// fixed-lesson assignment model.
export const classSubmissions = pgTable(
  "class_submissions",
  {
    classId: integer("class_id").notNull().references(() => classes.id),
    userId: integer("user_id").notNull().references(() => users.id),
    done: boolean("done").notNull().default(false),
    verifiedAt: timestamp("verified_at"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.classId, t.userId] }),
  }),
);

export type UserRow = typeof users.$inferSelect;
