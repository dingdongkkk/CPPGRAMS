import { desc, eq, or } from "drizzle-orm";
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

/** Appeals belonging to the signed-in citizen, or public lookup by appeal/issue number. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = await currentUser(request);
  const appealQuery = (url.searchParams.get("appeal") || "").trim().toUpperCase();
  const issueQuery = (url.searchParams.get("issue") || "").trim().toUpperCase();

  const db = getDb();

  // 1. Direct Appeal or Issue lookup (Public or authenticated)
  if (appealQuery || issueQuery) {
    const rows = await db
      .select({
        id: appeals.id,
        appealNumber: appeals.appealNumber,
        grounds: appeals.grounds,
        reason: appeals.reason,
        status: appeals.status,
        stage: appeals.stage,
        officer: appeals.officer,
        officerDesignation: appeals.officerDesignation,
        officerEmail: appeals.officerEmail,
        officerPhone: appeals.officerPhone,
        officerOffice: appeals.officerOffice,
        slaDeadline: appeals.slaDeadline,
        createdAt: appeals.createdAt,
        issueNumber: complaints.issueNumber,
        category: complaints.category,
        department: complaints.department,
        location: complaints.location,
        urgency: complaints.urgency,
        complaintStatus: complaints.status,
        complaintOfficer: complaints.officerName,
      })
      .from(appeals)
      .leftJoin(complaints, eq(complaints.id, appeals.complaintId))
      .where(
        appealQuery
          ? eq(appeals.appealNumber, appealQuery)
          : eq(complaints.issueNumber, issueQuery),
      )
      .orderBy(desc(appeals.id));

    if (!rows.length) {
      return Response.json(
        { error: "No appeal record found matching that registration number." },
        { status: 404 },
      );
    }
    return Response.json({ appeal: rows[0], appeals: rows });
  }

  // 2. Logged-in citizen's appeals
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const rows = await db
    .select({
      id: appeals.id,
      appealNumber: appeals.appealNumber,
      grounds: appeals.grounds,
      reason: appeals.reason,
      status: appeals.status,
      stage: appeals.stage,
      officer: appeals.officer,
      officerDesignation: appeals.officerDesignation,
      officerEmail: appeals.officerEmail,
      officerPhone: appeals.officerPhone,
      officerOffice: appeals.officerOffice,
      slaDeadline: appeals.slaDeadline,
      createdAt: appeals.createdAt,
      issueNumber: complaints.issueNumber,
      category: complaints.category,
      department: complaints.department,
      location: complaints.location,
      urgency: complaints.urgency,
      complaintStatus: complaints.status,
    })
    .from(appeals)
    .leftJoin(complaints, eq(complaints.id, appeals.complaintId))
    .where(eq(appeals.userId, user.id))
    .orderBy(desc(appeals.id));

  return Response.json({ appeals: rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "Sign in required to file an appeal." }, { status: 401 });
  try {
    const body = (await request.json()) as {
      issueNumber?: string;
      reason?: string;
      grounds?: string;
    };
    const reason = (body.reason || "").trim();
    if (reason.length < 10) {
      return Response.json(
        { error: "Briefly explain what is still unresolved (minimum 10 characters)." },
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
      return Response.json({ error: "Grievance record not found." }, { status: 404 });
    }

    const slaDeadline = new Date(Date.now() + 30 * 86_400_000).toISOString();

    const [record] = await db
      .insert(appeals)
      .values({
        appealNumber: appealNumber(),
        complaintId: complaint.id,
        userId: user.id,
        grounds: body.grounds || "Unsatisfactory resolution / Departmental delay",
        reason: reason.slice(0, 2000),
        officer: complaint.appellateOfficerName || "Smt. Sunita Verma, IAS",
        officerDesignation: complaint.appellateOfficerDesignation || "Joint Secretary & First Appellate Authority",
        officerEmail: complaint.appellateOfficerEmail || "appellate.authority@darpg.gov.in",
        officerPhone: complaint.appellateOfficerPhone || "+91-11-2338-9900",
        officerOffice: "Appellate Directorate, CGO Complex, Lodhi Road, New Delhi",
        slaDeadline,
        status: "Under Appellate Review",
        stage: 1,
      })
      .returning();

    // Also update complaint stage to reflect appeal active
    await db
      .update(complaints)
      .set({ status: "First Appeal Filed", stage: 5 })
      .where(eq(complaints.id, complaint.id));

    await db.insert(activityLog).values({
      userId: user.id,
      action: "Appeal filed",
      detail: `${record.appealNumber} against ${complaint.issueNumber}`,
    });
    return Response.json({ appeal: record }, { status: 201 });
  } catch (error) {
    console.error("Failed to file appeal", error);
    return Response.json({ error: "Could not file the appeal." }, { status: 500 });
  }
}
