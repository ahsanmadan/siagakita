import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole, CurrentProfile } from "./auth-types";

export { auth } from "./better-auth";
export * from "./auth-types";

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

export async function requireRole(allowedRoles: readonly AppRole[], fallback = "/dashboard") {
  const profile = await requireProfile();
  if (!allowedRoles.includes(profile.role)) redirect(fallback);
  return profile;
}
