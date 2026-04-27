import { Sidebar } from "@/components/app/sidebar";
import { requireSession } from "@/server/queries/workspace";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <div className="flex min-h-screen">
      <Sidebar studioName={session.workspaceName} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
