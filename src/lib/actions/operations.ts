"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-state";
import { requireProfile } from "@/lib/auth";
import { writeAuditLog } from "@/lib/actions/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateDisasterRecommendationGroq, triageFieldReportGroq } from "@/lib/ai/groq";
import { getAggregatedExternalAlerts } from "@/lib/repositories/external-alerts";
import { parseZeroGridSms } from "@/lib/sms-parser";

const statusSchema = z.enum(["critical", "major", "warning", "safe"]);
const escalationSchema = z.enum(["Kabupaten", "Provinsi", "Nasional"]);
const distributionStatusSchema = z.enum([
  "menunggu_alokasi",
  "dialokasikan",
  "disiapkan",
  "berangkat",
  "dalam_perjalanan",
  "dalam-perjalanan",
  "tertunda",
  "tiba_di_posko",
  "diterima_posko",
  "diterima",
  "selesai",
  "dibatalkan",
]);
const thirdPartyAidStatusSchema = z.enum(["diterima-gudang", "dialokasikan"]);
const privilegedRoles = ["admin", "bpbd_operator"] as const;
const reportRoles = ["admin", "bpbd_operator", "field_officer"] as const;
const reportVerificationRoles = ["admin", "bpbd_operator"] as const;
const shelterRoles = ["admin", "bpbd_operator", "shelter_manager"] as const;
const warehouseRoles = ["admin", "bpbd_operator", "warehouse_manager"] as const;
const fleetRoles = ["admin", "bpbd_operator", "warehouse_manager", "field_officer", "shelter_manager", "driver"] as const;

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function parseReportGps(summary: string) {
  const match = summary.match(/\[GPS:\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function ok(message: string): ActionResult {
  return { ok: true, message };
}

function actionError(error: unknown): ActionResult {
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      message: "Periksa kembali isian form. Ada data yang belum valid.",
      fieldErrors: z.flattenError(error).fieldErrors,
    };
  }

  if (error instanceof Error) {
    return { ok: false, message: error.message };
  }

  return { ok: false, message: "Aksi belum berhasil diproses. Coba ulangi beberapa saat lagi." };
}

async function runAction(work: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await work();
  } catch (error) {
    return actionError(error);
  }
}

async function requireOneOf(roles: readonly string[]) {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) {
    throw new Error("Peran akun ini tidak memiliki izin untuk menjalankan aksi tersebut.");
  }
  return profile;
}

export async function escalateEventAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(privilegedRoles);
    const parsed = z.object({
      code: z.string().min(1),
      escalationLevel: escalationSchema.default("Provinsi"),
      note: z.string().min(6).default("Permintaan eskalasi dibuat dari ruang operasi."),
    }).parse({
      code: value(formData, "code"),
      escalationLevel: value(formData, "escalationLevel") || "Provinsi",
      note: value(formData, "note") || "Permintaan eskalasi dibuat dari ruang operasi.",
    });

    const supabase = await createSupabaseServerClient();
    const { data: before, error: beforeError } = await supabase
      .from("disaster_events")
      .select("id, status, escalation_level")
      .eq("code", parsed.code)
      .single();
    if (beforeError || !before) throw new Error("Kejadian tidak ditemukan.");

    const { data: updated, error } = await supabase
      .from("disaster_events")
      .update({ escalation_level: parsed.escalationLevel })
      .eq("id", before.id)
      .select("id, status, escalation_level")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("event_status_history").insert({
      event_id: before.id,
      previous_status: before.status,
      next_status: updated.status,
      previous_escalation: before.escalation_level,
      next_escalation: updated.escalation_level,
      note: parsed.note,
      created_by: profile.id,
    });
    await writeAuditLog({ actorId: profile.id, action: "event.escalated", targetTable: "disaster_events", targetId: before.id, beforeData: before, afterData: updated });
    revalidatePath("/dashboard");
    revalidatePath(`/kejadian/${parsed.code}`);
    return ok("Eskalasi kejadian berhasil diperbarui.");
  });
}

export async function verifyReportAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(reportVerificationRoles);
    const code = z.string().min(1).parse(value(formData, "code"));
    const supabase = await createSupabaseServerClient();
    const { data: before, error: beforeError } = await supabase.from("field_reports").select("*").eq("code", code).single();
    if (beforeError || !before) throw new Error("Laporan tidak ditemukan.");
    if (before.event_id) throw new Error("Laporan ini sudah terhubung ke kejadian.");
    if (before.status === "ditolak" || before.status === "duplikat") {
      throw new Error("Laporan yang sudah ditolak atau ditandai duplikat tidak dapat diverifikasi lewat aksi cepat.");
    }
    if (before.status === "dibuka_jadi_kejadian") {
      throw new Error("Laporan ini sudah resmi dibuka menjadi kejadian bencana.");
    }

    const nextStatus = before.status === "baru" || before.status === "perlu_verifikasi" ? "diverifikasi" : "ditindaklanjuti";
    const { data: updated, error } = await supabase.from("field_reports").update({ status: nextStatus }).eq("id", before.id).select("*").single();
    if (error) throw new Error(error.message);

    const { data: verifRow } = await supabase.from("report_verifications").insert({
      report_id: before.id,
      previous_status: before.status,
      status: nextStatus,
      next_status: nextStatus,
      note: nextStatus === "diverifikasi" ? "Laporan telah diverifikasi oleh petugas." : "Laporan masuk tindak lanjut operasional.",
      verified_by: profile.id,
    }).select("id").single();

    const evidencePath = value(formData, "evidencePath") || value(formData, "filePath");
    if (evidencePath && verifRow?.id) {
      await supabase.from("operational_attachments").insert({
        module: "verifications",
        entity_type: "report_verifications",
        entity_id: verifRow.id,
        file_bucket: "operational_evidence",
        file_path: evidencePath,
        original_file_name: evidencePath.split("/").pop() || "bukti-verifikasi.jpg",
        mime_type: "image/jpeg",
        visibility: "internal",
        description: `Bukti verifikasi petugas laporan ${before.code}`,
        uploaded_by: profile.id,
        uploaded_at: new Date().toISOString(),
      });
      await writeAuditLog({
        actorId: profile.id,
        action: "attachment.uploaded",
        targetTable: "report_verifications",
        targetId: verifRow.id,
        afterData: {
          module: "verifications",
          entity_type: "report_verifications",
          entity_id: verifRow.id,
          file_path: evidencePath,
          visibility: "internal",
          uploaded_by: profile.id,
        },
      });
    }
    await writeAuditLog({
      actorId: profile.id,
      action: nextStatus === "diverifikasi" ? "report.verified" : "report.followed_up",
      targetTable: "field_reports",
      targetId: before.id,
      beforeData: before,
      afterData: updated,
    });
    revalidatePath("/laporan");
    revalidatePath("/dashboard");
    revalidatePath("/audit-log");
    return ok(nextStatus === "diverifikasi" ? "Laporan berhasil diverifikasi." : "Laporan berhasil masuk tindak lanjut.");
  });
}

export async function markReportNeedsVerificationAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(reportVerificationRoles);
    const parsed = z.object({
      code: z.string().min(1),
      reason: z.string().min(3).default("Laporan membutuhkan validasi lokasi dan tingkat keparahan lebih lanjut."),
    }).parse({
      code: value(formData, "code"),
      reason: value(formData, "reason") || "Laporan membutuhkan validasi lokasi dan tingkat keparahan lebih lanjut.",
    });

    const supabase = await createSupabaseServerClient();
    const { data: before, error: beforeError } = await supabase.from("field_reports").select("*").eq("code", parsed.code).single();
    if (beforeError || !before) throw new Error("Laporan tidak ditemukan.");
    if (before.event_id) throw new Error("Laporan ini sudah terhubung ke kejadian.");
    if (before.status === "ditolak" || before.status === "duplikat") {
      throw new Error("Laporan yang sudah ditolak atau ditandai duplikat tidak dapat diubah statusnya.");
    }
    if (before.status === "dibuka_jadi_kejadian") {
      throw new Error("Laporan ini sudah resmi dibuka menjadi kejadian bencana.");
    }

    const { data: updated, error } = await supabase
      .from("field_reports")
      .update({ status: "perlu_verifikasi" })
      .eq("id", before.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("report_verifications").insert({
      report_id: before.id,
      previous_status: before.status,
      status: "perlu_verifikasi",
      next_status: "perlu_verifikasi",
      note: parsed.reason,
      verified_by: profile.id,
    });
    await writeAuditLog({
      actorId: profile.id,
      action: "report.needs_verification",
      targetTable: "field_reports",
      targetId: before.id,
      beforeData: before,
      afterData: updated,
    });
    revalidatePath("/laporan");
    revalidatePath("/dashboard");
    revalidatePath("/audit-log");
    return ok(`Laporan ${parsed.code} ditandai perlu verifikasi.`);
  });
}

