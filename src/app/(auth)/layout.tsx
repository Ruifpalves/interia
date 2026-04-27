import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link href="/" className="text-2xl font-semibold tracking-tight mb-8">
        Interia<span className="text-[var(--color-accent)]">.</span>
      </Link>
      <div className="panel w-full max-w-md p-8">{children}</div>
      <p className="text-xs text-muted mt-6">
        © 2026 Interia · Data Script Swiss GmbH
      </p>
    </div>
  );
}
