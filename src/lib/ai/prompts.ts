import type { BriefingState, StyleState, PlanState } from "@/types/project";

// Prompt builder for image generation. Produces ~400-word EN prompt optimized
// for Gemini 2.5 Flash Image. Designer never sees this — it is built from the
// structured briefing, plan, and style.

const styleToEN: Record<StyleState["style"], string> = {
  minimalista: "minimalist, clean lines, neutral whites and grays, natural materials, plenty of negative space",
  contemporaneo_escuro: "contemporary dark, anthracite black, brushed metals, smoked glass, sophisticated low-key lighting",
  industrial: "industrial, raw concrete, black steel, recovered timber, exposed structures",
  classico: "classic, refined hardwoods, symmetric composition, ornamental detail, warm ambient light",
  mediterraneo: "mediterranean, warm whites, terracotta tones, light wood, terracotta tile, daylight",
};

const viewPrompts = [
  "Wide eye-level architectural photography of the {subject}, doors closed, full front view, balanced symmetric composition.",
  "Wide ambient view of the surrounding area showing the {subject} in its full context, with {scene}.",
  "Same {subject} with doors open showing interior with shelves, hangers and details.",
  "Detail shot of the decorative slats and storage area, eye-level, shallow depth of field.",
  "Lateral profile view of the {subject} showing depth and proportions.",
  "Top-down zenithal view of the layout, axonometric feel, neutral lighting.",
];

export function buildImagePrompts({
  briefing,
  style,
  plan,
  subjectHint,
}: {
  briefing: BriefingState | null;
  style: StyleState;
  plan: PlanState;
  subjectHint: string;
}): string[] {
  const desc = briefing?.descricao_pt ?? "custom interior project";
  const styleEN = styleToEN[style.style] ?? styleToEN.contemporaneo_escuro;
  const palette = style.palette.slice(0, 4).join(", ");
  const portas = style.materials.portas?.join(", ") ?? "";
  const interior = style.materials.interior?.join(", ") ?? "";
  const acabamentos = style.materials.acabamentos?.join(", ") ?? "";

  const elements = Object.entries(style.elements)
    .filter(([, v]) => v)
    .map(([k]) =>
      ({
        led: "integrated LED lighting with sensor",
        portasRecolhiveis: "pocket sliding doors",
        varao: "internal hanging rod",
        lamelas: "decorative vertical slats",
        bancada: "work countertop",
        softClose: "soft-close drawers",
      } as Record<string, string>)[k] ?? k,
    )
    .join(", ");

  const scene = Object.entries(style.scene)
    .filter(([, v]) => v)
    .map(([k]) =>
      ({
        mesa: "outdoor wooden dining table for 6",
        cadeiras: "fabric chairs in light gray",
        deck: "wood deck flooring",
        plantas: "potted plants",
        iluminacaoSuspensa: "suspended lighting",
      } as Record<string, string>)[k] ?? k,
    )
    .join(", ");

  const dimensions = `Dimensions: ${plan.widthM.toFixed(2)}m wide × ${plan.heightM.toFixed(2)}m deep.`;

  return viewPrompts.map((tpl) =>
    [
      tpl.replace("{subject}", subjectHint).replace("{scene}", scene || "context"),
      `Style: ${styleEN}.`,
      `Palette: ${palette}.`,
      portas && `Doors finish: ${portas}.`,
      interior && `Interior finish: ${interior}.`,
      acabamentos && `Special finishes: ${acabamentos}.`,
      elements && `Features: ${elements}.`,
      dimensions,
      `Briefing context: ${desc}.`,
      "Photorealistic 8k render, professional architectural photography, soft natural lighting, no people, no logos, no text, sharp focus.",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export const briefingSystemPrompt = `Você é um arquiteto-designer português a estruturar briefings de design de interiores.
Recebe texto livre do designer + tags de referências + medidas do espaço.
Responda APENAS com JSON válido neste schema:
{
  "objetivo": string (1 frase),
  "estilo": string (descritor curto: minimalista, contemporâneo escuro, industrial, etc),
  "paleta_principal": string[] (4-6 cores, em hex ou nome em PT),
  "materiais": string[],
  "elementos_especiais": string[],
  "restricoes": string[],
  "palavras_chave_imagem": string[] (5-10 keywords em inglês para gerar imagem),
  "descricao_pt": string (parágrafo de 50-80 palavras descrevendo o projeto)
}
Português europeu (PT-PT). Não inclua explicações fora do JSON.`;

export const editPromptSystemPrompt = `You rewrite image-generation prompts in English to apply a single change while preserving everything else.
Input: original 400-word prompt + a short PT-PT instruction from the designer.
Output: the full new prompt, English, ~400 words, with only the requested change applied.
Do not summarize or shorten. Output only the new prompt text.`;
