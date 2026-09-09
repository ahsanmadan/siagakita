import { cache } from "react";
import type { AppRole } from "@/lib/auth-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  app_role: AppRole;
  phone: string | null;
  created_at: string;
};

export type AccountItem = {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  phone: string | null;
  createdAt: string;
  isDemo: boolean;
};

const demoAccountEmails = new Set([
  "admin@siagakita.local",
  "operator@siagakita.local",
  "lapangan@siagakita.local",
  "posko@siagakita.local",
  "gudang@siagakita.local",
]);

export const getAccounts = cache(async (): Promise<AccountItem[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, app_role, phone, created_at")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as ProfileRow[]).map((profile) => ({
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
  }));
});
