import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { activityLog, users } from "../../../../db/schema";
import {
  createSession,
  hashPassword,
  isEmail,
  normalizeEmail,
  passwordProblem,
  sessionCookie,
} from "../../../lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = normalizeEmail(body.email || "");
    const password = body.password || "";
    if (!isEmail(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    const problem = passwordProblem(password);
    if (problem) return Response.json({ error: problem }, { status: 400 });

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    // The email must already be proven; otherwise anyone could claim an address.
    if (!user || !user.emailVerified) {
      return Response.json({ error: "Verify your email first." }, { status: 403 });
    }
    if (user.passwordHash) {
      return Response.json({ error: "This account already has a password." }, { status: 409 });
    }

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(password) })
      .where(eq(users.id, user.id));
    await db.insert(activityLog).values({ userId: user.id, action: "Account created" });

    const { token } = await createSession(user.id);
    return Response.json(
      { ok: true, user: { id: user.id, email: user.email, fullName: user.fullName } },
      { headers: { "Set-Cookie": sessionCookie(token) } },
    );
  } catch {
    return Response.json({ error: "Could not complete registration." }, { status: 500 });
  }
}
