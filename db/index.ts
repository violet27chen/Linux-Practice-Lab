import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

/**
 * The Postgres client is `null` when DATABASE_URL is not configured. Every DB
 * access in the app guards on `db` so the lab keeps working in anonymous mode
 * (cookie-based sandbox + localStorage progress) until the database is wired up.
 */
export const db = url ? drizzle(neon(url), { schema }) : null;

export const dbEnabled = !!url;
