"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-state";
import { requireRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth-types";
import { writeAuditLog } from "@/lib/actions/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const roleValues: [AppRole, ...AppRole[]] = [
  "admin",
  "bpbd_operator",
  "field_officer",
  "shelter_manager",
  "warehouse_manager",
  "driver",
  "institution_partner",
  "public_viewer",
];

const approveSchema = z.object({
  id: z.string().uuid("ID akun tidak valid."),
  assignedRole: z.enum(roleValues).optional(),
});

const rejectSchema = z.object({
  id: z.string().uuid("ID akun tidak valid."),
  reason: z.string().optional(),
});

const batchApproveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "Pilih minimal satu akun."),
});

const batchRejectSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "Pilih minimal satu akun."),
  reason: z.string().optional(),
});

export async function approveAccountAction(formData: FormData): Promise<ActionResult> {
  try {
    const operator = await requireRole(["admin", "bpbd_operator"]);
    const parsed = approveSchema.parse({
      id: formData.get("id")?.toString(),
      assignedRole: formData.get("assignedRole")?.toString() || undefined,
    });

    const supabase = await createSupabaseServerClient();
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", parsed.id)
      .single();

    if (fetchError || !profile) {
      return { ok: false, message: "Data profil akun tidak ditemukan." };
    }

    const targetRole: AppRole = parsed.assignedRole || profile.requested_role || "field_officer";

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update({
        app_role: targetRole,
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        verified_by: operator.id,
      })
      .eq("id", parsed.id)
      .select("*")
      .single();

    if (updateError) {
      return { ok: false, message: updateError.message };
    }

    await writeAuditLog({
      actorId: operator.id,
      action: "account.verified",
      targetTable: "profiles",
      targetId: parsed.id,
      beforeData: profile,
      afterData: updated,
    });

    revalidatePath("/akun");
    revalidatePath("/dashboard");
    return { ok: true, message: `Akun ${profile.full_name} berhasil diverifikasi sebagai ${targetRole}.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Gagal memverifikasi akun." };
  }
}

export async function rejectAccountAction(formData: FormData): Promise<ActionResult> {
  try {
    const operator = await requireRole(["admin", "bpbd_operator"]);
    const parsed = rejectSchema.parse({
      id: formData.get("id")?.toString(),
      reason: formData.get("reason")?.toString(),
    });

    const supabase = await createSupabaseServerClient();
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", parsed.id)
      .single();

    if (fetchError || !profile) {
      return { ok: false, message: "Data profil akun tidak ditemukan." };
    }

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update({
        verification_status: "rejected",
        assignment_note: parsed.reason ? `[DITOLAK]: ${parsed.reason}` : profile.assignment_note,
        verified_at: new Date().toISOString(),
        verified_by: operator.id,
      })
      .eq("id", parsed.id)
      .select("*")
      .single();

    if (updateError) {
      return { ok: false, message: updateError.message };
    }

    await writeAuditLog({
      actorId: operator.id,
      action: "account.rejected",
      targetTable: "profiles",
      targetId: parsed.id,
      beforeData: profile,
      afterData: updated,
    });

    revalidatePath("/akun");
    revalidatePath("/dashboard");
    return { ok: true, message: `Pendaftaran akun ${profile.full_name} telah ditolak.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Gagal menolak akun." };
  }
}

export async function batchApproveAccountsAction(ids: string[]): Promise<ActionResult> {
  try {
    const operator = await requireRole(["admin", "bpbd_operator"]);
    const parsed = batchApproveSchema.parse({ ids });

    const supabase = await createSupabaseServerClient();
    const { data: profiles, error: fetchError } = await supabase
      .from("profiles")
      .select("id, full_name, requested_role")
      .in("id", parsed.ids);

    if (fetchError || !profiles || profiles.length === 0) {
      return { ok: false, message: "Tidak ada akun valid yang ditemukan." };
    }

    // Update each account based on their requested_role or default field_officer
    for (const p of profiles) {
      const role = p.requested_role || "field_officer";
      await supabase
        .from("profiles")
        .update({
          app_role: role,
          verification_status: "verified",
          verified_at: new Date().toISOString(),
          verified_by: operator.id,
        })
        .eq("id", p.id);

      await writeAuditLog({
        actorId: operator.id,
        action: "account.batch_verified",
        targetTable: "profiles",
        targetId: p.id,
        afterData: { app_role: role, verification_status: "verified" },
      });
    }

    revalidatePath("/akun");
    revalidatePath("/dashboard");
    return { ok: true, message: `Berhasil menyetujui ${profiles.length} akun personel.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Gagal memproses persetujuan massal." };
  }
}

export async function batchRejectAccountsAction(ids: string[], reason?: string): Promise<ActionResult> {
  try {
    const operator = await requireRole(["admin", "bpbd_operator"]);
    const parsed = batchRejectSchema.parse({ ids, reason });

    const supabase = await createSupabaseServerClient();
    const { data: profiles, error: fetchError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", parsed.ids);

    if (fetchError || !profiles || profiles.length === 0) {
      return { ok: false, message: "Tidak ada akun valid yang ditemukan." };
    }

    for (const p of profiles) {
      await supabase
        .from("profiles")
        .update({
          verification_status: "rejected",
          assignment_note: parsed.reason ? `[DITOLAK MASSAL]: ${parsed.reason}` : null,
          verified_at: new Date().toISOString(),
          verified_by: operator.id,
        })
        .eq("id", p.id);

      await writeAuditLog({
        actorId: operator.id,
        action: "account.batch_rejected",
        targetTable: "profiles",
        targetId: p.id,
        afterData: { verification_status: "rejected", reason: parsed.reason },
      });
    }

    revalidatePath("/akun");
    revalidatePath("/dashboard");
    return { ok: true, message: `Berhasil menolak ${profiles.length} pendaftaran akun.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Gagal memproses penolakan massal." };
  }
}
