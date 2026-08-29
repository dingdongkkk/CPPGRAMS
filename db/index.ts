import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Postgres connection strings are URLs, so a password containing `@`, `/`,
 * `#` or `?` splits the string at the wrong place and fails to parse. People
 * paste these straight out of a provider dashboard all the time, so rather
 * than reject the value, re-encode the password segment and try again.
 */
function normalizeConnectionString(raw: string) {
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");

  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    // Split on the LAST "@" so an "@" inside the password does not confuse
    // the host boundary, then percent-encode whatever sat in the password.
    const match = trimmed.match(/^([a-zA-Z][\w+.-]*:\/\/)([^:/@]+):(.*)@([^@]+)$/);
    if (match) {
      const [, scheme, user, password, hostAndPath] = match;
      const repaired = `${scheme}${user}:${encodeURIComponent(password)}@${hostAndPath}`;
      try {
        new URL(repaired);
        return repaired;
      } catch {
        /* fall through to the error below */
      }
    }
    // Structure only — never the value. Enough to tell "they pasted just the
    // password" apart from "the password has an odd character in it".
    console.error(
      "[db] DATABASE_URL shape |",
      "length:", trimmed.length,
      "| starts with postgresql://:", trimmed.startsWith("postgresql://"),
      "| starts with postgres://:", trimmed.startsWith("postgres://"),
      "| has '@':", trimmed.includes("@"),
      "| has '://':", trimmed.includes("://"),
      "| has brackets:", /[[\]]/.test(trimmed),
      "| has whitespace:", /\s/.test(trimmed),
    );
    throw new Error(
      "DATABASE_URL is not a valid Postgres connection string. Expected " +
        "postgresql://USER:PASSWORD@HOST:PORT/DATABASE — check that the value " +
        "is the whole string, with no surrounding [square brackets].",
    );
  }
}

let client: ReturnType<typeof postgres> | undefined;

/**
 * Postgres over Supabase's transaction pooler.
 *
 * Serverless functions get recycled constantly, so every invocation would
 * otherwise open its own backend connection and exhaust the database's limit.
 * The pooler hands out short-lived transaction-scoped connections instead,
 * which means `prepare` must be off — pgbouncer in transaction mode cannot
 * carry a prepared statement across connections.
 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add the Postgres connection string in Vercel project settings, or .env.local for development.",
    );
  }

  client ??= postgres(normalizeConnectionString(url), { prepare: false, max: 1 });
  return drizzle(client, { schema });
}
