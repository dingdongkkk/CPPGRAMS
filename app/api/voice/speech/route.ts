/**
 * Text to speech via Bhashini, the Government of India's national language
 * platform, which covers all 22 scheduled languages including the ones no
 * browser ships a voice for.
 *
 * This route is the fallback, not the default: the client speaks with the
 * device's own voice when it has one, and only calls here when it does not.
 *
 * Bhashini is a two-step API. The ULCA config call says which service can
 * speak a given language and returns a short-lived inference token; the
 * Dhruva call does the synthesis. The config answer is cached per language
 * so a normal turn costs one request, not two.
 */
const ULCA_CONFIG_URL =
  "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline";
const DEFAULT_PIPELINE_ID = "64392f96daac500b55c543cd"; // MeitY's public pipeline

type PipelineConfig = {
  serviceId: string;
  endpoint: string;
  authKey: string;
  authValue: string;
};

const cache = new Map<string, { value: PipelineConfig; expires: number }>();

async function resolvePipeline(language: string): Promise<PipelineConfig | null> {
  const cached = cache.get(language);
  if (cached && cached.expires > Date.now()) return cached.value;

  const userId = process.env.BHASHINI_USER_ID;
  const apiKey = process.env.BHASHINI_API_KEY;
  if (!userId || !apiKey) return null;

  const response = await fetch(ULCA_CONFIG_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      userID: userId,
      ulcaApiKey: apiKey,
    },
    body: JSON.stringify({
      pipelineTasks: [
        { taskType: "tts", config: { language: { sourceLanguage: language } } },
      ],
      pipelineRequestConfig: {
        pipelineId: process.env.BHASHINI_PIPELINE_ID || DEFAULT_PIPELINE_ID,
      },
    }),
  });
  if (!response.ok) {
    console.error("[bhashini] config failed", response.status, (await response.text()).slice(0, 300));
    return null;
  }

  const data = (await response.json()) as {
    pipelineResponseConfig?: Array<{ config?: Array<{ serviceId?: string }> }>;
    pipelineInferenceAPIEndPoint?: Array<{
      callbackUrl?: string;
      inferenceApiKey?: { name?: string; value?: string };
    }>;
  };
  const serviceId = data.pipelineResponseConfig?.[0]?.config?.[0]?.serviceId;
  const endpointInfo = data.pipelineInferenceAPIEndPoint?.[0];
  const endpoint = endpointInfo?.callbackUrl;
  const authKey = endpointInfo?.inferenceApiKey?.name;
  const authValue = endpointInfo?.inferenceApiKey?.value;
  if (!serviceId || !endpoint || !authKey || !authValue) {
    console.error("[bhashini] config missing fields for", language);
    return null;
  }

  const value = { serviceId, endpoint, authKey, authValue };
  // The inference token is short lived; re-resolve well before it lapses.
  cache.set(language, { value, expires: Date.now() + 20 * 60 * 1000 });
  return value;
}

export async function POST(request: Request) {
  const { text, language } = (await request.json()) as {
    text?: string;
    language?: string;
  };
  if (!text?.trim())
    return Response.json({ error: "Speech text is required." }, { status: 400 });

  // Bhashini keys on the bare ISO code: "mr", not "mr-IN".
  const sourceLanguage = (language || "hi").split("-")[0].toLowerCase();

  const pipeline = await resolvePipeline(sourceLanguage);
  if (!pipeline)
    return Response.json({ error: "Speech is not configured." }, { status: 503 });

  const response = await fetch(pipeline.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [pipeline.authKey]: pipeline.authValue,
    },
    body: JSON.stringify({
      pipelineTasks: [
        {
          taskType: "tts",
          config: {
            language: { sourceLanguage },
            serviceId: pipeline.serviceId,
            gender: "female",
            samplingRate: 8000,
          },
        },
      ],
      inputData: { input: [{ source: text.trim().slice(0, 2000) }] },
    }),
  });
  if (!response.ok) {
    console.error("[bhashini] synthesis failed", response.status, (await response.text()).slice(0, 300));
    return Response.json({ error: "Speech is temporarily unavailable." }, { status: 502 });
  }

  const result = (await response.json()) as {
    pipelineResponse?: Array<{ audio?: Array<{ audioContent?: string }> }>;
  };
  const base64 = result.pipelineResponse?.[0]?.audio?.[0]?.audioContent;
  if (!base64) {
    console.error("[bhashini] no audio returned for", sourceLanguage);
    return Response.json({ error: "Speech is temporarily unavailable." }, { status: 502 });
  }

  return new Response(Buffer.from(base64, "base64"), {
    headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
  });
}