export async function rejectReportAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(privilegedRoles);
    const parsed = z.object({
      code: z.string().min(1),
      reason: z.string().min(4).default("Laporan dinyatakan tidak valid atau fiktif oleh petugas triase."),
    }).parse({
      code: value(formData, "code"),
      reason: value(formData, "reason") || "Laporan dinyatakan tidak valid atau fiktif oleh petugas triase.",
    });

    const supabase = await createSupabaseServerClient();
    const { data: before, error: beforeError } = await supabase.from("field_reports").select("*").eq("code", parsed.code).single();
    if (beforeError || !before) throw new Error("Laporan tidak ditemukan.");
    if (before.event_id) throw new Error("Laporan ini sudah terhubung ke kejadian dan tidak dapat ditolak.");
    if (before.status === "dibuka_jadi_kejadian") throw new Error("Laporan sudah resmi dibuka menjadi kejadian.");
    if (before.status === "ditolak") throw new Error("Laporan ini sudah ditandai ditolak.");

    const { data: updated, error } = await supabase.from("field_reports").update({ status: "ditolak" }).eq("id", before.id).select("*").single();
    if (error) throw new Error(error.message);

    await supabase.from("report_verifications").insert({
      report_id: before.id,
      previous_status: before.status,
      status: "ditolak",
      next_status: "ditolak",
      note: parsed.reason,
      verified_by: profile.id,
    });
    await writeAuditLog({ actorId: profile.id, action: "report.rejected", targetTable: "field_reports", targetId: before.id, beforeData: before, afterData: updated });
    revalidatePath("/laporan");
    revalidatePath("/dashboard");
    revalidatePath("/audit-log");
    return ok(`Laporan ${parsed.code} berhasil ditandai ditolak.`);
  });
}

export async function markDuplicateReportAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(privilegedRoles);
    const parsed = z.object({
      code: z.string().min(1),
      reason: z.string().min(4).default("Laporan diidentifikasi sebagai duplikat laporan kejadian serupa."),
    }).parse({
      code: value(formData, "code"),
      reason: value(formData, "reason") || "Laporan diidentifikasi sebagai duplikat laporan kejadian serupa.",
    });

    const supabase = await createSupabaseServerClient();
    const { data: before, error: beforeError } = await supabase.from("field_reports").select("*").eq("code", parsed.code).single();
    if (beforeError || !before) throw new Error("Laporan tidak ditemukan.");
    if (before.event_id) throw new Error("Laporan ini sudah terhubung ke kejadian dan tidak dapat ditandai duplikat.");
    if (before.status === "dibuka_jadi_kejadian") throw new Error("Laporan sudah resmi dibuka menjadi kejadian.");
    if (before.status === "duplikat") throw new Error("Laporan ini sudah ditandai sebagai duplikat.");

    const { data: updated, error } = await supabase.from("field_reports").update({ status: "duplikat" }).eq("id", before.id).select("*").single();
    if (error) throw new Error(error.message);

    await supabase.from("report_verifications").insert({
      report_id: before.id,
      previous_status: before.status,
      status: "duplikat",
      next_status: "duplikat",
      note: parsed.reason,
      verified_by: profile.id,
    });
    await writeAuditLog({ actorId: profile.id, action: "report.marked_duplicate", targetTable: "field_reports", targetId: before.id, beforeData: before, afterData: updated });
    revalidatePath("/laporan");
    revalidatePath("/dashboard");
    revalidatePath("/audit-log");
    return ok(`Laporan ${parsed.code} berhasil ditandai sebagai duplikat.`);
  });
}

export async function createReportAction(formData: FormData) {
  return runAction(async () => {
    const parsed = z.object({
      location: z.string().min(3, "Lokasi wajib diisi."),
      reporter: z.string().min(3, "Pelapor wajib diisi."),
      summary: z.string().min(10, "Ringkasan laporan terlalu pendek."),
      channel: z.enum(["Web", "SMS Zero-Grid", "Petugas"]).default("Web"),
      severity: statusSchema.default("warning"),
    }).parse({
      location: value(formData, "location") || "Laporan web",
      reporter: value(formData, "reporter") || "Pelapor baru",
      summary: value(formData, "summary") || "Laporan baru membutuhkan verifikasi petugas.",
      channel: value(formData, "channel") || "Web",
      severity: value(formData, "severity") || "warning",
    });

    const profile = await requireOneOf(reportRoles);
    const supabase = await createSupabaseServerClient();
    const code = `LPR-${Date.now().toString().slice(-5)}`;
    const { data, error } = await supabase.from("field_reports").insert({
      code,
      channel: parsed.channel,
      location: parsed.location,
      reporter: parsed.reporter,
      summary: parsed.summary,
      severity: parsed.severity,
      created_by: profile.id,
    }).select("*").single();
    if (error) throw new Error(error.message);

    await writeAuditLog({ actorId: profile.id, action: "report.created", targetTable: "field_reports", targetId: data.id, afterData: data });
    revalidatePath("/laporan");
    return ok(`Laporan ${code} berhasil dicatat.`);
  });
}

export async function ingestSmsMessageAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(reportRoles);
    const parsed = z.object({
      rawMessage: z.string().min(5, "Pesan SMS terlalu pendek."),
      senderPhone: z.string().default("+628129990112"),
      gateway: z.string().default("Zero-Grid LoRa/SMS Mesh"),
    }).parse({
      rawMessage: value(formData, "rawMessage") || value(formData, "message"),
      senderPhone: value(formData, "senderPhone") || "+628129990112",
      gateway: value(formData, "gateway") || "Zero-Grid LoRa/SMS Mesh",
    });

    const parseResult = parseZeroGridSms(parsed.rawMessage, parsed.senderPhone);
    const supabase = await createSupabaseServerClient();

    // 1. Store raw immutable SMS message
    const { data: smsRow, error: smsError } = await supabase
      .from("sms_messages")
      .insert({
        sender_phone: parsed.senderPhone,
        raw_message: parsed.rawMessage,
        received_at: new Date().toISOString(),
        gateway: parsed.gateway,
        status: "parsed",
      })
      .select("*")
      .single();

    if (smsError || !smsRow) {
      throw new Error(smsError?.message || "Gagal menyimpan pesan SMS.");
    }

    // 2. Store extracted parse results
    const { data: parseRow, error: parseError } = await supabase
      .from("sms_parse_results")
      .insert({
        message_id: smsRow.id,
        location: parseResult.location,
        disaster_type: parseResult.disasterType,
        severity: parseResult.severity,
        needs_summary: parseResult.needsSummary,
        quantity: parseResult.quantity,
        unit: parseResult.unit,
        reporter_name: parseResult.reporterName,
        coordinates: parseResult.coordinates,
        confidence_score: parseResult.confidenceScore,
        parser_version: parseResult.parserVersion,
        parse_error: parseResult.parseError,
        is_accepted: false,
      })
      .select("*")
      .single();

    if (parseError) {
      console.error("Gagal mencatat hasil parsing SMS:", parseError);
    }

    await writeAuditLog({
      actorId: profile.id,
      action: "sms.received_and_parsed",
      targetTable: "sms_messages",
      targetId: smsRow.id,
      afterData: { ...smsRow, parseResult: parseRow },
    });

    revalidatePath("/laporan");
    revalidatePath("/audit-log");
    return ok("Pesan SMS Zero-Grid berhasil diterima dan diekstraksi ke antrean verifikasi.");
  });
}

export async function acceptSmsReportAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(reportVerificationRoles);
    const parsed = z.object({
      messageId: z.string().min(1, "ID pesan SMS diperlukan."),
      location: z.string().min(3, "Lokasi wajib diisi."),
      reporter: z.string().min(3, "Nama pelapor wajib diisi."),
      summary: z.string().min(10, "Ringkasan laporan terlalu pendek."),
      severity: statusSchema.default("major"),
      isEdited: z.string().optional(),
    }).parse({
      messageId: value(formData, "messageId"),
      location: value(formData, "location"),
      reporter: value(formData, "reporter"),
      summary: value(formData, "summary"),
      severity: value(formData, "severity") || "major",
      isEdited: value(formData, "isEdited"),
    });

    const supabase = await createSupabaseServerClient();

    // Check message state
    const { data: sms, error: smsError } = await supabase
      .from("sms_messages")
      .select("*, sms_parse_results(*)")
      .eq("id", parsed.messageId)
      .single();

    if (smsError || !sms) throw new Error("Pesan SMS tidak ditemukan.");
    if (sms.status === "accepted") throw new Error("Pesan SMS ini sudah pernah diterima dan dijadikan laporan lapangan.");

    const code = `LPR-SMS-${Date.now().toString().slice(-5)}`;
    const initialReportStatus = "baru";

    // 1. Create field_report
    const { data: report, error: reportError } = await supabase
      .from("field_reports")
      .insert({
        code,
        channel: "SMS Zero-Grid",
        location: parsed.location,
        reporter: parsed.reporter,
        summary: parsed.summary,
        severity: parsed.severity,
        status: initialReportStatus,
        created_by: profile.id,
      })
      .select("*")
      .single();

    if (reportError || !report) throw new Error(reportError?.message || "Gagal membuat laporan lapangan.");

    // 2. Update sms_messages status and link report
    await supabase
      .from("sms_messages")
      .update({
        status: "accepted",
        field_report_id: report.id,
      })
      .eq("id", sms.id);

    // 3. Update sms_parse_results is_accepted
    await supabase
      .from("sms_parse_results")
      .update({ is_accepted: true })
      .eq("message_id", sms.id);

    // 4. Audit logs
    const actionName = parsed.isEdited === "true" ? "sms.edited_and_accepted" : "sms.accepted";
    await writeAuditLog({
      actorId: profile.id,
      action: actionName,
      targetTable: "sms_messages",
      targetId: sms.id,
      beforeData: sms,
      afterData: { ...sms, status: "accepted", field_report_id: report.id },
    });

    await writeAuditLog({
      actorId: profile.id,
      action: "report.created",
      targetTable: "field_reports",
      targetId: report.id,
      afterData: report,
    });

    revalidatePath("/laporan");
    revalidatePath("/dashboard");
    revalidatePath("/audit-log");
    return ok(`SMS berhasil diterima dan dikonversi menjadi Laporan ${code}.`);
  });
}

