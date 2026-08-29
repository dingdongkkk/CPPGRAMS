import { routeGrievance } from "./router";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    department: { type: "string" },
    category: { type: "string" },
    location: { type: "string" },
    issueType: { type: "string" },
    keyDetails: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
    urgency: { type: "string", enum: ["Critical", "High", "Medium", "Low"] },
    urgencyReason: { type: "string" },
    assignedOfficer: { type: "string" },
    emergencyWarning: { type: "boolean" },
  },
  required: [
    "department",
    "category",
    "location",
    "issueType",
    "keyDetails",
    "summary",
    "urgency",
    "urgencyReason",
    "assignedOfficer",
    "emergencyWarning",
  ],
};

type ComplaintDetails = {
  district?: string;
  blockTehsil?: string;
  gramPanchayat?: string;
  locality?: string;
  startedOn?: string;
  frequency?: string;
  affectedPeople?: string;
  requestedResolution?: string;
};

function assessUrgency(text: string, details: ComplaintDetails) {
  const combined = `${text} ${details.requestedResolution || ""}`.toLowerCase();
  const critical =
    /immediate danger|life.?threat|electrocut|live wire|fire|building collapse|violence|attack|medical emergency|sewage.*drinking water|poison|death|dead body/.test(
      combined,
    );
  const high =
    /no drinking water|water.*not.*(?:coming|supply)|hospital|ambulance|power.*(?:hospital|school)|flood|sewage overflow|unsafe bridge|major leak|many (?:people|families|households)/.test(
      combined,
    ) || Number.parseInt(details.affectedPeople || "0", 10) >= 25;
  const low = /information|certificate|copy of|status only|minor|suggestion/.test(combined);
  if (critical)
    return {
      urgency: "Critical",
      urgencyReason: "The complaint describes a possible immediate threat to life or public safety.",
      assignedOfficer: "District Emergency Nodal Officer",
      emergencyWarning: true,
    };
  if (high)
    return {
      urgency: "High",
      urgencyReason: "An essential service or public-safety issue may affect multiple people and needs prompt action.",
      assignedOfficer: "District Grievance Officer — Priority Desk",
      emergencyWarning: false,
    };
  if (low)
    return {
      urgency: "Low",
      urgencyReason: "The request appears non-urgent and can follow the standard administrative queue.",
      assignedOfficer: "Block / Tehsil Grievance Officer",
      emergencyWarning: false,
    };
  return {
    urgency: "Medium",
    urgencyReason: "The complaint affects public-service delivery but does not describe an immediate safety threat.",
    assignedOfficer: "Department Grievance Officer",
    emergencyWarning: false,
  };
}

function fallbackAnalysis(
  text: string,
  selectedState?: string,
  details: ComplaintDetails = {},
) {
  const route = routeGrievance(text, selectedState);
  const urgency = assessUrgency(text, details);
  const extracted = text
    .match(/(?:in|at|near|from)\s+([A-Z][\w ]{2,40})/i)?.[1]
    ?.trim();
  const location =
    [extracted, route.state]
      .filter(Boolean)
      .filter((value, index, all) => all.indexOf(value) === index)
      .join(", ") || "Location to confirm";
  return {
    department: route.department,
    category: route.category,
    location,
    issueType: route.issueType,
    keyDetails: [
      "Citizen-reported service issue",
      route.state
        ? `State/UT identified: ${route.state}`
        : "State/UT must be confirmed",
      details.district ? `District: ${details.district}` : "District to confirm",
      details.locality ? `Village/ward: ${details.locality}` : "Village/ward to confirm",
      `AI urgency: ${urgency.urgency}`,
    ],
    summary: text.trim().replace(/\s+/g, " "),
    ...urgency,
  };
}

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  if (
    !cookie.includes("jansetu_human=1") ||
    !cookie.includes("jansetu_digilocker=")
  ) {
    return Response.json(
      { error: "Identity and CAPTCHA verification are required." },
      { status: 403 },
    );
  }
  const { description, state, details } = (await request.json()) as {
    description?: string;
    state?: string;
    details?: ComplaintDetails;
  };
  if (!description || description.trim().length < 10) {
    return Response.json(
      { error: "Please add a little more detail." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey)
    return Response.json({
      ...fallbackAnalysis(description, state, details),
      source: "rules",
    });

  const groqBaseUrl = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  try {
    const systemPrompt = `You triage and route Indian public grievances. First determine urgency as Critical, High, Medium, or Low. Critical is only for a plausible immediate threat to life or public safety; set emergencyWarning true for Critical and explain that grievance filing does not replace emergency services. Then choose the category and correct department. Respect Indian federal jurisdiction: state and local service issues must go to the concerned State/UT authority, while central services go to the appropriate Government of India ministry. Never route to a Delhi-specific body unless the location is Delhi. Assign an officer role, not an invented person's name: District Emergency Nodal Officer for Critical, District Grievance Officer — Priority Desk for High, Department Grievance Officer for Medium, and Block / Tehsil Grievance Officer for Low. Extract only information present in the citizen text. Use plain, neutral language. Draft a concise first-person grievance summary for citizen review.

You must respond ONLY with a valid JSON object matching this schema:
${JSON.stringify(schema, null, 2)}`;

    const userPrompt = `Citizen-selected State/UT: ${state || "Not selected"}\nStructured complaint fields: ${JSON.stringify(details || {})}\nComplaint: ${description}`;

    const response = await fetch(`${groqBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq request failed: ${response.status} ${errText}`);
    }
    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error("No structured output returned from Groq");
    const cleanJson = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    return Response.json({ ...JSON.parse(cleanJson), source: "groq" });
  } catch (error) {
    console.error(
      "AI classification unavailable; returning rules-based analysis",
      error,
    );
    return Response.json({
      ...fallbackAnalysis(description, state, details),
      source: "rules-fallback",
    });
  }
}
