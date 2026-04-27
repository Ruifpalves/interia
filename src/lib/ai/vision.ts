// PIPELINE 2 — Claude Sonnet 4.5 vision: read a floorplan photo / hand sketch
// and produce a structured PlanState JSON for the Konva editor.

import { generateText } from "ai";
import { z } from "zod";
import { VISION_MODEL } from "./clients";
import type { PlanState, Shape } from "@/types/project";

const planSchema = z.object({
  width_m: z.number(),
  depth_m: z.number(),
  walls: z.array(
    z.object({
      x1: z.number(),
      y1: z.number(),
      x2: z.number(),
      y2: z.number(),
    }),
  ),
  doors: z
    .array(
      z.object({
        x: z.number(),
        y: z.number(),
        width_m: z.number(),
        side: z.enum(["top", "right", "bottom", "left"]),
      }),
    )
    .optional()
    .default([]),
  obstacles: z
    .array(
      z.object({
        type: z.string(),
        shape: z.enum(["circle", "rect"]),
        x: z.number(),
        y: z.number(),
        radius_m: z.number().optional(),
        width_m: z.number().optional(),
        depth_m: z.number().optional(),
        label: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
  notes: z.array(z.string()).optional().default([]),
});

const systemPrompt = `Você é um arquiteto a interpretar plantas de espaços a partir de fotografias.
Recebe uma imagem (foto da planta a mão, exportação CAD, ou planta em PDF) e medidas confirmadas pelo designer.
A sua tarefa é devolver APENAS JSON válido com este schema:

{
  "width_m": number,        // largura total do espaço, em metros
  "depth_m": number,        // profundidade total, em metros
  "walls": [                // arestas externas e internas em metros relativos ao canto superior-esquerdo
    { "x1": number, "y1": number, "x2": number, "y2": number }
  ],
  "doors": [                // aberturas: porta ou janela
    { "x": number, "y": number, "width_m": number, "side": "top"|"right"|"bottom"|"left" }
  ],
  "obstacles": [            // elementos fixos a contornar (termoacumuladores, pilares, etc.)
    { "type": string, "shape": "circle"|"rect", "x": number, "y": number,
      "radius_m": number?, "width_m": number?, "depth_m": number?, "label": string? }
  ],
  "notes": [string]         // observações curtas em PT-PT (sem inventar dados)
}

Regras:
- Use coordenadas em metros relativos ao canto superior-esquerdo da imagem.
- Se as medidas confirmadas pelo designer divergirem da escala da imagem, prefira sempre as medidas confirmadas.
- Se não conseguir interpretar a imagem, devolva walls vazio e adicione uma nota a explicar.
- NÃO inclua explicações fora do JSON. Apenas JSON válido.`;

export async function interpretFloorplan({
  imageUrl,
  measurements,
}: {
  imageUrl: string;
  measurements: Record<string, unknown> | null;
}): Promise<PlanState> {
  const userText = `Medidas confirmadas pelo designer (em metros): ${JSON.stringify(measurements ?? {})}.\nInterpreta a planta na imagem.`;

  const { text } = await generateText({
    model: VISION_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image", image: imageUrl },
        ],
      },
    ],
  });

  const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
  const parsed = planSchema.safeParse(JSON.parse(cleaned));
  if (!parsed.success) {
    throw new Error("Modelo não devolveu JSON válido para a planta.");
  }

  const w = (measurements?.largura_total_m as number) || parsed.data.width_m;
  const h = (measurements?.profundidade_m as number) || parsed.data.depth_m;

  const shapes: Shape[] = [];
  // Walls
  for (const wall of parsed.data.walls) {
    shapes.push({ id: crypto.randomUUID(), kind: "wall", ...wall, thickness: 0.15 });
  }
  // If no walls came back, fall back to a closed rectangle.
  if (parsed.data.walls.length === 0) {
    shapes.push(
      { id: "w-top", kind: "wall", x1: 0, y1: 0, x2: w, y2: 0, thickness: 0.15 },
      { id: "w-right", kind: "wall", x1: w, y1: 0, x2: w, y2: h, thickness: 0.15 },
      { id: "w-bottom", kind: "wall", x1: 0, y1: h, x2: w, y2: h, thickness: 0.15 },
      { id: "w-left", kind: "wall", x1: 0, y1: 0, x2: 0, y2: h, thickness: 0.15 },
    );
  }
  // Obstacles
  for (const o of parsed.data.obstacles) {
    if (o.shape === "circle" && o.radius_m) {
      shapes.push({ id: crypto.randomUUID(), kind: "circle", x: o.x, y: o.y, radius: o.radius_m, label: o.label ?? o.type });
    } else if (o.shape === "rect" && o.width_m && o.depth_m) {
      shapes.push({ id: crypto.randomUUID(), kind: "module", x: o.x, y: o.y, width: o.width_m, height: o.depth_m, label: o.label ?? o.type });
    }
  }
  // Doors
  for (const d of parsed.data.doors) {
    shapes.push({ id: crypto.randomUUID(), kind: "door", x: d.x, y: d.y, width: d.width_m });
  }
  // Notes as annotations stacked at the bottom
  parsed.data.notes.forEach((n, i) => {
    shapes.push({ id: crypto.randomUUID(), kind: "annotation", x: 0.1, y: h + 0.2 + i * 0.3, text: n });
  });

  return { version: 1, widthM: w, heightM: h, shapes };
}
