import { generateText } from "ai";
import { env } from "@/lib/env";

// Use the AI Gateway by default ("provider/model" string). Falls back to direct
// provider keys if the gateway key is not set.

export const TEXT_MODEL = "anthropic/claude-sonnet-4.5";
export const IMAGE_MODEL = "google/gemini-2.5-flash-image";
export const VISION_MODEL = "anthropic/claude-sonnet-4.5";

export type GenTextArgs = {
  system?: string;
  prompt: string;
  json?: boolean;
};

export async function genText({ system, prompt, json }: GenTextArgs) {
  return generateText({
    model: TEXT_MODEL,
    system,
    prompt,
    ...(json
      ? {
          providerOptions: {
            anthropic: { responseFormat: { type: "json_object" } },
          },
        }
      : {}),
  });
}

// Direct call to Gemini Image via REST. The AI SDK image module API is in
// flux across versions; using the REST endpoint is the most stable path.
export async function generateImage({
  prompt,
}: {
  prompt: string;
}): Promise<{ imageBase64: string }> {
  const apiKey = env.serverOnly.aiGatewayKey ?? env.serverOnly.googleAiKey;
  if (!apiKey) throw new Error("Missing AI Gateway or Google AI key");

  // Through Vercel AI Gateway
  if (env.serverOnly.aiGatewayKey) {
    const res = await fetch("https://ai-gateway.vercel.sh/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        n: 1,
        size: "2048x1152",
        response_format: "b64_json",
      }),
    });
    if (!res.ok) throw new Error(`Image gen failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { data: Array<{ b64_json: string }> };
    return { imageBase64: json.data[0].b64_json };
  }

  // Direct Google AI fallback
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini image failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { candidates: Array<{ content: { parts: Array<{ inlineData?: { data: string } }> } }> };
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part?.inlineData?.data) throw new Error("Gemini returned no image");
  return { imageBase64: part.inlineData.data };
}