export async function rejectSmsAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(reportVerificationRoles);
    const parsed = z.object({
      messageId: z.string().min(1),
      reason: z.string().min(3).default("Pesan tidak relevan atau informasi tidak valid."),
    }).parse({
      messageId: value(formData, "messageId"),
      reason: value(formData, "reason") || "Pesan tidak relevan atau informasi tidak valid.",
    });

    const supabase = await createSupabaseServerClient();
    const { data: sms, error: smsError } = await supabase
      .from("sms_messages")
      .select("*")
      .eq("id", parsed.messageId)
      .single();

    if (smsError || !sms) throw new Error("Pesan SMS tidak ditemukan.");
    if (sms.status === "accepted") throw new Error("Pesan SMS sudah berstatus diterima.");

    const { data: updated, error } = await supabase
      .from("sms_messages")
      .update({ status: "rejected" })
      .eq("id", sms.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      actorId: profile.id,
      action: "sms.rejected",
      targetTable: "sms_messages",
      targetId: sms.id,
      beforeData: sms,
      afterData: { ...updated, reason: parsed.reason },
    });

    revalidatePath("/laporan");
    revalidatePath("/audit-log");
    return ok("Pesan SMS berhasil ditolak.");
  });
}

export async function markDuplicateSmsAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(reportVerificationRoles);
    const parsed = z.object({
      messageId: z.string().min(1),
      reason: z.string().min(3).default("Pesan SMS duplikat dari laporan yang sudah masuk."),
    }).parse({
      messageId: value(formData, "messageId"),
      reason: value(formData, "reason") || "Pesan SMS duplikat dari laporan yang sudah masuk.",
    });

    const supabase = await createSupabaseServerClient();
    const { data: sms, error: smsError } = await supabase
      .from("sms_messages")
      .select("*")
      .eq("id", parsed.messageId)
      .single();

    if (smsError || !sms) throw new Error("Pesan SMS tidak ditemukan.");
    if (sms.status === "accepted") throw new Error("Pesan SMS sudah berstatus diterima.");

    const { data: updated, error } = await supabase
      .from("sms_messages")
      .update({ status: "duplicate" })
      .eq("id", sms.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      actorId: profile.id,
      action: "sms.marked_duplicate",
      targetTable: "sms_messages",
      targetId: sms.id,
      beforeData: sms,
      afterData: { ...updated, reason: parsed.reason },
    });

    revalidatePath("/laporan");
    revalidatePath("/audit-log");
    return ok("Pesan SMS berhasil ditandai sebagai duplikat.");
  });
}

export async function createShelterAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(shelterRoles);
    const parsed = z.object({
      name: z.string().min(3),
      capacity: z.coerce.number().min(1),
    }).parse({
      name: value(formData, "name") || "Posko baru",
      capacity: value(formData, "capacity") || "100",
    });

    const supabase = await createSupabaseServerClient();
    const { data: event } = await supabase.from("disaster_events").select("id, latitude, longitude").eq("state", "active").order("updated_at", { ascending: false }).limit(1).single();
    if (!event) throw new Error("Tidak ada kejadian aktif untuk posko baru.");

    const { data, error } = await supabase.from("shelters").insert({
      code: `psk-${Date.now().toString().slice(-5)}`,
      event_id: event.id,
      name: parsed.name,
      location: "Lokasi perlu dilengkapi",
      status: "warning",
      latitude: event.latitude,
      longitude: event.longitude,
      capacity: parsed.capacity,
    }).select("*").single();
    if (error) throw new Error(error.message);

    await writeAuditLog({ actorId: profile.id, action: "shelter.created", targetTable: "shelters", targetId: data.id, afterData: data });
    revalidatePath("/posko");
    revalidatePath("/dashboard");
    return ok("Posko baru berhasil didaftarkan.");
  });
}

export async function updateDistributionStatusAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(fleetRoles);
    const parsed = z.object({
      code: z.string().min(1),
      status: distributionStatusSchema,
      progress: z.coerce.number().min(0).max(100).optional(),
      note: z.string().optional(),
    }).parse({
      code: value(formData, "code"),
      status: value(formData, "status") || "dalam_perjalanan",
      progress: value(formData, "progress") ? Number(value(formData, "progress")) : undefined,
      note: value(formData, "note") || undefined,
    });

    const supabase = await createSupabaseServerClient();
    const { data: before, error: beforeErr } = await supabase.from("distributions").select("*").eq("code", parsed.code).single();
    if (beforeErr || !before) throw new Error("Distribusi armada tidak ditemukan.");

    const effectiveProgress = parsed.progress != null
      ? parsed.progress
      : parsed.status === "selesai" || parsed.status === "diterima" || parsed.status === "diterima_posko"
        ? 100
        : parsed.status === "tiba_di_posko"
          ? 95
          : parsed.status === "tertunda"
            ? before.progress || 50
            : Math.max(before.progress || 0, 50);

    const { data: updated, error } = await supabase
      .from("distributions")
      .update({
        status: parsed.status,
        progress: effectiveProgress,
        updated_at: new Date().toISOString(),
      })
      .eq("id", before.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("distribution_status_history").insert({
      distribution_id: before.id,
      previous_status: before.status,
      next_status: parsed.status,
      note: parsed.note || `Status distribusi diperbarui menjadi ${parsed.status}.`,
      changed_by: profile.id,
    });

    const auditAction = parsed.status === "tertunda"
      ? "distribution.delayed"
      : parsed.status === "tiba_di_posko"
        ? "distribution.arrived"
        : "distribution.status_updated";

    await writeAuditLog({
      actorId: profile.id,
      action: auditAction,
      targetTable: "distributions",
      targetId: updated.id,
      beforeData: before,
      afterData: updated,
    });

    revalidatePath("/logistik");
    revalidatePath("/peta-publik");
    revalidatePath("/dashboard");
    revalidatePath("/audit-log");
    return ok(`Status distribusi armada ${parsed.code} berhasil diperbarui.`);
  });
}

export async function assignVehicleToDistributionAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(warehouseRoles);
    const parsed = z.object({
      code: z.string().min(1, "Kode distribusi wajib ada."),
      vehicleId: z.string().uuid("Pilihan armada kendaraan wajib valid."),
      driverId: z.string().uuid("Pilihan pengemudi wajib valid."),
      notes: z.string().optional(),
    }).parse({
      code: value(formData, "code"),
      vehicleId: value(formData, "vehicleId"),
      driverId: value(formData, "driverId"),
      notes: value(formData, "notes") || undefined,
    });

    const supabase = await createSupabaseServerClient();
    const { data: dist, error: distErr } = await supabase.from("distributions").select("*").eq("code", parsed.code).single();
    if (distErr || !dist) throw new Error("Distribusi tidak ditemukan.");

    const [{ data: vehicle }, { data: driver }] = await Promise.all([
      supabase.from("vehicles").select("*").eq("id", parsed.vehicleId).single(),
      supabase.from("drivers").select("*").eq("id", parsed.driverId).single(),
    ]);

    if (!vehicle) throw new Error("Armada kendaraan tidak ditemukan.");
    if (!driver) throw new Error("Pengemudi tidak ditemukan.");

    if (profile.role === "warehouse_manager") {
      if (dist.origin_warehouse_id) {
        const { data: canAccessDistWh } = await supabase.rpc("user_can_access_warehouse", { target_warehouse_id: dist.origin_warehouse_id });
        if (!canAccessDistWh) throw new Error("Anda tidak memiliki akses mengelola distribusi dari gudang ini.");
      }
      if (vehicle.warehouse_id) {
        const { data: canAccessVehWh } = await supabase.rpc("user_can_access_warehouse", { target_warehouse_id: vehicle.warehouse_id });
        if (!canAccessVehWh) throw new Error("Anda tidak memiliki akses menugaskan armada dari gudang ini.");
      }
    }

    // Deactivate previous active assignment for this distribution
    await supabase
      .from("distribution_vehicle_assignments")
      .update({ assignment_status: "diganti", updated_at: new Date().toISOString() })
      .eq("distribution_id", dist.id)
      .eq("assignment_status", "aktif");

    // Insert new assignment
    const { data: assignment, error: assignErr } = await supabase
      .from("distribution_vehicle_assignments")
      .insert({
        distribution_id: dist.id,
        vehicle_id: vehicle.id,
        driver_id: driver.id,
        assigned_by: profile.id,
        assignment_status: "aktif",
        notes: parsed.notes || `Penugasan armada ${vehicle.name} (${vehicle.plate_number}) dengan driver ${driver.name}`,
      })
      .select("*")
      .single();
    if (assignErr) throw new Error(assignErr.message);

    // Update vehicle status
    await supabase
      .from("vehicles")
      .update({ operational_status: "bertugas", updated_at: new Date().toISOString() })
      .eq("id", vehicle.id);

    // Update distribution status to dialokasikan if it was waiting
    const shouldUpdateStatus = dist.status === "menunggu_alokasi" || dist.status === "disiapkan";
    const nextStatus = shouldUpdateStatus ? "dialokasikan" : dist.status;

    if (shouldUpdateStatus) {
      await supabase
        .from("distributions")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", dist.id);

      await supabase.from("distribution_status_history").insert({
        distribution_id: dist.id,
        previous_status: dist.status,
        next_status: nextStatus,
        note: `Armada ${vehicle.name} (${vehicle.plate_number}) dan pengemudi ${driver.name} telah ditugaskan.`,
        changed_by: profile.id,
      });
    }

    await writeAuditLog({
      actorId: profile.id,
      action: "distribution.vehicle_assigned",
      targetTable: "distribution_vehicle_assignments",
      targetId: assignment.id,
      afterData: {
        assignment,
        distribution_code: dist.code,
        vehicle_code: vehicle.code,
        plate_number: vehicle.plate_number,
        driver_name: driver.name,
      },
    });

    revalidatePath("/logistik");
    revalidatePath("/dashboard");
    revalidatePath("/audit-log");
    return ok(`Armada ${vehicle.name} (${vehicle.plate_number}) berhasil ditugaskan ke distribusi ${dist.code}.`);
  });
}

