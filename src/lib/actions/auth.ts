"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LoginState {
  error?: string;
}

export interface SignUpState {
  error?: string;
  success?: boolean;
  message?: string;
}

const loginSchema = z.object({
  email: z.string().email("Email tidak valid."),
  password: z.string().min(6, "Kata sandi minimal 6 karakter."),
  next: z.string().optional(),
});

const signUpSchema = z
  .object({
    fullName: z.string().min(2, "Nama lengkap minimal 2 karakter."),
    email: z.string().email("Email tidak valid."),
    phone: z.string().min(8, "Nomor WhatsApp/HP minimal 8 digit."),
    organization: z.string().min(2, "Pilih atau tulis nama instansi/organisasi."),
    requestedRole: z.enum(["field_officer", "shelter_manager", "warehouse_manager"]),
    assignmentNote: z.string().optional(),
    password: z.string().min(6, "Kata sandi minimal 6 karakter."),
    confirmPassword: z.string().min(6, "Konfirmasi kata sandi minimal 6 karakter."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Kata sandi dan konfirmasi kata sandi tidak cocok.",
    path: ["confirmPassword"],
  });

export async function signInAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next")?.toString(),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data login tidak valid." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Email atau kata sandi tidak sesuai." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("app_role, verification_status, full_name")
      .eq("id", user.id)
      .single();

    if (profile?.verification_status === "pending") {
      await supabase.auth.signOut();
      return {
        error: `Halo ${profile.full_name}, akun Anda masih dalam antrean verifikasi oleh Koordinator BPBD. Hubungi command center untuk aktivasi.`,
      };
    }

    if (profile?.verification_status === "rejected") {
      await supabase.auth.signOut();
      return {
        error: "Pendaftaran akun Anda ditolak oleh Operator BPBD. Silakan hubungi pos komando terkait.",
      };
    }
  }

  redirect(parsed.data.next || "/dashboard");
}

export async function signUpAction(_state: SignUpState, formData: FormData): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    organization: formData.get("organization"),
    requestedRole: formData.get("requestedRole"),
    assignmentNote: formData.get("assignmentNote"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Periksa kembali data pendaftaran Anda." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        organization: parsed.data.organization,
        requested_role: parsed.data.requestedRole,
      },
    },
  });

  if (authError || !authData.user) {
    return { error: authError?.message || "Gagal membuat akun. Silakan coba lagi." };
  }

  // Insert or upsert to public.profiles with verification_status = 'pending'
  try {
    await supabase.from("profiles").upsert({
      id: authData.user.id,
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      app_role: "public_viewer",
      verification_status: "pending",
      requested_role: parsed.data.requestedRole,
      organization: parsed.data.organization,
      assignment_note: parsed.data.assignmentNote || null,
    });
  } catch {
    // Fallback if migration columns are missing
    try {
      await supabase.from("profiles").upsert({
        id: authData.user.id,
        full_name: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        app_role: "public_viewer",
      });
    } catch {
      // ignore
    }
  }

  try {
    const { writeAuditLog } = await import("@/lib/actions/audit");
    await writeAuditLog({
      actorId: authData.user.id,
      action: "auth.registered_pending",
      targetTable: "profiles",
      targetId: authData.user.id,
      afterData: {
        email: parsed.data.email,
        organization: parsed.data.organization,
        requested_role: parsed.data.requestedRole,
      },
    });
  } catch {
    // Non-critical audit log error
  }

  await supabase.auth.signOut();

  return {
    success: true,
    message: `Pendaftaran berhasil! Akun ${parsed.data.fullName} (${parsed.data.organization}) telah masuk ke antrean verifikasi Koordinator BPBD.`,
  };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
