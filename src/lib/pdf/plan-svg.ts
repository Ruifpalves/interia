// Server-side renderer of PlanState → SVG. Used by both the PDF dossier
// (where we cannot run Konva) and any preview surface that wants a static plan.

import type { PlanState } from "@/types/project";
import { formatM } from "@/lib/utils/format";

const PX = 80; // px per metre
const PAD = 80;

export function renderPlanSvg(
  plan: PlanState,
  { withDimensions = true, theme = "dark" as "dark" | "light", title }: { withDimensions?: boolean; theme?: "dark" | "light"; title?: string } = {},
): string {
  const w = plan.widthM * PX + PAD * 2;
  const h = plan.heightM * PX + PAD * 2 + (title ? 30 : 0);
  const colors =
    theme === "dark"
      ? { bg: "#131316", wall: "#f4f4f5", module: "#2A2A2A", moduleBorder: "#9b9ba3", text: "#9b9ba3", accent: "#d4a373", grid: "#252530" }
      : { bg: "#ffffff", wall: "#1c1c20", module: "#f5f3ef", moduleBorder: "#7c7268", text: "#555", accent: "#a07440", grid: "#eee" };

  const elements: string[] = [];

  // Light grid (every 1 m)
  for (let x = 0; x <= plan.widthM; x++) {
    elements.push(`<line x1="${PAD + x * PX}" y1="${PAD}" x2="${PAD + x * PX}" y2="${PAD + plan.heightM * PX}" stroke="${colors.grid}" stroke-width="0.4" />`);
  }
  for (let y = 0; y <= plan.heightM; y++) {
    elements.push(`<line x1="${PAD}" y1="${PAD + y * PX}" x2="${PAD + plan.widthM * PX}" y2="${PAD + y * PX}" stroke="${colors.grid}" stroke-width="0.4" />`);
  }

  for (const s of plan.shapes) {
    if (s.kind === "wall") {
      const t = Math.max(2, s.thickness * PX);
      elements.push(
        `<line x1="${PAD + s.x1 * PX}" y1="${PAD + s.y1 * PX}" x2="${PAD + s.x2 * PX}" y2="${PAD + s.y2 * PX}" stroke="${colors.wall}" stroke-width="${t}" stroke-linecap="round" />`,
      );
    } else if (s.kind === "module") {
      const x = PAD + s.x * PX;
      const y = PAD + s.y * PX;
      const ww = s.width * PX;
      const hh = s.height * PX;
      const fill = s.fill ?? colors.module;
      elements.push(`<g transform="translate(${x},${y}) rotate(${s.rotation ?? 0})">
        <rect width="${ww}" height="${hh}" fill="${fill}" stroke="${colors.moduleBorder}" stroke-width="1"/>
        ${s.label ? `<text x="6" y="14" fill="${colors.wall}" font-size="11">${escape(s.label)}</text>` : ""}
      </g>`);
    } else if (s.kind === "circle") {
      elements.push(`<g transform="translate(${PAD + s.x * PX},${PAD + s.y * PX})">
        <circle r="${s.radius * PX}" fill="none" stroke="${colors.moduleBorder}" stroke-width="1" stroke-dasharray="6 4" />
        ${s.label ? `<text x="${s.radius * PX + 6}" y="-4" fill="${colors.text}" font-size="10">${escape(s.label)}</text>` : ""}
      </g>`);
    } else if (s.kind === "door") {
      const x = PAD + s.x * PX;
      const y = PAD + s.y * PX;
      const ww = s.width * PX;
      elements.push(`<g transform="translate(${x},${y}) rotate(${s.rotation ?? 0})">
        <path d="M 0 0 A ${ww} ${ww} 0 0 1 ${ww} ${ww}" fill="none" stroke="${colors.accent}" stroke-width="1" stroke-dasharray="3 2" />
        <line x1="0" y1="0" x2="${ww}" y2="0" stroke="${colors.accent}" stroke-width="1.5" />
      </g>`);
    } else if (s.kind === "annotation") {
      elements.push(`<text x="${PAD + s.x * PX}" y="${PAD + s.y * PX}" fill="${colors.text}" font-size="11">${escape(s.text)}</text>`);
    } else if (s.kind === "dimension" && withDimensions) {
      const x1 = PAD + s.x1 * PX;
      const y1 = PAD + s.y1 * PX;
      const x2 = PAD + s.x2 * PX;
      const y2 = PAD + s.y2 * PX;
      const len = s.override ?? Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      elements.push(`
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors.accent}" stroke-width="0.8" />
        <circle cx="${x1}" cy="${y1}" r="2.5" fill="${colors.accent}" />
        <circle cx="${x2}" cy="${y2}" r="2.5" fill="${colors.accent}" />
        <text x="${midX}" y="${midY - 8}" text-anchor="middle" fill="${colors.accent}" font-size="11" font-weight="bold">${formatM(len)}</text>`);
    }
  }

  // Outer dimensions when requested
  if (withDimensions) {
    const totalW = plan.widthM;
    const totalH = plan.heightM;
    elements.push(`
      <text x="${PAD + (totalW * PX) / 2}" y="${PAD - 30}" text-anchor="middle" fill="${colors.accent}" font-size="11" font-weight="bold">${formatM(totalW)} m</text>
      <line x1="${PAD}" y1="${PAD - 18}" x2="${PAD + totalW * PX}" y2="${PAD - 18}" stroke="${colors.accent}" stroke-width="0.5" />
      <text x="${PAD - 24}" y="${PAD + (totalH * PX) / 2}" text-anchor="end" alignment-baseline="middle" fill="${colors.accent}" font-size="11" font-weight="bold">${formatM(totalH)} m</text>
      <line x1="${PAD - 18}" y1="${PAD}" x2="${PAD - 18}" y2="${PAD + totalH * PX}" stroke="${colors.accent}" stroke-width="0.5" />
    `);
  }

  const titleNode = title
    ? `<text x="${w / 2}" y="${h - 14}" text-anchor="middle" fill="${colors.accent}" font-size="13" font-weight="600" font-family="serif">${escape(title)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Inter, sans-serif">
    <rect width="${w}" height="${h}" fill="${colors.bg}" />
    ${elements.join("\n")}
    ${titleNode}
  </svg>`;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
