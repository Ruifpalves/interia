import type { ModuleShape, PlanState } from "@/types/project";
import { formatM } from "@/lib/utils/format";

// Procedural generator for technical views from the plan state.
// 100% deterministic, no AI calls. Outputs SVG strings.

export type TechnicalView = {
  type: "front_closed" | "front_open_lateral" | "lateral";
  svg: string;
};

const PX = 80; // px per metre in the SVG

export function generateTechnicalViews(plan: PlanState, subtype: string | null): TechnicalView[] {
  const modules = plan.shapes.filter((s): s is ModuleShape => s.kind === "module");
  if (modules.length === 0) return [];

  return [
    { type: "front_closed", svg: drawFrontClosed(plan, modules, subtype) },
    { type: "front_open_lateral", svg: drawFrontOpenAndLateral(plan, modules, subtype) },
    { type: "lateral", svg: drawLateralOnly(plan, modules, subtype) },
  ];
}

function drawFrontClosed(plan: PlanState, modules: ModuleShape[], subtype: string | null): string {
  const sorted = [...modules].sort((a, b) => a.x - b.x);
  const totalWidth = sorted.reduce((max, m) => Math.max(max, m.x + m.width), 0);
  const totalHeight = Math.max(...sorted.map((m) => m.height), 2.05);
  const wallHeight = 2.71;
  const w = totalWidth * PX + 200;
  const h = wallHeight * PX + 200;

  const moduleRects = sorted
    .map((m, i) => {
      const x = 100 + m.x * PX;
      const y = 100 + (wallHeight - totalHeight) * PX;
      const ww = m.width * PX;
      const hh = totalHeight * PX;
      return `<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="none" stroke="#f4f4f5" stroke-width="1.5"/>
        <text x="${x + ww / 2}" y="${y + hh + 18}" text-anchor="middle" fill="#9b9ba3" font-size="11">${i === 0 ? "Módulo principal" : `Módulo ${i + 1}`}</text>`;
    })
    .join("");

  const widthDim = dimLine(100, 60, 100 + totalWidth * PX, 60, formatM(totalWidth));
  const heightDim = dimLineV(60, 100, 60, 100 + wallHeight * PX, formatM(wallHeight));
  const subtitleDim = dimLineV(100 + totalWidth * PX + 40, 100 + (wallHeight - totalHeight) * PX, 100 + totalWidth * PX + 40, 100 + wallHeight * PX, formatM(totalHeight));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Inter, sans-serif">
    <rect width="${w}" height="${h}" fill="#131316"/>
    <line x1="100" y1="100" x2="${100 + totalWidth * PX}" y2="100" stroke="#9b9ba3" stroke-width="1"/>
    <line x1="100" y1="${100 + wallHeight * PX}" x2="${100 + totalWidth * PX}" y2="${100 + wallHeight * PX}" stroke="#9b9ba3" stroke-width="1"/>
    ${moduleRects}
    ${widthDim}
    ${heightDim}
    ${subtitleDim}
    <text x="${w / 2}" y="${h - 30}" text-anchor="middle" fill="#d4a373" font-size="13" font-weight="600">VISTA FRONTAL — PORTAS FECHADAS</text>
    <text x="${w / 2}" y="${h - 14}" text-anchor="middle" fill="#9b9ba3" font-size="10">${subtype ?? "Mobiliário"} · ${modules.length} módulos</text>
  </svg>`;
}

function drawFrontOpenAndLateral(plan: PlanState, modules: ModuleShape[], subtype: string | null): string {
  const sorted = [...modules].sort((a, b) => a.x - b.x);
  const totalWidth = sorted.reduce((max, m) => Math.max(max, m.x + m.width), 0);
  const totalHeight = Math.max(...sorted.map((m) => m.height), 2.05);
  const profundidade = 0.45;
  const w = (totalWidth + profundidade) * PX + 280;
  const h = totalHeight * PX + 200;

  const annotations = [
    "Módulo com portas de correr",
    "Base de 5 cm",
    "LED com sensor",
    "Varão de cabides",
  ];

  const moduleRects = sorted
    .map((m, i) => {
      const x = 100 + m.x * PX;
      const y = 100;
      const ww = m.width * PX;
      const hh = totalHeight * PX;
      // Internal subdivision (2 prateleiras)
      const shelfY1 = y + (hh / 3);
      const shelfY2 = y + (2 * hh / 3);
      const note = annotations[i % annotations.length];
      return `
        <rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="none" stroke="#f4f4f5" stroke-width="1.5"/>
        <line x1="${x}" y1="${shelfY1}" x2="${x + ww}" y2="${shelfY1}" stroke="#9b9ba3" stroke-width="0.8" stroke-dasharray="3,2"/>
        <line x1="${x}" y1="${shelfY2}" x2="${x + ww}" y2="${shelfY2}" stroke="#9b9ba3" stroke-width="0.8" stroke-dasharray="3,2"/>
        <text x="${x + 4}" y="${y + 14}" fill="#d4a373" font-size="9">${note}</text>`;
    })
    .join("");

  // Lateral profile on the right
  const lx = 100 + totalWidth * PX + 80;
  const ly = 100;
  const lw = profundidade * PX;
  const lh = totalHeight * PX;
  const lateral = `
    <rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" fill="none" stroke="#f4f4f5" stroke-width="1.5"/>
    <text x="${lx + lw / 2}" y="${ly + lh + 18}" text-anchor="middle" fill="#9b9ba3" font-size="10">Lateral</text>
    ${dimLineV(lx + lw + 25, ly, lx + lw + 25, ly + lh, formatM(totalHeight))}
    ${dimLine(lx, ly - 10, lx + lw, ly - 10, formatM(profundidade))}
  `;

  const widthDim = dimLine(100, 60, 100 + totalWidth * PX, 60, formatM(totalWidth));
  const heightDim = dimLineV(60, 100, 60, 100 + totalHeight * PX, formatM(totalHeight));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Inter, sans-serif">
    <rect width="${w}" height="${h}" fill="#131316"/>
    ${moduleRects}
    ${lateral}
    ${widthDim}
    ${heightDim}
    <text x="${w / 2}" y="${h - 16}" text-anchor="middle" fill="#d4a373" font-size="13" font-weight="600">VISTA FRONTAL ABERTA + LATERAL</text>
  </svg>`;
}