export async function updateDeliveryLocationAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(fleetRoles);
    const parsed = z.object({
      code: z.string().min(1, "Kode distribusi wajib ada."),
      status: distributionStatusSchema.default("dalam_perjalanan"),
      locationName: z.string().min(2, "Nama lokasi checkpoint terakhir wajib diisi."),
      latitude: z.coerce.number({ message: "Koordinat latitude tidak valid." }),
      longitude: z.coerce.number({ message: "Koordinat longitude tidak valid." }),
      accuracyMeter: z.coerce.number().optional(),
      progress: z.coerce.number().min(0).max(100).optional(),
      eta: z.string().optional(),
      note: z.string().optional(),
    }).parse({
      code: value(formData, "code"),
      status: value(formData, "status") || "dalam_perjalanan",
      locationName: value(formData, "locationName"),
      latitude: value(formData, "latitude") ? Number(value(formData, "latitude")) : undefined,
      longitude: value(formData, "longitude") ? Number(value(formData, "longitude")) : undefined,
      accuracyMeter: value(formData, "accuracyMeter") ? Number(value(formData, "accuracyMeter")) : undefined,
      progress: value(formData, "progress") ? Number(value(formData, "progress")) : undefined,
      eta: value(formData, "eta") || undefined,
      note: value(formData, "note") || undefined,
    });

    const supabase = await createSupabaseServerClient();
    const { data: before, error: beforeErr } = await supabase
      .from("distributions")
      .select("*")
      .eq("code", parsed.code)
      .single();
    if (beforeErr || !before) throw new Error("Distribusi armada tidak ditemukan.");

    // Fetch active assignment
    const { data: assignment } = await supabase
      .from("distribution_vehicle_assignments")
      .select("*, drivers(*)")
      .eq("distribution_id", before.id)
      .eq("assignment_status", "aktif")
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // If caller is driver, verify that caller is the assigned driver
    if (profile.role === "driver") {
      if (!assignment || assignment.drivers?.profile_id !== profile.id) {
        throw new Error("Anda hanya berwenang memperbarui armada distribusi yang ditugaskan kepada Anda.");
      }
    }

    const effectiveProgress = parsed.progress != null
      ? parsed.progress
      : parsed.status === "tiba_di_posko"
        ? 95
        : parsed.status === "tertunda"
          ? before.progress || 50
          : Math.max(before.progress || 0, 50);

    const trackingSource = profile.role === "driver" ? "manual_driver" : "manual_petugas";

    // 1. Insert into delivery_tracking_updates (Source of truth for manual location checkpoints)
    const { data: trackingRecord, error: trackErr } = await supabase
      .from("delivery_tracking_updates")
      .insert({
        distribution_id: before.id,
        vehicle_id: assignment?.vehicle_id || null,
        driver_id: assignment?.driver_id || null,
        status: parsed.status,
        location_name: parsed.locationName,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        accuracy_meter: parsed.accuracyMeter || null,
        note: parsed.note || null,
        source: trackingSource,
        created_by: profile.id,
      })
      .select("*")
      .single();
    if (trackErr) throw new Error(trackErr.message);

    // 2. Update distributions table
    const updatePayload: Record<string, unknown> = {
      status: parsed.status,
      progress: effectiveProgress,
      last_location_name: parsed.locationName,
      last_latitude: parsed.latitude,
      last_longitude: parsed.longitude,
      last_tracking_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (parsed.eta) {
      updatePayload.eta = parsed.eta;
    }

    const { data: updated, error: updateErr } = await supabase
      .from("distributions")
      .update(updatePayload)
      .eq("id", before.id)
      .select("*")
      .single();
    if (updateErr) throw new Error(updateErr.message);

    // 3. Record status history if status changed or delayed
    if (before.status !== parsed.status || parsed.status === "tertunda") {
      await supabase.from("distribution_status_history").insert({
        distribution_id: before.id,
        previous_status: before.status,
        next_status: parsed.status,
        note: parsed.note || `Lokasi terakhir diperbarui di ${parsed.locationName}.`,
        changed_by: profile.id,
      });
    }

    // 4. Audit Log
    const auditAction = parsed.status === "tertunda"
      ? "distribution.delayed"
      : parsed.status === "tiba_di_posko"
        ? "distribution.arrived"
        : "distribution.location_updated";

    await writeAuditLog({
      actorId: profile.id,
      action: auditAction,
      targetTable: "delivery_tracking_updates",
      targetId: trackingRecord.id,
      beforeData: before,
      afterData: {
        ...updated,
        checkpoint: trackingRecord,
      },
    });

    revalidatePath("/logistik");
    revalidatePath("/peta-publik");
    revalidatePath("/dashboard");
    revalidatePath("/audit-log");

    return ok(`Lokasi terakhir armada ${parsed.code} berhasil diperbarui di "${parsed.locationName}".`);
  });
}

export async function confirmProofOfDeliveryAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(shelterRoles);
    const parsed = z.object({
      code: z.string().min(1, "Kode distribusi wajib ada."),
      receivedBy: z.string().min(2, "Nama petugas penerima posko wajib diisi."),
      receiverNote: z.string().optional(),
      proofPath: z.string().optional(),
    }).parse({
      code: value(formData, "code"),
      receivedBy: value(formData, "receivedBy"),
      receiverNote: value(formData, "receiverNote") || undefined,
      proofPath: value(formData, "proofPath") || undefined,
    });

    const supabase = await createSupabaseServerClient();
    const { data: before, error: beforeErr } = await supabase
      .from("distributions")
      .select("*, destination_shelter_id")
      .eq("code", parsed.code)
      .single();
    if (beforeErr || !before) throw new Error("Distribusi armada tidak ditemukan.");

    if (!before.destination_shelter_id) {
      throw new Error("Distribusi ini belum memiliki posko tujuan.");
    }

    if (profile.role === "shelter_manager") {
      const { data: canAccessShelter } = await supabase.rpc("user_can_access_shelter", {
        target_shelter_id: before.destination_shelter_id,
      });
      if (!canAccessShelter) {
        throw new Error("Anda tidak memiliki izin mengonfirmasi penerimaan untuk posko ini.");
      }
    }

    // 1. Insert proof_of_delivery
    const { data: pod, error: podErr } = await supabase
      .from("proof_of_delivery")
      .insert({
        distribution_id: before.id,
        shelter_id: before.destination_shelter_id,
        received_by: parsed.receivedBy,
        received_by_profile_id: profile.id,
        received_at: new Date().toISOString(),
        receiver_note: parsed.receiverNote || null,
        proof_path: parsed.proofPath || null,
        created_by: profile.id,
      })
      .select("*")
      .single();
    if (podErr) throw new Error(podErr.message);

    // 1b. Connect proof file to operational_attachments if present
    let attachmentId: string | null = null;
    if (parsed.proofPath && pod?.id) {
      const { data: attachData } = await supabase
        .from("operational_attachments")
        .insert({
          module: "deliveries",
          entity_type: "proof_of_delivery",
          entity_id: pod.id,
          file_bucket: "operational_evidence",
          file_path: parsed.proofPath,
          original_file_name: parsed.proofPath.split("/").pop() || "bukti-penerimaan.jpg",
          visibility: "internal",
          description: `Bukti serah terima distribusi ${parsed.code} di posko`,
          uploaded_by: profile.id,
          uploaded_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (attachData?.id) {
        attachmentId = attachData.id;
        await supabase
          .from("proof_of_delivery")
          .update({ attachment_id: attachmentId })
          .eq("id", pod.id);

        await writeAuditLog({
          actorId: profile.id,
          action: "attachment.proof_attached",
          targetTable: "proof_of_delivery",
          targetId: pod.id,
          afterData: {
            attachment_id: attachmentId,
            module: "deliveries",
            entity_type: "proof_of_delivery",
            entity_id: pod.id,
            file_path: parsed.proofPath,
            visibility: "internal",
            uploaded_by: profile.id,
          },
        });
      }
    }

    // 2. Update distribution status to diterima_posko
    const { data: updated, error: distUpdateErr } = await supabase
      .from("distributions")
      .update({
        status: "diterima_posko",
        progress: 100,
        eta: "Tiba & Diterima",
        updated_at: new Date().toISOString(),
      })
      .eq("id", before.id)
      .select("*")
      .single();
    if (distUpdateErr) throw new Error(distUpdateErr.message);

    // 3. Mark active vehicle assignment as selesai and reset vehicle status to siap
    const { data: assignment } = await supabase
      .from("distribution_vehicle_assignments")
      .select("*")
      .eq("distribution_id", before.id)
      .eq("assignment_status", "aktif")
      .maybeSingle();

    if (assignment) {
      await supabase
        .from("distribution_vehicle_assignments")
        .update({ assignment_status: "selesai", updated_at: new Date().toISOString() })
        .eq("id", assignment.id);

      await supabase
        .from("vehicles")
        .update({ operational_status: "siap", updated_at: new Date().toISOString() })
        .eq("id", assignment.vehicle_id);
    }

    // 4. Record status history
    await supabase.from("distribution_status_history").insert({
      distribution_id: before.id,
      previous_status: before.status,
      next_status: "diterima_posko",
      note: `Bantuan telah diterima di posko oleh ${parsed.receivedBy}.${parsed.receiverNote ? " Catatan: " + parsed.receiverNote : ""}`,
      changed_by: profile.id,
    });

    // 5. Audit Log
    await writeAuditLog({
      actorId: profile.id,
      action: "distribution.received",
      targetTable: "proof_of_delivery",
      targetId: pod.id,
      beforeData: before,
      afterData: {
        distribution: updated,
        proof_of_delivery: {
          ...pod,
          attachment_id: attachmentId,
        },
        has_attachment: Boolean(attachmentId),
      },
    });

    revalidatePath("/logistik");
    revalidatePath("/posko");
    revalidatePath("/peta-publik");
    revalidatePath("/dashboard");
    revalidatePath("/audit-log");

    return ok(`Bantuan distribusi ${parsed.code} telah berhasil dikonfirmasi diterima oleh ${parsed.receivedBy}.`);
  });
}

export async function updateFleetCheckpointAction(formData: FormData) {
  return updateDeliveryLocationAction(formData);
}

export async function createDistributionAction() {
  return runAction(async () => {
    const profile = await requireOneOf(warehouseRoles);
    const supabase = await createSupabaseServerClient();
    const [{ data: shelter }, { data: warehouse }] = await Promise.all([
      supabase.from("shelters").select("id").order("last_update", { ascending: false }).limit(1).single(),
      supabase.from("warehouses").select("id").limit(1).single(),
    ]);
    if (!shelter || !warehouse) throw new Error("Posko atau gudang belum tersedia.");

    const { data, error } = await supabase.from("distributions").insert({
      code: `DST-${Date.now().toString().slice(-4)}`,
      destination_shelter_id: shelter.id,
      origin_warehouse_id: warehouse.id,
      cargo_summary: "Alokasi bantuan baru perlu dilengkapi",
      eta: "Menunggu jadwal",
      progress: 0,
      status: "disiapkan",
      institution: "BPBD",
      created_by: profile.id,
    }).select("*").single();
    if (error) throw new Error(error.message);

    await writeAuditLog({ actorId: profile.id, action: "distribution.created", targetTable: "distributions", targetId: data.id, afterData: data });
    revalidatePath("/logistik");
    return ok("Distribusi baru berhasil dibuat.");
  });
}

export async function reviewRecommendationAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(privilegedRoles);
    const id = z.string().uuid().parse(value(formData, "id"));
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("ai_recommendations").update({ reviewed_by: profile.id, reviewed_at: new Date().toISOString() }).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);

    await writeAuditLog({ actorId: profile.id, action: "recommendation.reviewed", targetTable: "ai_recommendations", targetId: id, afterData: data });
    revalidatePath("/dashboard");
    revalidatePath("/posko");
    return ok("Rekomendasi berhasil ditandai sudah ditinjau.");
  });
}

export async function generateAIRecommendationAction() {
  return runAction(async () => {
    const profile = await requireOneOf(["admin", "bpbd_operator", "shelter_manager", "warehouse_manager"]);
    const supabase = await createSupabaseServerClient();

    const [eventsRes, sheltersRes, needsRes, inventoryRes, reportsRes] = await Promise.all([
      supabase.from("disaster_events").select("id, name, location, status, escalation_level").eq("state", "active"),
      supabase.from("shelters").select("id, name, capacity, population_total, children, elderly, pregnant, disability, status"),
      supabase.from("needs").select("id, item, requested, available, unit, urgency, shelters(name)"),
      supabase.from("inventory_items").select("id, item, category, stock, unit, status").eq("status", "critical"),
      supabase.from("field_reports").select("id, reporter, location, summary, severity, status").eq("status", "baru").limit(5),
    ]);

    const events = (eventsRes.data ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      location: e.location,
      status: e.status,
      escalationLevel: e.escalation_level,
    }));

    const shelters = (sheltersRes.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      capacity: s.capacity,
      occupancy: s.population_total,
      children: s.children,
      elderly: s.elderly,
      vulnerable: s.pregnant + s.disability,
      status: s.status,
    }));

    const criticalNeeds = (needsRes.data ?? [])
      .filter((n) => n.urgency === "critical" || n.requested > n.available)
      .map((n) => {
        const shelterObj = Array.isArray(n.shelters) ? n.shelters[0] : n.shelters;
        return {
          item: n.item,
          shelterName: shelterObj?.name || "Posko",
          requested: n.requested,
          available: n.available,
          unit: n.unit,
          urgency: n.urgency,
        };
      });

    const criticalInventory = (inventoryRes.data ?? []).map((i) => ({
      item: i.item,
      category: i.category,
      quantity: i.stock,
      unit: i.unit,
      status: i.status,
    }));

    const unverifiedReports = reportsRes.data ?? [];
    const externalAlertsData = await getAggregatedExternalAlerts().catch(() => null);

    const rec = await generateDisasterRecommendationGroq({
      events,
      shelters,
      criticalNeeds,
      criticalInventory,
      unverifiedReportsCount: unverifiedReports.length,
      recentUrgentReports: unverifiedReports.map((r) => ({
        reporter: r.reporter,
        location: r.location,
        summary: r.summary,
        severity: r.severity,
      })),
      externalAlerts: externalAlertsData ? {
        latestEarthquake: externalAlertsData.latestEarthquake ? {
          title: externalAlertsData.latestEarthquake.name,
          location: externalAlertsData.latestEarthquake.location,
          magnitude: Number(externalAlertsData.latestEarthquake.meta.magnitude) || 0,
          depth: externalAlertsData.latestEarthquake.meta.depth || "10 km",
          potentialTsunami: Boolean(
            externalAlertsData.latestEarthquake.meta.tsunamiPotential &&
            !externalAlertsData.latestEarthquake.meta.tsunamiPotential.toLowerCase().includes("tidak"),
          ),
          time: externalAlertsData.latestEarthquake.updatedAt,
        } : null,
        activeVolcanoes: externalAlertsData.volcanoes.slice(0, 5).map((v) => ({
          name: v.name,
          province: v.location,
          statusLevel: v.meta.volcanoLevel || "Waspada (Level II)",
          dangerRadiusKm: v.meta.dangerRadiusKm || 3,
        })),
      } : undefined,
    });

    const validEventId = events.find((e) => e.id === rec.eventId)?.id ?? events[0]?.id ?? null;
    const validShelterId = shelters.find((s) => s.id === rec.shelterId)?.id ?? shelters[0]?.id ?? null;

    const { data, error } = await supabase
      .from("ai_recommendations")
      .insert({
        event_id: validEventId,
        shelter_id: validShelterId,
        title: rec.title,
        rationale: rec.rationale,
        confidence: rec.confidence,
        priority: rec.priority,
        action: rec.action,
        factors: rec.factors,
        source: `groq (${rec.modelUsed})`,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      actorId: profile.id,
      action: "ai_recommendation.generated_groq",
      targetTable: "ai_recommendations",
      targetId: data.id,
      afterData: data,
    });

    revalidatePath("/dashboard");
    revalidatePath("/posko");
    revalidatePath("/kejadian");
    revalidatePath("/logistik");
    revalidatePath("/audit-log");

    return ok(`Rekomendasi AI berhasil di-generate via Groq (${rec.modelUsed}): "${rec.title}"`);
  });
}

