const conversationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    assistantMessage: { type: "string" },
    nextField: {
      type: "string",
      enum: [
        "description",
        "state",
        "district",
        "blockTehsil",
        "gramPanchayat",
        "locality",
        "startedOn",
        "frequency",
        "affectedPeople",
        "requestedResolution",
        "complete",
      ],
    },
    complete: { type: "boolean" },
    captured: {
      type: "object",
      additionalProperties: false,
      properties: {
        description: { type: "string" },
        state: { type: "string" },
        district: { type: "string" },
        blockTehsil: { type: "string" },
        gramPanchayat: { type: "string" },
        locality: { type: "string" },
        startedOn: { type: "string" },
        frequency: { type: "string" },
        affectedPeople: { type: "string" },
        requestedResolution: { type: "string" },
      },
      required: [
        "description",
        "state",
        "district",
        "blockTehsil",
        "gramPanchayat",
        "locality",
        "startedOn",
        "frequency",
        "affectedPeople",
        "requestedResolution",
      ],
    },
  },
  required: ["assistantMessage", "nextField", "complete", "captured"],
};

type Captured = {
  description: string;
  state: string;
  district: string;
  blockTehsil: string;
  gramPanchayat: string;
  locality: string;
  startedOn: string;
  frequency: string;
  affectedPeople: string;
  requestedResolution: string;
};

type RequestBody = {
  userText?: string;
  language?: string;
  languageName?: string;
  locationMatch?: "same" | "different";
  captured?: Partial<Captured>;
  history?: Array<{ role: "assistant" | "user"; text: string }>;
  fallbackQuestions?: Partial<Record<keyof Captured, string>>;
};

const orderedFields: Array<keyof Captured> = [
  "description",
  "state",
  "district",
  "blockTehsil",
  "gramPanchayat",
  "locality",
  "startedOn",
  "frequency",
  "affectedPeople",
  "requestedResolution",
];

function fallback(body: RequestBody) {
  const captured = Object.fromEntries(
    orderedFields.map((field) => [field, body.captured?.[field] || ""]),
  ) as Captured;
  if (!captured.description) captured.description = body.userText?.trim() || "";
  const fields =
    body.locationMatch === "same"
      ? orderedFields.filter(
          (field) => !["state", "district", "blockTehsil", "gramPanchayat", "locality"].includes(field),
        )
      : orderedFields;
  const nextField = fields.find((field) => !captured[field]);
  return {
    assistantMessage: nextField
      ? body.fallbackQuestions?.[nextField] || "Please share the next detail."
      : "Thank you. I have enough information to prepare your grievance for review.",
    nextField: nextField || "complete",
    complete: !nextField,
    captured,
    source: "guided-fallback",
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as RequestBody;
  if (!body.userText?.trim())
    return Response.json({ error: "Please say or type an answer." }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json(fallback(body));

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        store: false,
        instructions: `You are JanSetu's warm, patient voice grievance assistant for India, inspired by the voice-first CPGRAMS experience. Conduct a natural spoken interview in ${body.languageName || body.language || "the citizen's chosen language"}.

Understand each answer even when it contains several facts. Update every field that is explicitly supported by the citizen's words or previously captured data. Never invent names, dates, locations, impact, or requested action. Ask exactly one short, relevant follow-up question at a time. Do not mechanically ask for administrative fields that are irrelevant or already answered. A useful grievance needs: what happened and its effect; the complaint location (unless current GPS location is confirmed); roughly when it began; whether it repeats; who or how many are affected; and what action the citizen wants.

The citizen said the complaint location is ${body.locationMatch === "same" ? "the same as their current GPS location, so do not ask State, district, block, panchayat, or locality again" : "different from their current location, so collect enough location detail to route it"}.

Keep assistantMessage conversational and easy to hear aloud, normally one or two sentences. Use the citizen's chosen language and script. Do not translate their grievance into English in captured.description. Set complete true only when enough substance is present to prepare a meaningful grievance; optional administrative location levels may remain blank when the available location is still actionable. When complete, briefly summarize what you understood and ask the citizen to review it on screen.`,
        input: JSON.stringify({
          recentConversation: (body.history || []).slice(-10),
          latestCitizenAnswer: body.userText.trim(),
          existingCapturedData: body.captured || {},
        }),
        text: {
          format: {
            type: "json_schema",
            name: "grievance_conversation_turn",
            strict: true,
            schema: conversationSchema,
          },
        },
      }),
    });
    if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
    const result = (await response.json()) as {
      output?: Array<{ content?: Array<{ type: string; text?: string }> }>;
    };
    const outputText = result.output
      ?.flatMap((item) => item.content || [])
      .find((item) => item.type === "output_text")?.text;
    if (!outputText) throw new Error("No conversation response returned");
    return Response.json({ ...JSON.parse(outputText), source: "openai-voice" });
  } catch (error) {
    console.error("Conversational AI unavailable; using guided fallback", error);
    return Response.json(fallback(body));
  }
}
