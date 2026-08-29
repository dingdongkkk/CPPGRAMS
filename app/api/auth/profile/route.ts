import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { activityLog, sessions, users } from "../../../../db/schema";
import {
  clearSessionCookie,
  currentUser,
  hashPassword,
  passwordProblem,
  verifyPassword,
} from "../../../lib/auth";

/** Edit profile. */
export async function PATCH(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  try {
    const b = (await request.json()) as Record<string, string | undefined>;
    const clean = (v: string | undefined, max: number) => (v ?? "").trim().slice(0, max);
    await getDb()
      .update(users)
      .set({
        fullName: clean(b.fullName, 120),
        gender: clean(b.gender, 20),
        country: clean(b.country, 60) || "India",
        address: clean(b.address, 240),
        mobile: clean(b.mobile, 20),
        phone: clean(b.phone, 20),
      })
      .where(eq(users.id, user.id));
    await getDb().insert(activityLog).values({ userId: user.id, action: "Profile updated" });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not update your profile." }, { status: 500 });
  }
}

/** Change password. */
export async function PUT(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  try {
    const b = (await request.json()) as { current?: string; next?: string };
    const db = getDb();
    const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!row || !(await verifyPassword(b.current || "", row.passwordHash))) {
      return Response.json({ error: "Current password is incorrect." }, { status: 403 });
    }
    const problem = passwordProblem(b.next || "");
    if (problem) return Response.json({ error: problem }, { status: 400 });

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(b.next as string) })
      .where(eq(users.id, user.id));
    // Changing a password invalidates every other session, which is the
    // point of changing it after a suspected compromise.
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    await db.insert(activityLog).values({ userId: user.id, action: "Password changed" });
    return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
  } catch {
    return Response.json({ error: "Could not change your password." }, { status: 500 });
  }
}

/** Delete account. Complaints are kept but unlinked, since a filed
 *  grievance is a public record the citizen no longer owns privately. */
export async function DELETE(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  await db.delete(activityLog).where(eq(activityLog.userId, user.id));
  await db.delete(users).where(eq(users.id, user.id));
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
}