function drawLateralOnly(plan: PlanState, modules: ModuleShape[], subtype: string | null): string {
  const totalHeight = Math.max(...modules.map((m) => m.height), 2.05);
  const profundidade = 0.45;
  const w = profundidade * PX + 200;
  const h = totalHeight * PX + 200;
  const x = 100;
  const y = 100;
  const ww = profundidade * PX;
  const hh = totalHeight * PX;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Inter, sans-serif">
    <rect width="${w}" height="${h}" fill="#131316"/>
    <rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="none" stroke="#f4f4f5" stroke-width="1.5"/>
    ${dimLine(x, y - 10, x + ww, y - 10, formatM(profundidade))}
    ${dimLineV(x + ww + 30, y, x + ww + 30, y + hh, formatM(totalHeight))}
    <text x="${w / 2}" y="${h - 16}" text-anchor="middle" fill="#d4a373" font-size="13" font-weight="600">VISTA LATERAL</text>
  </svg>`;
}

function dimLine(x1: number, y1: number, x2: number, y2: number, label: string): string {
  return `
    <line x1="${x1}" y1="${y1 + 6}" x2="${x1}" y2="${y1 - 6}" stroke="#d4a373"/>
    <line x1="${x2}" y1="${y1 + 6}" x2="${x2}" y2="${y1 - 6}" stroke="#d4a373"/>
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d4a373" marker-start="url(#arr)" marker-end="url(#arr)"/>
    <text x="${(x1 + x2) / 2}" y="${y1 - 10}" text-anchor="middle" fill="#d4a373" font-size="11" font-weight="bold">${label}</text>`;
}

function dimLineV(x1: number, y1: number, x2: number, y2: number, label: string): string {
  return `
    <line x1="${x1 - 6}" y1="${y1}" x2="${x1 + 6}" y2="${y1}" stroke="#d4a373"/>
    <line x1="${x1 - 6}" y1="${y2}" x2="${x1 + 6}" y2="${y2}" stroke="#d4a373"/>
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d4a373"/>
    <text x="${x1 - 12}" y="${(y1 + y2) / 2}" text-anchor="end" alignment-baseline="middle" fill="#d4a373" font-size="11" font-weight="bold">${label}</text>`;
}
