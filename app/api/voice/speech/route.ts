const allowedVoices = new Set(["coral", "nova", "shimmer"]);

export async function POST(request: Request) {
  const { text, languageName, voice } = (await request.json()) as {
    text?: string;
    languageName?: string;
    voice?: string;
  };
  if (!text?.trim())
    return Response.json({ error: "Speech text is required." }, { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    return Response.json({ error: "Premium speech is not configured." }, { status: 503 });

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: allowedVoices.has(voice || "") ? voice : "coral",
      input: text.trim().slice(0, 3500),
      instructions: `Speak as a warm, patient Indian public-service guide. Speak fluent ${languageName || "the language of the supplied text"} with natural rhythm and clear pronunciation. Pronounce Indian place names carefully. Do not add or omit words.`,
      response_format: "mp3",
    }),
  });
  if (!response.ok) {
    console.error("Premium speech failed", response.status, await response.text());
    return Response.json({ error: "Premium speech is temporarily unavailable." }, { status: 502 });
  }
  return new Response(response.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}