export async function triageReportWithAIAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(reportRoles);
    const code = z.string().min(1).parse(value(formData, "code"));
    const supabase = await createSupabaseServerClient();
    const { data: report, error: reportError } = await supabase
      .from("field_reports")
      .select("*")
      .eq("code", code)
      .single();
    if (reportError || !report) throw new Error("Laporan tidak ditemukan.");

    const analysis = await triageFieldReportGroq({
      reporter: report.reporter,
      location: report.location,
      summary: report.summary,
      channel: report.channel,
    });

    await writeAuditLog({
      actorId: profile.id,
      action: "report.ai_triaged_groq",
      targetTable: "field_reports",
      targetId: report.id,
      beforeData: report,
      afterData: { ...report, aiAnalysis: analysis },
    });

    revalidatePath("/laporan");
    revalidatePath("/dashboard");
    revalidatePath("/audit-log");

    const severityLabel = analysis?.suggestedSeverity ? String(analysis.suggestedSeverity).toUpperCase() : "INFO";
    return ok(`Analisis AI Groq (${severityLabel}): ${analysis?.reason || "Selesai dianalisis"}`);
  });
}

export async function createFieldReport(formData: FormData) {
  return createReportAction(formData);
}

export async function verifyFieldReport(formData: FormData) {
  return verifyReportAction(formData);
}

export async function markFieldReportNeedsVerification(formData: FormData) {
  return markReportNeedsVerificationAction(formData);
}

export async function rejectFieldReport(formData: FormData) {
  return rejectReportAction(formData);
}

export async function markFieldReportDuplicate(formData: FormData) {
  return markDuplicateReportAction(formData);
}

export async function openEventFromReport(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(privilegedRoles);
    const parsed = z.object({
      code: z.string().min(1),
      name: z.string().min(3).default("Kejadian dari laporan terverifikasi"),
      latitude: z.coerce.number().min(-90).max(90).optional(),
      longitude: z.coerce.number().min(-180).max(180).optional(),
      province: z.string().min(2).default("Sumatera Barat"),
    }).parse({
      code: value(formData, "code"),
      name: value(formData, "name") || "Kejadian dari laporan terverifikasi",
      latitude: value(formData, "latitude") || undefined,
      longitude: value(formData, "longitude") || undefined,
      province: value(formData, "province") || "Sumatera Barat",
    });

    const supabase = await createSupabaseServerClient();
    const { data: report, error: reportError } = await supabase.from("field_reports").select("*").eq("code", parsed.code).single();
    if (reportError || !report) throw new Error("Laporan tidak ditemukan.");
    if (report.event_id) throw new Error("Laporan ini sudah terhubung ke kejadian.");
    if (report.status === "baru" || report.status === "perlu_verifikasi") {
      throw new Error("Laporan harus diverifikasi terlebih dahulu sebelum dibuka menjadi kejadian.");
    }
    if (report.status === "ditolak" || report.status === "duplikat") {
      throw new Error("Laporan yang ditolak atau ditandai duplikat tidak dapat dibuka menjadi kejadian.");
    }

    const reportGps = parseReportGps(report.summary ?? "");
    const latitude = parsed.latitude ?? reportGps?.latitude;
    const longitude = parsed.longitude ?? reportGps?.longitude;
    if (latitude === undefined || longitude === undefined) {
      throw new Error("Koordinat kejadian wajib diisi atau pilih laporan warga dengan GPS.");
    }

    const eventCode = `EVT-${Date.now().toString().slice(-6)}`;
    const { data: event, error: eventError } = await supabase.from("disaster_events").insert({
      code: eventCode,
      name: parsed.name,
      disaster_type: "Bencana terverifikasi",
      location: report.location,
      province: parsed.province,
      status: report.severity,
      state: "active",
      escalation_level: "Kabupaten",
      latitude,
      longitude,
      affected_people: 0,
      active_shelters: 0,
      summary: report.summary,
      created_by: profile.id,
    }).select("*").single();
    if (eventError) throw new Error(eventError.message);

    const { data: updatedReport, error: updateError } = await supabase
      .from("field_reports")
      .update({ event_id: event.id, status: "dibuka_jadi_kejadian" })
      .eq("id", report.id)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);

    await supabase.from("report_verifications").insert({
      report_id: report.id,
      previous_status: report.status,
      status: "dibuka_jadi_kejadian",
      next_status: "dibuka_jadi_kejadian",
      note: `Laporan resmi dibuka menjadi kejadian bencana ${eventCode}.`,
      verified_by: profile.id,
    });

    await supabase.from("event_status_history").insert({
      event_id: event.id,
      next_status: event.status,
      next_escalation: event.escalation_level,
      note: "Kejadian dibuka dari laporan yang sudah diverifikasi.",
      created_by: profile.id,
    });

    await writeAuditLog({
      actorId: profile.id,
      action: "event.opened_from_report",
      targetTable: "disaster_events",
      targetId: event.id,
      afterData: { event, report: updatedReport },
    });
    await writeAuditLog({
      actorId: profile.id,
      action: "report.converted_to_event",
      targetTable: "field_reports",
      targetId: report.id,
      beforeData: report,
      afterData: updatedReport,
    });

    revalidatePath("/laporan");
    revalidatePath("/dashboard");
    revalidatePath(`/kejadian/${eventCode}`);
    return ok(`Kejadian ${eventCode} berhasil dibuka dari laporan.`);
  });
}

export async function updateShelterPopulation(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(shelterRoles);
    const parsed = z.object({
      code: z.string().min(1, "Pilih posko yang akan diperbarui."),
      populationTotal: z.coerce.number().min(0),
      children: z.coerce.number().min(0).default(0),
      elderly: z.coerce.number().min(0).default(0),
      pregnant: z.coerce.number().min(0).default(0),
      disability: z.coerce.number().min(0).default(0),
      note: z.string().optional(),
    }).parse({
      code: value(formData, "code"),
      populationTotal: value(formData, "populationTotal") || "0",
      children: value(formData, "children") || "0",
      elderly: value(formData, "elderly") || "0",
      pregnant: value(formData, "pregnant") || "0",
      disability: value(formData, "disability") || "0",
      note: value(formData, "note"),
    });

    const supabase = await createSupabaseServerClient();
    const { data: before, error: beforeError } = await supabase.from("shelters").select("*").eq("code", parsed.code).single();
    if (beforeError || !before) throw new Error("Posko tidak ditemukan.");

    const updatePayload = {
      population_total: parsed.populationTotal,
      children: parsed.children,
      elderly: parsed.elderly,
      pregnant: parsed.pregnant,
      disability: parsed.disability,
      last_update: new Date().toISOString(),
    };
    const { data: updated, error } = await supabase.from("shelters").update(updatePayload).eq("id", before.id).select("*").single();
    if (error) throw new Error(error.message);

    const { data: popUpdate } = await supabase.from("shelter_population_updates").insert({
      shelter_id: before.id,
      population_total: parsed.populationTotal,
      children: parsed.children,
      elderly: parsed.elderly,
      pregnant: parsed.pregnant,
      disability: parsed.disability,
      note: parsed.note || "Pembaruan populasi posko.",
      created_by: profile.id,
    }).select("id").single();

    const docPath = value(formData, "evidencePath") || value(formData, "documentPath") || value(formData, "filePath");
    if (docPath && popUpdate?.id) {
      await supabase.from("operational_attachments").insert({
        module: "shelters",
        entity_type: "shelter_population_updates",
        entity_id: popUpdate.id,
        file_bucket: "operational_evidence",
        file_path: docPath,
        original_file_name: docPath.split("/").pop() || "dokumentasi-posko.jpg",
        mime_type: "image/jpeg",
        visibility: "internal",
        description: `Dokumentasi pembaruan populasi ${before.name}`,
        uploaded_by: profile.id,
        uploaded_at: new Date().toISOString(),
      });
      await writeAuditLog({
        actorId: profile.id,
        action: "attachment.uploaded",
        targetTable: "shelter_population_updates",
        targetId: popUpdate.id,
        afterData: {
          module: "shelters",
          entity_type: "shelter_population_updates",
          entity_id: popUpdate.id,
          file_path: docPath,
          visibility: "internal",
          uploaded_by: profile.id,
        },
      });
    }

    await writeAuditLog({ actorId: profile.id, action: "shelter.population_updated", targetTable: "shelters", targetId: before.id, beforeData: before, afterData: updated });
    revalidatePath("/posko");
    revalidatePath("/dashboard");
    return ok(`Populasi ${before.name} berhasil diperbarui.`);
  });
}

