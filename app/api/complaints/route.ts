import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { complaints } from "../../../db/schema";

function normalizeName(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-IN").replace(/\s+/g, " ");
}

async function hashName(value: string) {
  const bytes = new TextEncoder().encode(normalizeName(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function issueNumber() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const random = Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .toUpperCase()
    .slice(0, 10);
  return `JS-${new Date().getUTCFullYear()}-${random.slice(0, 5)}-${random.slice(5)}`;
}

function databaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "Database unavailable";
  return message.includes("no such table")
    ? "Complaint storage is being prepared. Please try again shortly."
    : "Complaint service is temporarily unavailable.";
}

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  if (!cookie.includes("jansetu_human=1") || !cookie.includes("jansetu_digilocker=")) {
    return Response.json({ error: "Verification is required." }, { status: 403 });
  }

  try {
    const payload = (await request.json()) as {
      filerName?: string;
      department?: string;
      category?: string;
      location?: string;
      urgency?: string;
      urgencyReason?: string;
      assignedOfficer?: string;
    };
    const filerName = payload.filerName?.trim().replace(/\s+/g, " ") || "";
    if (
      filerName.length < 2 ||
      !payload.department ||
      !payload.category ||
      !["Critical", "High", "Medium", "Low"].includes(payload.urgency || "") ||
      !payload.assignedOfficer
    ) {
      return Response.json({ error: "Name and complaint details are required." }, { status: 400 });
    }

    const db = getDb();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const number = issueNumber();
        const [record] = await db
          .insert(complaints)
          .values({
            issueNumber: number,
            filerNameHash: await hashName(filerName),
            department: payload.department,
            category: payload.category,
            location: payload.location || "Location not provided",
            urgency: payload.urgency,
            urgencyReason: payload.urgencyReason || "AI urgency assessment completed",
            assignedOfficer: payload.assignedOfficer,
            status: "Assigned to officer",
            stage: 1,
          })
          .returning({ issueNumber: complaints.issueNumber, createdAt: complaints.createdAt });
        return Response.json({ complaint: record }, { status: 201 });
      } catch (error) {
        if (String(error).includes("UNIQUE") && attempt < 2) continue;
        throw error;
      }
    }
    return Response.json({ error: "Could not generate an issue number." }, { status: 503 });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const issue = (url.searchParams.get("issue") || "").trim().toUpperCase();
  const name = normalizeName(url.searchParams.get("name") || "");
  if (!/^JS-\d{4}-[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(issue) || name.length < 2) {
    return Response.json({ error: "Enter a valid issue number and filer name." }, { status: 400 });
  }

  try {
    const db = getDb();
    const [record] = await db
      .select({
        issueNumber: complaints.issueNumber,
        department: complaints.department,
        category: complaints.category,
        location: complaints.location,
        urgency: complaints.urgency,
        urgencyReason: complaints.urgencyReason,
        assignedOfficer: complaints.assignedOfficer,
        status: complaints.status,
        stage: complaints.stage,
        createdAt: complaints.createdAt,
      })
      .from(complaints)
      .where(and(eq(complaints.issueNumber, issue), eq(complaints.filerNameHash, await hashName(name))))
      .limit(1);
    if (!record) {
      return Response.json(
        { error: "No complaint matched that issue number and filer name." },
        { status: 404 },
      );
    }
    return Response.json({ complaint: record });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}
