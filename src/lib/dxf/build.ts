// Minimal DXF writer producing a layered AutoCAD R12-compatible file.
// dxf-writer would also work, but we hand-craft to avoid pulling in the
// CommonJS variant during edge-incompatible build paths.

import type { ModuleShape, PlanState } from "@/types/project";

const HEADER = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1009
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
4
0
LAYER
2
contour
70
0
62
7
6
CONTINUOUS
0
LAYER
2
dimensions
70
0
62
2
6
CONTINUOUS
0
LAYER
2
annotations
70
0
62
4
6
CONTINUOUS
0
LAYER
2
internal
70
0
62
8
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES`;

const FOOTER = `0
ENDSEC
0
EOF`;

function rect(layer: string, x: number, y: number, w: number, h: number): string {
  const x2 = x + w;
  const y2 = y + h;
  return `
0
LWPOLYLINE
8
${layer}
90
4
70
1
10
${x.toFixed(3)}
20
${y.toFixed(3)}
10
${x2.toFixed(3)}
20
${y.toFixed(3)}
10
${x2.toFixed(3)}
20
${y2.toFixed(3)}
10
${x.toFixed(3)}
20
${y2.toFixed(3)}`.trim();
}

function text(layer: string, x: number, y: number, value: string, height = 0.05): string {
  return `
0
TEXT
8
${layer}
10
${x.toFixed(3)}
20
${y.toFixed(3)}
40
${height}
1
${value.replace(/\n/g, " ")}`.trim();
}

export function buildDxfFromPlan(plan: PlanState): string {
  const modules = plan.shapes.filter((s): s is ModuleShape => s.kind === "module");
  const lines: string[] = [HEADER];

  // Outer contour
  lines.push(rect("contour", 0, 0, plan.widthM, plan.heightM));

  for (const m of modules) {
    lines.push(rect("contour", m.x, m.y, m.width, m.height));
    if (m.label) {
      lines.push(text("annotations", m.x + 0.02, m.y + 0.02, m.label));
    }
    // Two internal shelves
    const shelfY1 = m.y + m.height / 3;
    const shelfY2 = m.y + (2 * m.height) / 3;
    lines.push(rect("internal", m.x, shelfY1, m.width, 0.001));
    lines.push(rect("internal", m.x, shelfY2, m.width, 0.001));
  }

  // Width dimension at the top
  lines.push(text("dimensions", plan.widthM / 2 - 0.1, -0.15, plan.widthM.toFixed(3).replace(".", ",")));
  // Height dimension at left
  lines.push(text("dimensions", -0.25, plan.heightM / 2, plan.heightM.toFixed(3).replace(".", ",")));

  lines.push(FOOTER);
  return lines.join("\n");
}
