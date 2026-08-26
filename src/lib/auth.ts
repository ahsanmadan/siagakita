import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "bpbd_operator" | "field_officer" | "shelter_manager" | "warehouse_manager" | "public_viewer";

export interface CurrentProfile {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
}

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, app_role")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return {
      id: user.id,
      fullName: user.email ?? "Petugas",
      email: user.email ?? "",
      role: "public_viewer",
    };
  }

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    role: data.app_role,
  };
}

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export function roleLabel(role: AppRole) {
  const labels: Record<AppRole, string> = {
    admin: "Administrator",
    bpbd_operator: "Operator BPBD",
    field_officer: "Petugas Lapangan",
    shelter_manager: "Pengelola Posko",
    warehouse_manager: "Pengelola Gudang",
    public_viewer: "Publik",
  };
  return labels[role];
}
