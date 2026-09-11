import { cache } from "react";
import type { AppRole, VerificationStatus } from "@/lib/auth-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  app_role: AppRole;
  phone: string | null;
  created_at: string;
  verification_status?: VerificationStatus | null;
  organization?: string | null;
  assignment_note?: string | null;
  requested_role?: AppRole | null;
};

export type AccountItem = {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  phone: string | null;
  createdAt: string;
  isDemo: boolean;
  verificationStatus: VerificationStatus;
  organization: string | null;
  assignmentNote: string | null;
  requestedRole: AppRole | null;
};

const demoAccountEmails = new Set([
  "admin@siagakita.local",
  "operator@siagakita.local",
  "lapangan@siagakita.local",
  "posko@siagakita.local",
  "gudang@siagakita.local",
]);

function mapProfileToAccount(profile: ProfileRow): AccountItem {
  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    role: profile.app_role,
    phone: profile.phone,
    createdAt: new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(new Date(profile.created_at)),
    isDemo: demoAccountEmails.has(profile.email),
    verificationStatus: profile.verification_status || (demoAccountEmails.has(profile.email) ? "verified" : "verified"),
    organization: profile.organization || null,
    assignmentNote: profile.assignment_note || null,
    requestedRole: profile.requested_role || null,
  };
}

export const getAccounts = cache(async (): Promise<AccountItem[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, app_role, phone, created_at, verification_status, organization, assignment_note, requested_role")
    .order("created_at", { ascending: true });

  if (error) {
    // Fallback query if columns not yet applied
    const fallback = await supabase
      .from("profiles")
      .select("id, full_name, email, app_role, phone, created_at")
      .order("created_at", { ascending: true });
    if (fallback.error) throw new Error(fallback.error.message);
    return ((fallback.data ?? []) as ProfileRow[]).map(mapProfileToAccount);
  }

  return ((data ?? []) as ProfileRow[]).map(mapProfileToAccount);
});

export const getPendingAccounts = cache(async (): Promise<AccountItem[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, app_role, phone, created_at, verification_status, organization, assignment_note, requested_role")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return ((data ?? []) as ProfileRow[]).map(mapProfileToAccount);
});

export const getAccountVerificationMetrics = cache(async () => {
  const accounts = await getAccounts();
  const pending = accounts.filter((a) => a.verificationStatus === "pending");
  const verified = accounts.filter((a) => a.verificationStatus === "verified");

  const orgCount = new Set(
    accounts.map((a) => a.organization).filter(Boolean),
  ).size;

  return {
    totalAccounts: accounts.length,
    activeAccounts: verified.length,
    pendingAccounts: pending.length,
    totalOrganizations: orgCount || 4, // 4 demo default
  };
});
