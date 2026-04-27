"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserCircle2,
  Settings,
  CreditCard,
  LogOut,
} from "lucide-react";
import { logoutAction } from "@/server/actions/auth";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projetos", icon: FolderKanban },
  { href: "/clients", label: "Clientes", icon: UserCircle2 },
  { href: "/team", label: "Equipa", icon: Users },
  { href: "/settings", label: "Definições", icon: Settings },
  { href: "/billing", label: "Faturação", icon: CreditCard },
];

export function Sidebar({ studioName }: { studioName: string }) {
  const path = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-[var(--color-border)] flex flex-col">
      <div className="p-4 border-b border-[var(--color-border)]">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          Studio<span className="text-[var(--color-accent)]">.ai</span>
        </Link>
        <p className="text-xs text-muted mt-1 truncate">{studioName}</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const active = path === it.href || path.startsWith(it.href + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-[var(--color-surface-2)] text-[var(--color-fg)]"
                  : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]",
              )}
            >
              <Icon size={16} />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <form action={logoutAction} className="p-3 border-t border-[var(--color-border)]">
        <button
          type="submit"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-2)] w-full"
        >
          <LogOut size={16} /> Sair
        </button>
      </form>
    </aside>
  );
}
