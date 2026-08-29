export async function POST(request: Request) {
  const form = await request.formData();
  const audio = form.get("audio");
  const language = String(form.get("language") || "");
  if (!(audio instanceof File) || audio.size === 0)
    return Response.json({ error: "Audio is required." }, { status: 400 });
  if (audio.size > 12 * 1024 * 1024)
    return Response.json({ error: "Audio answer is too long." }, { status: 413 });
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey)
    return Response.json({ error: "Premium transcription is not configured." }, { status: 503 });

  const groqBaseUrl = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
  const groqForm = new FormData();
  groqForm.append("file", audio, audio.name || "answer.webm");
  groqForm.append("model", "whisper-large-v3");
  if (language) groqForm.append("language", language.split("-")[0]);
  groqForm.append(
    "prompt",
    "This is an Indian public grievance. Preserve names of villages, districts, panchayats, ministries, departments, dates, quantities, and code-switched words accurately.",
  );
  const response = await fetch(`${groqBaseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: groqForm,
  });
  if (!response.ok) {
    console.error("Groq transcription failed", response.status, await response.text());
    return Response.json({ error: "Premium transcription is temporarily unavailable." }, { status: 502 });
  }
  const result = (await response.json()) as { text?: string };
  return Response.json({ text: result.text?.trim() || "", source: "groq-transcribe" });
}
