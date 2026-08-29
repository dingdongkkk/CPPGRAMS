import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { activityLog } from "../../../db/schema";
import { currentUser } from "../../lib/auth";

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const rows = await getDb()
    .select()
    .from(activityLog)
    .where(eq(activityLog.userId, user.id))
    .orderBy(desc(activityLog.id))
    .limit(50);
  return Response.json({ activity: rows }, { headers: { "Cache-Control": "no-store" } });
}
