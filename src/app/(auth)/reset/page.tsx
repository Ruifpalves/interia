import Link from "next/link";
import { ResetForm } from "./form";

export default function ResetPage() {
  return (
    <>
      <h1 className="text-xl font-semibold mb-1">Recuperar password</h1>
      <p className="text-sm text-muted mb-6">Enviamos-te um link para definir uma nova password.</p>
      <ResetForm />
      <p className="text-xs text-center mt-6">
        <Link href="/login" className="text-muted hover:text-[var(--color-fg)]">
          Voltar para entrar
        </Link>
      </p>
    </>
  );
}
