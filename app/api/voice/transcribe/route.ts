export async function POST(request: Request) {
  const form = await request.formData();
  const audio = form.get("audio");
  const language = String(form.get("language") || "");
  if (!(audio instanceof File) || audio.size === 0)
    return Response.json({ error: "Audio is required." }, { status: 400 });
  if (audio.size > 12 * 1024 * 1024)
    return Response.json({ error: "Audio answer is too long." }, { status: 413 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    return Response.json({ error: "Premium transcription is not configured." }, { status: 503 });

  const openAIForm = new FormData();
  openAIForm.append("file", audio, audio.name || "answer.webm");
  openAIForm.append("model", "gpt-transcribe");
  if (language) openAIForm.append("language", language.split("-")[0]);
  openAIForm.append(
    "prompt",
    "This is an Indian public grievance. Preserve names of villages, districts, panchayats, ministries, departments, dates, quantities, and code-switched words accurately.",
  );
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: openAIForm,
  });
  if (!response.ok) {
    console.error("Premium transcription failed", response.status, await response.text());
    return Response.json({ error: "Premium transcription is temporarily unavailable." }, { status: 502 });
  }
  const result = (await response.json()) as { text?: string };
  return Response.json({ text: result.text?.trim() || "", source: "gpt-transcribe" });
}
