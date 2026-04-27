import Link from "next/link";
import { SignupForm } from "./form";

export default function SignupPage() {
  return (
    <>
      <h1 className="text-xl font-semibold mb-1">Criar estúdio</h1>
      <p className="text-sm text-muted mb-6">Trial de 14 dias. Sem cartão.</p>
      <SignupForm />
      <p className="text-xs text-center mt-6">
        Já tens conta?{" "}
        <Link href="/login" className="text-[var(--color-accent)]">
          Entrar
        </Link>
      </p>
    </>
  );
}
