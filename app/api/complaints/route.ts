import { and, desc, eq, or } from "drizzle-orm";
import { getDb } from "../../../db";
import { activityLog, complaints } from "../../../db/schema";
import { currentUser } from "../../lib/auth";
import { getDepartmentOfficer, getSlaDays } from "../../lib/officerDirectory";

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
  const cause = error instanceof Error ? (error.cause as Error | undefined) : undefined;
  console.error(
    "[complaints] db error |",
    "name:", (error as Error)?.name,
    "| code:", (error as { code?: string })?.code ?? cause?.name,
    "| cause:", cause?.message ?? "(none)",
    "| msg:", message.slice(0, 120),
  );
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
  const user = await currentUser(request);

  // Verification is required: either verified user session, human+digilocker cookies, or verified identity
  if (!user && (!cookie.includes("jansetu_human=1") || !cookie.includes("jansetu_digilocker="))) {
    return Response.json({ error: "Identity verification is required before filing." }, { status: 403 });
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
      description?: string;
      ministry?: string;
      mainCategory?: string;
      subCategory?: string;
      referenceNumber?: string;
      referenceDate?: string;
      gender?: string;
      address?: string;
      email?: string;
      mobile?: string;
    };
    const filerName = (payload.filerName || user?.fullName || "").trim().replace(/\s+/g, " ");
    if (
      filerName.length < 2 ||
      !payload.department ||
      !payload.category ||
      !["Critical", "High", "Medium", "Low"].includes(payload.urgency || "")
    ) {
      return Response.json({ error: "Name, department, and valid urgency are required." }, { status: 400 });
    }

    const urgency = payload.urgency || "Medium";
    const officer = getDepartmentOfficer(payload.department, payload.category);
    const slaDays = getSlaDays(urgency);
    const slaDeadline = new Date(Date.now() + slaDays * 86_400_000).toISOString();

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
            userId: user?.id ?? null,
            department: payload.department,
            category: payload.category,
            location: payload.location || "Location not provided",
            urgency,
            urgencyReason: payload.urgencyReason || "AI urgency assessment completed",
            assignedOfficer: payload.assignedOfficer || officer.officerDesignation,
            officerName: officer.officerName,
            officerDesignation: officer.officerDesignation,
            officerEmail: officer.officerEmail,
            officerPhone: officer.officerPhone,
            officerOffice: officer.officerOffice,
            appellateOfficerName: officer.appellateOfficerName,
            appellateOfficerDesignation: officer.appellateOfficerDesignation,
            appellateOfficerEmail: officer.appellateOfficerEmail,
            appellateOfficerPhone: officer.appellateOfficerPhone,
            slaDeadline,
            slaDays,
            status: "Assigned to officer",
            stage: 1,
            journeyJson: JSON.stringify(journey),
            description: (payload.description || "").slice(0, 2000),
            ministry: payload.ministry || payload.department,
            mainCategory: payload.mainCategory || payload.category,
            subCategory: payload.subCategory || "",
            referenceNumber: payload.referenceNumber || "",
            referenceDate: payload.referenceDate || "",
            gender: payload.gender || user?.gender || "",
            address: payload.address || user?.address || "",
            email: payload.email || user?.email || "",
            mobile: payload.mobile || user?.mobile || "",
          })
          .returning();

        if (user) {
          await db.insert(activityLog).values({
            userId: user.id,
            action: "Grievance filed",
            detail: `${record.issueNumber} — ${record.category} (${record.department})`,
          });
        }

        return Response.json(
          {
            complaint: {
              ...record,
              journey: JSON.parse(record.journeyJson || "[]"),
            },
          },
          { status: 201 },
        );
      } catch (error) {
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
  const user = await currentUser(request);
  const mine = url.searchParams.get("mine") === "1";
  const issue = (url.searchParams.get("issue") || "").trim().toUpperCase();
  const name = normalizeName(url.searchParams.get("name") || "");

  try {
    const db = getDb();

    // 1. Logged in dashboard: request for all current user's complaints
    if (mine) {
      if (!user) {
        return Response.json({ error: "Sign in required." }, { status: 401 });
      }
      const userRecords = await db
        .select()
        .from(complaints)
        .where(
          or(
            eq(complaints.userId, user.id),
            eq(complaints.filerNameHash, await hashName(user.fullName || user.email)),
          ),
        )
        .orderBy(desc(complaints.id));

      const mapped = userRecords.map((r) => ({
        ...r,
        journey: JSON.parse(r.journeyJson || "[]") as JourneyUpdate[],
      }));
      return Response.json({ complaints: mapped });
    }

    // 2. Direct Issue Lookup (Public or authenticated)
    if (issue) {
      if (!/^JS-\d{4}-[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(issue)) {
        return Response.json({ error: "Invalid issue registration number format." }, { status: 400 });
      }
      const [record] = await db
        .select()
        .from(complaints)
        .where(eq(complaints.issueNumber, issue))
        .limit(1);

      if (!record) {
        return Response.json({ error: "No complaint found with that registration number." }, { status: 404 });
      }

      // If name was provided for extra verification, check name match
      if (name && name.length >= 2) {
        const expectedHash = await hashName(name);
        if (record.filerNameHash !== expectedHash && record.userId !== user?.id) {
          return Response.json({ error: "The provided name does not match this registration number." }, { status: 403 });
        }
      }

      return Response.json({
        complaint: {
          ...record,
          journey: JSON.parse(record.journeyJson || "[]") as JourneyUpdate[],
        },
      });
    }

    // 3. Name based lookup for guest track
    if (name.length >= 2) {
      const records = await db
        .select()
        .from(complaints)
        .where(eq(complaints.filerNameHash, await hashName(name)))
        .orderBy(desc(complaints.id));

      if (!records.length) {
        return Response.json({ error: "No grievances found under that name." }, { status: 404 });
      }

      const mapped = records.map((r) => ({
        ...r,
        journey: JSON.parse(r.journeyJson || "[]") as JourneyUpdate[],
      }));
      return Response.json({ complaints: mapped });
    }

    return Response.json({ error: "Specify an issue number, filer name, or mine=1." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 500 });
  }
}

