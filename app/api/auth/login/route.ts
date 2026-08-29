import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { activityLog, users } from "../../../../db/schema";
import {
  createSession,
  isEmail,
  normalizeEmail,
  sessionCookie,
  verifyPassword,
} from "../../../lib/auth";

export async function POST(request: Request) {
  // The human check is required for sign-in too, as on the portal.
  if (!(request.headers.get("cookie") || "").includes("jansetu_human=1")) {
    return Response.json({ error: "Complete the security check." }, { status: 403 });
  }
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = normalizeEmail(body.email || "");
    const password = body.password || "";
    if (!isEmail(email) || !password) {
      return Response.json({ error: "Enter your email and password." }, { status: 400 });
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const ok = user ? await verifyPassword(password, user.passwordHash) : false;
    // One message for both cases: revealing which half was wrong tells an
    // attacker whether an address is registered.
    if (!user || !ok) {
      return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
    }

    await db.insert(activityLog).values({ userId: user.id, action: "Signed in" });
    const { token } = await createSession(user.id);
    return Response.json(
      { ok: true, user: { id: user.id, email: user.email, fullName: user.fullName } },
      { headers: { "Set-Cookie": sessionCookie(token) } },
    );
  } catch {
    return Response.json({ error: "Sign-in failed." }, { status: 500 });
  }
}
