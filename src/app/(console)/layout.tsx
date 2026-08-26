import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { PageTransition } from "@/components/page-transition";
import { RealtimeProvider } from "@/components/realtime-provider";
import { requireProfile, roleLabel } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";
import { getOperationsData } from "@/lib/repositories/operations";

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const { metrics } = await getOperationsData();

  return (
    <RealtimeProvider>
      <AppShell profileName={profile.fullName} profileRole={roleLabel(profile.role)} activeEvents={metrics.activeEvents} signOutAction={signOutAction}>
        <PageTransition className="min-w-0">{children}</PageTransition>
      </AppShell>
    </RealtimeProvider>
  );
}
