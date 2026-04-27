"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const tabs = [
  { slug: "inputs", label: "Inputs" },
  { slug: "plan", label: "Planta" },
  { slug: "style", label: "Estilo" },
  { slug: "renders", label: "Renders" },
  { slug: "technical", label: "Técnico" },
  { slug: "presentation", label: "Apresentação" },
  { slug: "delivery", label: "Entrega" },
  { slug: "settings", label: "Definições" },
];

export function ProjectTabs({ projectId }: { projectId: string }) {
  const path = usePathname();
  return (
    <nav className="border-b border-[var(--color-border)] flex gap-1 px-6 bg-[var(--color-surface)] overflow-x-auto">
      {tabs.map((t) => {
        const href = `/projects/${projectId}/${t.slug}`;
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link
            key={t.slug}
            href={href}
            className={cn(
              "px-3 py-3 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap",
              active
                ? "border-[var(--color-accent)] text-[var(--color-fg)]"
                : "border-transparent text-muted hover:text-[var(--color-fg)]",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
