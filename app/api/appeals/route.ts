import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { activityLog, appeals, complaints } from "../../../db/schema";
import { currentUser } from "../../lib/auth";

function appealNumber() {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  const random = Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .toUpperCase()
    .slice(0, 8);
  return `AP-${new Date().getUTCFullYear()}-${random.slice(0, 4)}-${random.slice(4)}`;
}

/** Appeals belonging to the signed-in citizen, newest first. */
export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const rows = await getDb()
    .select({
      appealNumber: appeals.appealNumber,
      reason: appeals.reason,
      status: appeals.status,
      stage: appeals.stage,
      officer: appeals.officer,
      createdAt: appeals.createdAt,
      issueNumber: complaints.issueNumber,
      category: complaints.category,
      department: complaints.department,
    })
    .from(appeals)
    .leftJoin(complaints, eq(complaints.id, appeals.complaintId))
    .where(eq(appeals.userId, user.id))
    .orderBy(desc(appeals.id));
  return Response.json({ appeals: rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  try {
    const body = (await request.json()) as { issueNumber?: string; reason?: string };
    const reason = (body.reason || "").trim();
    if (reason.length < 10) {
      return Response.json(
        { error: "Briefly explain what is still wrong." },
        { status: 400 },
      );
    }
    const db = getDb();
    const [complaint] = await db
      .select()
      .from(complaints)
      .where(eq(complaints.issueNumber, (body.issueNumber || "").toUpperCase()))
      .limit(1);
    if (!complaint) {
      return Response.json({ error: "That grievance was not found." }, { status: 404 });
    }

    const [record] = await db
      .insert(appeals)
      .values({
        appealNumber: appealNumber(),
        complaintId: complaint.id,
        userId: user.id,
        reason: reason.slice(0, 2000),
      })
      .returning();
    await db.insert(activityLog).values({
      userId: user.id,
      action: "Appeal filed",
      detail: `${record.appealNumber} against ${complaint.issueNumber}`,
    });
    return Response.json({ appeal: record }, { status: 201 });
  } catch {
    return Response.json({ error: "Could not file the appeal." }, { status: 500 });
  }
}