export async function createNeedRequest(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(shelterRoles);
    const parsed = z.object({
      shelterCode: z.string().min(1, "Pilih posko tujuan kebutuhan."),
      item: z.string().min(2),
      category: z.string().min(2).default("Logistik"),
      requested: z.coerce.number().min(1),
      available: z.coerce.number().min(0).default(0),
      unit: z.string().min(1).default("unit"),
      urgency: statusSchema.default("warning"),
    }).parse({
      shelterCode: value(formData, "shelterCode"),
      item: value(formData, "item") || "Kebutuhan baru",
      category: value(formData, "category") || "Logistik",
      requested: value(formData, "requested") || "1",
      available: value(formData, "available") || "0",
      unit: value(formData, "unit") || "unit",
      urgency: value(formData, "urgency") || "warning",
    });

    const supabase = await createSupabaseServerClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.shelterCode);
    const { data: shelter } = await (isUuid
      ? supabase.from("shelters").select("id, name, event_id").eq("id", parsed.shelterCode).single()
      : supabase.from("shelters").select("id, name, event_id").eq("code", parsed.shelterCode).single());
    if (!shelter) throw new Error("Posko tidak ditemukan.");

    // 1. Keep legacy needs table synchronized
    const { data: needData, error: needError } = await supabase.from("needs").insert({
      shelter_id: shelter.id,
      item: parsed.item,
      category: parsed.category,
      requested: parsed.requested,
      available: parsed.available,
      unit: parsed.unit,
      urgency: parsed.urgency,
    }).select("*").single();
    if (needError) throw new Error(needError.message);

    // 2. Create structured aid_requests
    const reqCode = `REQ-${new Date().toISOString().slice(0, 7).replace("-", "")}-${Date.now().toString().slice(-5)}`;
    const { data: aidRequest, error: reqError } = await supabase.from("aid_requests").insert({
      code: reqCode,
      shelter_id: shelter.id,
      event_id: shelter.event_id,
      status: "diajukan",
      priority: parsed.urgency,
      notes: `Pengajuan kebutuhan ${parsed.item} untuk ${shelter.name}.`,
      requested_by: profile.id,
    }).select("*").single();
    if (reqError) throw new Error(reqError.message);

    // 3. Create structured aid_request_items
    const { data: itemRow, error: itemError } = await supabase.from("aid_request_items").insert({
      request_id: aidRequest.id,
      item: parsed.item,
      category: parsed.category,
      requested_quantity: parsed.requested,
      allocated_quantity: parsed.available,
      fulfilled_quantity: 0,
      unit: parsed.unit,
      urgency: parsed.urgency,
      notes: null,
      fulfillment_status: "menunggu",
      legacy_need_id: needData.id,
    }).select("*").single();
    if (itemError) throw new Error(itemError.message);

    await writeAuditLog({
      actorId: profile.id,
      action: "aid_request.submitted",
      targetTable: "aid_requests",
      targetId: aidRequest.id,
      afterData: { ...aidRequest, items: [itemRow] },
    });
    await writeAuditLog({
      actorId: profile.id,
      action: "need.requested",
      targetTable: "needs",
      targetId: needData.id,
      afterData: needData,
    });

    revalidatePath("/posko");
    revalidatePath("/logistik");
    revalidatePath("/dashboard");
    revalidatePath("/audit-log");
    return ok(`Pengajuan ${parsed.item} (${parsed.requested} ${parsed.unit}) untuk ${shelter.name} berhasil diajukan.`);
  });
}

export async function reviewAidRequestAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(warehouseRoles);
    const parsed = z.object({
      id: z.string().uuid("ID pengajuan tidak valid."),
      notes: z.string().optional(),
    }).parse({
      id: value(formData, "id"),
      notes: value(formData, "notes"),
    });

    const supabase = await createSupabaseServerClient();
    const { data: before, error: beforeError } = await supabase
      .from("aid_requests")
      .select("*")
      .eq("id", parsed.id)
      .single();

    if (beforeError || !before) throw new Error("Pengajuan bantuan tidak ditemukan.");

    const { data: updated, error } = await supabase
      .from("aid_requests")
      .update({
        status: "ditinjau",
        notes: parsed.notes || before.notes,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", before.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      actorId: profile.id,
      action: "aid_request.reviewed",
      targetTable: "aid_requests",
      targetId: before.id,
      beforeData: before,
      afterData: updated,
    });

    revalidatePath("/posko");
    revalidatePath("/logistik");
    revalidatePath("/dashboard");
    revalidatePath("/audit-log");
    return ok(`Pengajuan ${before.code} berhasil ditinjau.`);
  });
}

export async function rejectAidRequestAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(warehouseRoles);
    const parsed = z.object({
      id: z.string().uuid("ID pengajuan tidak valid."),
      reason: z.string().min(3).default("Stok tidak tersedia atau pengajuan tidak sesuai kriteria."),
    }).parse({
      id: value(formData, "id"),
      reason: value(formData, "reason") || "Stok tidak tersedia atau pengajuan tidak sesuai kriteria.",
    });

    const supabase = await createSupabaseServerClient();
    const { data: before, error: beforeError } = await supabase
      .from("aid_requests")
      .select("*")
      .eq("id", parsed.id)
      .single();

    if (beforeError || !before) throw new Error("Pengajuan bantuan tidak ditemukan.");

    const { data: updated, error } = await supabase
      .from("aid_requests")
      .update({
        status: "ditolak",
        notes: parsed.reason,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", before.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      actorId: profile.id,
      action: "aid_request.rejected",
      targetTable: "aid_requests",
      targetId: before.id,
      beforeData: before,
      afterData: updated,
    });

    revalidatePath("/posko");
    revalidatePath("/logistik");
    revalidatePath("/dashboard");
    revalidatePath("/audit-log");
    return ok(`Pengajuan ${before.code} berhasil ditolak.`);
  });
}

export async function allocateDistribution(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(warehouseRoles);
    const parsed = z.object({
      shelterCode: z.string().min(1, "Pilih posko tujuan."),
      inventoryItemId: z.string().uuid("Pilih item stok yang valid."),
      quantity: z.coerce.number().min(1),
      eta: z.string().min(3).default("Hari ini"),
      priority: statusSchema.default("warning"),
      notes: z.string().optional(),
      requestItemId: z.string().uuid().optional(),
    }).parse({
      shelterCode: value(formData, "shelterCode"),
      inventoryItemId: value(formData, "inventoryItemId"),
      quantity: value(formData, "quantity") || "1",
      eta: value(formData, "eta") || "Hari ini",
      priority: value(formData, "priority") || "warning",
      notes: value(formData, "notes"),
      requestItemId: value(formData, "requestItemId") || undefined,
    });

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("allocate_distribution_atomic", {
      p_inventory_item_id: parsed.inventoryItemId,
      p_shelter_code: parsed.shelterCode,
      p_quantity: parsed.quantity,
      p_eta: parsed.eta,
      p_priority: parsed.priority,
      p_notes: parsed.notes || null,
    });
    if (error) throw new Error(error.message);

    const result = data as { distribution_id?: string; distribution_code?: string; inventory?: unknown } | null;

    // Resolve shelter and inventory item to link aid_allocations
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.shelterCode);
    const { data: shelter } = await (isUuid
      ? supabase.from("shelters").select("id, name").eq("id", parsed.shelterCode).single()
      : supabase.from("shelters").select("id, name").eq("code", parsed.shelterCode).single());

    const { data: invItem } = await supabase
      .from("inventory_items")
      .select("id, item, warehouse_id")
      .eq("id", parsed.inventoryItemId)
      .single();

    if (shelter && invItem) {
      // Find candidate aid_request_item
      let targetReqItem = null;
      if (parsed.requestItemId) {
        const { data: reqItem } = await supabase
          .from("aid_request_items")
          .select("*, aid_requests!inner(id, shelter_id, status)")
          .eq("id", parsed.requestItemId)
          .single();
        targetReqItem = reqItem;
      } else {
        const { data: candidateItems } = await supabase
          .from("aid_request_items")
          .select("*, aid_requests!inner(id, shelter_id, status)")
          .eq("aid_requests.shelter_id", shelter.id)
          .in("fulfillment_status", ["menunggu", "sebagian"])
          .ilike("item", `%${invItem.item}%`)
          .limit(1);
        targetReqItem = candidateItems?.[0] || null;
      }

      if (targetReqItem) {
        const { data: allocRow } = await supabase.from("aid_allocations").insert({
          request_item_id: targetReqItem.id,
          warehouse_id: invItem.warehouse_id,
          inventory_item_id: invItem.id,
          allocated_quantity: parsed.quantity,
          allocation_status: "dialokasikan",
          allocated_by: profile.id,
          distribution_id: result?.distribution_id,
          notes: parsed.notes || null,
        }).select("*").single();

        const newAllocated = (targetReqItem.allocated_quantity || 0) + parsed.quantity;
        const newFulfillStatus = newAllocated >= targetReqItem.requested_quantity ? "dialokasikan" : "sebagian";
        await supabase.from("aid_request_items").update({
          allocated_quantity: newAllocated,
          fulfillment_status: newFulfillStatus,
        }).eq("id", targetReqItem.id);

        const newReqStatus = newFulfillStatus === "dialokasikan" ? "dialokasikan" : "sebagian_dialokasikan";
        await supabase.from("aid_requests").update({
          status: newReqStatus,
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
        }).eq("id", targetReqItem.request_id);

        if (targetReqItem.legacy_need_id) {
          await supabase.from("needs").update({
            available: newAllocated,
          }).eq("id", targetReqItem.legacy_need_id);
        }

        await writeAuditLog({
          actorId: profile.id,
          action: "aid_allocation.created",
          targetTable: "aid_allocations",
          targetId: allocRow?.id ?? null,
          afterData: allocRow,
        });

        await writeAuditLog({
          actorId: profile.id,
          action: newReqStatus === "dialokasikan" ? "aid_request.allocated" : "aid_request.partially_fulfilled",
          targetTable: "aid_requests",
          targetId: targetReqItem.request_id,
          afterData: { status: newReqStatus, allocated: newAllocated },
        });
      }
    }

    await writeAuditLog({
      actorId: profile.id,
      action: "distribution.allocated",
      targetTable: "distributions",
      targetId: result?.distribution_id ?? null,
      afterData: data,
    });
    revalidatePath("/logistik");
    revalidatePath("/posko");
    revalidatePath("/dashboard");
    return ok(`Distribusi ${result?.distribution_code ?? "baru"} berhasil dialokasikan.`);
  });
}

