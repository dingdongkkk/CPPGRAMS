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
  },
  required: ["department", "category", "location", "issueType", "keyDetails", "summary"],
};

function demoAnalysis(text: string) {
  const lower = text.toLowerCase();
  const isWater = /water|paani|पानी|supply|pipeline/.test(lower);
  const isRoad = /road|pothole|street|सड़क/.test(lower);
  const isWaste = /garbage|waste|कचरा|rubbish/.test(lower);
  const category = isWater ? "Water supply" : isRoad ? "Roads & safety" : isWaste ? "Waste collection" : "Civic services";
  const department = isWater ? "Delhi Jal Board" : isRoad ? "Public Works Department" : isWaste ? "Municipal Corporation" : "District Public Grievance Office";
  const location = text.match(/(?:in|at|near|from)\s+([A-Z][\w ]{2,30})/i)?.[1]?.trim() || "Location to confirm";
  return {
    department,
    category,
    location,
    issueType: category,
    keyDetails: ["Citizen-reported service disruption", "Location and duration should be verified"],
    summary: text.trim().replace(/\s+/g, " "),
  };
}

export async function POST(request: Request) {
  const { description } = (await request.json()) as { description?: string };
  if (!description || description.trim().length < 10) {
    return Response.json({ error: "Please add a little more detail." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ ...demoAnalysis(description), source: "demo" });

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-5-mini",
        store: false,
        instructions: "You route Indian public grievances. Extract only information present in the citizen text. Use plain, neutral language. Never invent personal details. Draft a concise first-person grievance summary for citizen review.",
        input: description,
        text: { format: { type: "json_schema", name: "grievance_analysis", strict: true, schema } },
      }),
    });
    if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
    const result = await response.json() as { output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> };
    const outputText = result.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!outputText) throw new Error("No structured output returned");
    return Response.json({ ...JSON.parse(outputText), source: "openai" });
  } catch (error) {
    console.error("AI classification unavailable; returning demo analysis", error);
    return Response.json({ ...demoAnalysis(description), source: "demo-fallback" });
  }
}
