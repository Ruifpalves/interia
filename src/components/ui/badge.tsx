import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const toneClass: Record<Tone, string> = {
  neutral: "bg-[var(--color-surface-2)] text-[var(--color-fg-muted)] border-[var(--color-border)]",
  success: "bg-[#163b29] text-[#7ee2a3] border-[#1f5538]",
  warning: "bg-[#3b2f15] text-[#fbbf24] border-[#5a4623]",
  danger: "bg-[#3b1c1c] text-[#fca5a5] border-[#5a2929]",
  info: "bg-[#1c2c3b] text-[#7dd3fc] border-[#2c4458]",
  accent: "bg-[#3a2f1f] text-[#d4a373] border-[#5a4732]",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] uppercase tracking-wide rounded border",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
