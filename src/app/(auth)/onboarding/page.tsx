import { requireSession } from "@/server/queries/workspace";
import { OnboardingFlow } from "./flow";

export default async function OnboardingPage() {
  const session = await requireSession();
  return <OnboardingFlow studioName={session.workspaceName} />;
}
