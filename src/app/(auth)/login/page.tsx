import Link from "next/link";
import { LoginForm } from "./form";

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/dashboard";
  return (
    <>
      <h1 className="text-xl font-semibold mb-1">Entrar no estúdio</h1>
      <p className="text-sm text-muted mb-6">Bem-vindo de volta.</p>
      <LoginForm next={next} />
      <div className="flex items-center justify-between mt-6 text-xs">
        <Link href="/reset" className="text-muted hover:text-[var(--color-fg)]">
          Esqueci-me da password
        </Link>
        <Link href="/signup" className="text-[var(--color-accent)]">
          Criar estúdio
        </Link>
      </div>
    </>
  );
}
