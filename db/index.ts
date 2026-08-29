import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | undefined;

/**
 * Postgres over Supabase's transaction pooler.
 *
 * Serverless functions get recycled constantly, so every invocation would
 * otherwise open its own backend connection and exhaust the database's limit.
 * The pooler hands out short-lived transaction-scoped connections instead,
 * which means `prepare` must be off — pgbouncer in transaction mode cannot
 * carry a prepared statement across connections.
 *
 * The client is cached on the module so warm invocations reuse it.
 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add the Supabase transaction-pooler connection string in Vercel project settings, or .env.local for development.",
    );
  }

  client ??= postgres(url, { prepare: false, max: 1 });
  return drizzle(client, { schema });
}