export async function createThirdPartyAid(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(["admin", "bpbd_operator", "institution_partner"]);
    const parsed = z.object({
      sourceName: z.string().min(3, "Nama sumber bantuan wajib diisi."),
      cargo: z.string().min(3, "Jenis bantuan wajib diisi."),
      quantity: z.coerce.number().int().min(1, "Jumlah bantuan minimal 1."),
      unit: z.string().min(1, "Satuan wajib diisi."),
    }).parse({
      sourceName: value(formData, "sourceName"),
      cargo: value(formData, "cargo"),
      quantity: value(formData, "quantity"),
      unit: value(formData, "unit") || "unit",
    });

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("third_party_aids").insert({
      source_name: parsed.sourceName,
      cargo: parsed.cargo,
      quantity: parsed.quantity,
      unit: parsed.unit,
      status: "menunggu-pencocokan",
      created_by: profile.id,
    }).select("*").single();
    if (error) throw new Error(error.message);

    await writeAuditLog({ actorId: profile.id, action: "third_party_aid.created", targetTable: "third_party_aids", targetId: data.id, afterData: data });
    revalidatePath("/logistik");
    revalidatePath("/audit-log");
    return ok(`Bantuan dari ${parsed.sourceName} berhasil dicatat.`);
  });
}

export async function updateThirdPartyAidStatus(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(warehouseRoles);
    const parsed = z.object({
      id: z.string().uuid("Bantuan tidak valid."),
      status: thirdPartyAidStatusSchema,
      warehouseId: z.string().uuid("Pilih gudang tujuan.").optional(),
      note: z.string().optional(),
    }).parse({
      id: value(formData, "id"),
      status: value(formData, "status") || "diterima-gudang",
      warehouseId: value(formData, "warehouseId") || undefined,
      note: value(formData, "note"),
    });

    const supabase = await createSupabaseServerClient();
    const { data: before, error: beforeError } = await supabase.from("third_party_aids").select("*").eq("id", parsed.id).single();
    if (beforeError || !before) throw new Error("Bantuan pihak ketiga tidak ditemukan.");

    const warehouseId = parsed.warehouseId ?? before.warehouse_id;
    if (!warehouseId) throw new Error("Pilih gudang sebelum bantuan dapat diterima atau dialokasikan.");
    if (before.status === "dialokasikan" && parsed.status !== "dialokasikan") {
      throw new Error("Bantuan yang sudah dialokasikan tidak dapat dikembalikan lewat aksi cepat ini.");
    }

    const { data: warehouse, error: warehouseError } = await supabase.from("warehouses").select("id, name").eq("id", warehouseId).single();
    if (warehouseError || !warehouse) throw new Error("Gudang tujuan tidak ditemukan atau tidak dapat diakses akun ini.");

    const { data, error } = await supabase
      .from("third_party_aids")
      .update({
        status: parsed.status,
        warehouse_id: warehouse.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", before.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await writeAuditLog({
      actorId: profile.id,
      action: parsed.status === "diterima-gudang" ? "third_party_aid.received_at_warehouse" : "third_party_aid.allocated",
      targetTable: "third_party_aids",
      targetId: before.id,
      beforeData: before,
      afterData: { ...data, note: parsed.note || null },
    });
    revalidatePath("/logistik");
    revalidatePath("/audit-log");
    return ok(parsed.status === "diterima-gudang" ? `Bantuan berhasil divalidasi ke ${warehouse.name}.` : "Bantuan berhasil ditandai dialokasikan.");
  });
}

export async function confirmDistributionReceived(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(["admin", "bpbd_operator", "warehouse_manager", "shelter_manager"]);
    const code = z.string().min(1).parse(value(formData, "code"));
    const supabase = await createSupabaseServerClient();
    const { data: before, error: beforeError } = await supabase.from("distributions").select("*").eq("code", code).single();
    if (beforeError || !before) throw new Error("Distribusi tidak ditemukan.");

    const { data: updatedDist, error } = await supabase
      .from("distributions")
      .update({ status: "diterima", progress: 100 })
      .eq("id", before.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // 1. Process linked aid_allocations
    const { data: allocations } = await supabase
      .from("aid_allocations")
      .select("*, aid_request_items(*)")
      .eq("distribution_id", before.id);

    if (allocations && allocations.length > 0) {
      for (const alloc of allocations) {
        await supabase
          .from("aid_allocations")
          .update({ allocation_status: "diterima" })
          .eq("id", alloc.id);

        // Deduct inventory stock and reserved
        const { data: inv } = await supabase
          .from("inventory_items")
          .select("*")
          .eq("id", alloc.inventory_item_id)
          .single();

        if (inv) {
          const nextStock = Math.max(0, inv.stock - alloc.allocated_quantity);
          const nextReserved = Math.max(0, inv.reserved - alloc.allocated_quantity);
          await supabase.from("inventory_items").update({
            stock: nextStock,
            reserved: nextReserved,
          }).eq("id", inv.id);

          // Record stock movement OUT
          await supabase.from("stock_movements").insert({
            inventory_item_id: inv.id,
            movement_type: "out",
            quantity: alloc.allocated_quantity,
            note: `Distribusi ${before.code} diterima di posko tujuan.`,
            created_by: profile.id,
          });
        }

        // Update aid_request_item & aid_request
        const reqItem = alloc.aid_request_items;
        if (reqItem) {
          const newFulfilled = (reqItem.fulfilled_quantity || 0) + alloc.allocated_quantity;
          const isFull = newFulfilled >= reqItem.requested_quantity;
          await supabase.from("aid_request_items").update({
            fulfilled_quantity: newFulfilled,
            fulfillment_status: isFull ? "terpenuhi" : "sebagian",
          }).eq("id", reqItem.id);

          await supabase.from("aid_requests").update({
            status: isFull ? "terpenuhi" : "sebagian_dialokasikan",
          }).eq("id", reqItem.request_id);

          if (reqItem.legacy_need_id) {
            await supabase.from("needs").update({
              available: newFulfilled,
            }).eq("id", reqItem.legacy_need_id);
          }

          if (isFull) {
            await writeAuditLog({
              actorId: profile.id,
              action: "aid_request.fulfilled",
              targetTable: "aid_requests",
              targetId: reqItem.request_id,
              afterData: { status: "terpenuhi", fulfilledQuantity: newFulfilled },
            });
          }
        }

        await writeAuditLog({
          actorId: profile.id,
          action: "aid_allocation.delivered",
          targetTable: "aid_allocations",
          targetId: alloc.id,
          afterData: { ...alloc, allocation_status: "diterima" },
        });
      }
    } else {
      // Fallback for legacy distributions without aid_allocations
      const { data: distItems } = await supabase
        .from("distribution_items")
        .select("*")
        .eq("distribution_id", before.id);

      for (const di of distItems || []) {
        if (di.inventory_item_id) {
          const { data: inv } = await supabase
            .from("inventory_items")
            .select("*")
            .eq("id", di.inventory_item_id)
            .single();

          if (inv) {
            const nextStock = Math.max(0, inv.stock - di.quantity);
            const nextReserved = Math.max(0, inv.reserved - di.quantity);
            await supabase.from("inventory_items").update({
              stock: nextStock,
              reserved: nextReserved,
            }).eq("id", inv.id);

            await supabase.from("stock_movements").insert({
              inventory_item_id: inv.id,
              movement_type: "out",
              quantity: di.quantity,
              note: `Distribusi ${before.code} diterima di posko tujuan.`,
              created_by: profile.id,
            });
          }
        }
      }
    }

    await writeAuditLog({
      actorId: profile.id,
      action: "distribution.received",
      targetTable: "distributions",
      targetId: before.id,
      beforeData: before,
      afterData: updatedDist,
    });

    revalidatePath("/logistik");
    revalidatePath("/posko");
    revalidatePath("/dashboard");
    revalidatePath("/audit-log");
    return ok(`Distribusi ${code} berhasil dikonfirmasi diterima.`);
  });
}

