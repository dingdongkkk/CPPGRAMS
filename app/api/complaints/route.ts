import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { complaints } from "../../../db/schema";

type JourneyUpdate = {
  title: string;
  detail: string;
  date: string;
  done: boolean;
  icon: string;
};

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
  // Postgres phrases a missing table as `relation "..." does not exist`,
  // where D1/SQLite said `no such table`. Both are matched so the friendlier
  // "being prepared" message still shows before migrations have run.
  const missingTable =
    /no such table/i.test(message) || /relation .* does not exist/i.test(message);
  return missingTable
    ? "Complaint storage is being prepared. Please try again shortly."
    : "Complaint service is temporarily unavailable.";
}

function buildJourney(category: string, department: string, location: string, seed: number): JourneyUpdate[] {
  const text = `${category} ${department}`.toLowerCase();
  const water = /water|irrigation|drain|flood|canal/.test(text);
  const roads = /road|pothole|bridge|street|traffic/.test(text);
  const power = /power|electric|electricity|transformer/.test(text);
  const inspection = water
    ? `A field crew will inspect the supply line, pump, or canal near ${location}.`
    : roads
      ? `The junior engineer will mark the location for a site inspection near ${location}.`
      : power
        ? `The maintenance team will inspect the feeder or transformer serving ${location}.`
        : `The concerned field officer will verify the reported issue near ${location}.`;
  const action = water
    ? "A water-works team has been assigned to clear the obstruction and restore flow."
    : roads
      ? "A repair crew has been assigned with material to make the location safe."
      : power
        ? "A line-maintenance crew has been assigned to inspect and repair the fault."
        : "A field team has been assigned to carry out the department's corrective action.";
  const date = (daysAgo: number) => new Date(seed - daysAgo * 86400000).toISOString();
  return [
    { title: "Complaint received", detail: "Your complaint was registered and a unique case number was created.", date: date(0), done: true, icon: "✓" },
    { title: "Reached the right department", detail: `${department} accepted the case for ${location}.`, date: date(0), done: true, icon: "↗" },
    { title: "Officer assigned", detail: "The grievance officer responsible for coordinating this issue has been assigned.", date: date(1), done: true, icon: "◎" },
    { title: "Inspection planned", detail: inspection, date: date(2), done: true, icon: "⌖" },
    { title: "Action team dispatched", detail: action, date: date(3), done: false, icon: "⚒" },
    { title: "You confirm the result", detail: "When the department reports completion, you decide whether the issue is actually fixed.", date: "Next step", done: false, icon: "?" },
  ];
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
        const journey = buildJourney(payload.category, payload.department, payload.location || "your area", Date.now());
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
            journeyJson: JSON.stringify(journey),
          })
          .returning({ issueNumber: complaints.issueNumber, createdAt: complaints.createdAt, journeyJson: complaints.journeyJson });
        return Response.json({ complaint: record }, { status: 201 });
      } catch (error) {
        // SQLite raised "UNIQUE constraint failed"; Postgres raises
        // "duplicate key value violates unique constraint".
        const collision = /unique|duplicate key/i.test(String(error));
        if (collision && attempt < 2) continue;
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
  if (name.length < 2 || (issue && !/^JS-\d{4}-[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(issue))) {
    return Response.json({ error: "Enter a valid issue number and filer name." }, { status: 400 });
  }

  try {
    const db = getDb();
    const fields = {
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
      journeyJson: complaints.journeyJson,
    };
    const records = await db
      .select({
        ...fields,
      })
      .from(complaints)
      .where(and(eq(complaints.filerNameHash, await hashName(name)), ...(issue ? [eq(complaints.issueNumber, issue)] : [])))
      .orderBy(complaints.createdAt);
    const mapped = records.map((record) => ({ ...record, journey: JSON.parse(record.journeyJson || "[]") as JourneyUpdate[] }));
    const record = mapped[0];
    if (!record) {
      return Response.json(
        { error: "No complaint matched that issue number and filer name." },
        { status: 404 },
      );
    }
    return issue ? Response.json({ complaint: record }) : Response.json({ complaints: mapped });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}
