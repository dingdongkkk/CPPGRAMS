import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Neon over HTTP: one round trip per query and no connection pool to exhaust,
 * which is what serverless functions need. Replaces the Cloudflare D1 binding
 * the app used before, since D1 only exists inside a Worker.
 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add a Postgres connection string to the environment (Vercel project settings, or .env.local for development).",
    );
  }

  return drizzle(neon(url), { schema });
}
