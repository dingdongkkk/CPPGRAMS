import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { otpCodes, users } from "../../../../db/schema";
import { isEmail, normalizeEmail, sha256 } from "../../../lib/auth";

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; code?: string };
    const email = normalizeEmail(body.email || "");
    const code = (body.code || "").trim();
    if (!isEmail(email) || !/^\d{6}$/.test(code)) {
      return Response.json({ error: "Enter the 6-digit code." }, { status: 400 });
    }

    const db = getDb();
    const [record] = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, "verify_email")))
      .orderBy(desc(otpCodes.id))
      .limit(1);

    if (!record || record.consumed) {
      return Response.json({ error: "Request a new code." }, { status: 400 });
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      return Response.json(
        { error: "Too many attempts. Request a new code." },
        { status: 429 },
      );
    }
    if (new Date(record.expiresAt) < new Date()) {
      return Response.json({ error: "That code has expired." }, { status: 400 });
    }
    if (record.codeHash !== sha256(code)) {
      await db
        .update(otpCodes)
        .set({ attempts: record.attempts + 1 })
        .where(eq(otpCodes.id, record.id));
      return Response.json({ error: "That code is not correct." }, { status: 400 });
    }

    await db.update(otpCodes).set({ consumed: true }).where(eq(otpCodes.id, record.id));
    await db.update(users).set({ emailVerified: true }).where(eq(users.email, email));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Verification failed." }, { status: 500 });
  }
}
