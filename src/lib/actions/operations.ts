"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-state";
import { requireProfile } from "@/lib/auth";
import { writeAuditLog } from "@/lib/actions/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateDisasterRecommendationGroq, triageFieldReportGroq } from "@/lib/ai/groq";
import { getAggregatedExternalAlerts } from "@/lib/repositories/external-alerts";

const statusSchema = z.enum(["critical", "major", "warning", "safe"]);
const escalationSchema = z.enum(["Kabupaten", "Provinsi", "Nasional"]);
const distributionStatusSchema = z.enum(["disiapkan", "dalam-perjalanan", "diterima"]);
const thirdPartyAidStatusSchema = z.enum(["diterima-gudang", "dialokasikan"]);
const privilegedRoles = ["admin", "bpbd_operator"] as const;
const reportRoles = ["admin", "bpbd_operator", "field_officer"] as const;
const reportVerificationRoles = ["admin", "bpbd_operator"] as const;
const shelterRoles = ["admin", "bpbd_operator", "shelter_manager"] as const;
const warehouseRoles = ["admin", "bpbd_operator", "warehouse_manager"] as const;

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
    if (before.status === "ditolak") throw new Error("Laporan yang sudah ditolak tidak dapat diverifikasi lewat aksi cepat.");

    const nextStatus = before.status === "baru" ? "diverifikasi" : "ditindaklanjuti";
    const { data: updated, error } = await supabase.from("field_reports").update({ status: nextStatus }).eq("id", before.id).select("*").single();
    if (error) throw new Error(error.message);

    await supabase.from("report_verifications").insert({
      report_id: before.id,
      status: nextStatus,
      note: nextStatus === "diverifikasi" ? "Laporan telah diverifikasi oleh petugas." : "Laporan masuk tindak lanjut operasional.",
      verified_by: profile.id,
    });
    await writeAuditLog({ actorId: profile.id, action: "report.verified", targetTable: "field_reports", targetId: before.id, beforeData: before, afterData: updated });
    revalidatePath("/laporan");
    revalidatePath("/dashboard");
    return ok(nextStatus === "diverifikasi" ? "Laporan berhasil diverifikasi." : "Laporan berhasil masuk tindak lanjut.");
  });
}

export async function rejectReportAction(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(privilegedRoles);
    const parsed = z.object({
      code: z.string().min(1),
      reason: z.string().min(4).default("Laporan ditandai duplikat atau tidak valid oleh petugas triase."),
    }).parse({
      code: value(formData, "code"),
      reason: value(formData, "reason") || "Laporan ditandai duplikat atau tidak valid oleh petugas triase.",
    });

    const supabase = await createSupabaseServerClient();
    const { data: before, error: beforeError } = await supabase.from("field_reports").select("*").eq("code", parsed.code).single();
    if (beforeError || !before) throw new Error("Laporan tidak ditemukan.");
    if (before.event_id) throw new Error("Laporan ini sudah terhubung ke kejadian dan tidak dapat ditolak.");
    if (before.status === "ditindaklanjuti") throw new Error("Laporan yang sudah ditindaklanjuti tidak dapat ditolak lewat aksi cepat.");
    if (before.status === "ditolak") throw new Error("Laporan ini sudah ditandai ditolak.");

    const { data: updated, error } = await supabase.from("field_reports").update({ status: "ditolak" }).eq("id", before.id).select("*").single();
    if (error) throw new Error(error.message);

    await supabase.from("report_verifications").insert({
      report_id: before.id,
      status: "ditolak",
      note: parsed.reason,
      verified_by: profile.id,
    });
    await writeAuditLog({ actorId: profile.id, action: "report.rejected", targetTable: "field_reports", targetId: before.id, beforeData: before, afterData: updated });
    revalidatePath("/laporan");
    revalidatePath("/dashboard");
    revalidatePath("/audit-log");
    return ok(`Laporan ${parsed.code} ditandai ditolak / duplikat.`);
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
    const profile = await requireOneOf(warehouseRoles);
    const parsed = z.object({
      code: z.string().min(1),
      status: distributionStatusSchema,
      progress: z.coerce.number().min(0).max(100),
    }).parse({
      code: value(formData, "code"),
      status: value(formData, "status") || "dalam-perjalanan",
      progress: value(formData, "progress") || "75",
    });

    const supabase = await createSupabaseServerClient();
    const { data: before } = await supabase.from("distributions").select("*").eq("code", parsed.code).single();
    const { data, error } = await supabase.from("distributions").update({ status: parsed.status, progress: parsed.progress }).eq("code", parsed.code).select("*").single();
    if (error) throw new Error(error.message);

    await writeAuditLog({ actorId: profile.id, action: "distribution.status_updated", targetTable: "distributions", targetId: data.id, beforeData: before, afterData: data });
    revalidatePath("/logistik");
    revalidatePath("/dashboard");
    return ok("Status distribusi berhasil diperbarui.");
  });
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

export async function rejectFieldReport(formData: FormData) {
  return rejectReportAction(formData);
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
    if (report.status === "baru") throw new Error("Laporan harus diverifikasi sebelum dibuka menjadi kejadian.");
    if (report.status === "ditolak") throw new Error("Laporan yang ditandai ditolak tidak dapat dibuka menjadi kejadian.");

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
      .update({ event_id: event.id, status: "ditindaklanjuti" })
      .eq("id", report.id)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);

    await supabase.from("event_status_history").insert({
      event_id: event.id,
      next_status: event.status,
      next_escalation: event.escalation_level,
      note: "Kejadian dibuka dari laporan yang sudah diverifikasi.",
      created_by: profile.id,
    });
    await writeAuditLog({ actorId: profile.id, action: "event.opened_from_report", targetTable: "disaster_events", targetId: event.id, afterData: { event, report: updatedReport } });
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

    await supabase.from("shelter_population_updates").insert({
      shelter_id: before.id,
      population_total: parsed.populationTotal,
      children: parsed.children,
      elderly: parsed.elderly,
      pregnant: parsed.pregnant,
      disability: parsed.disability,
      note: parsed.note || "Pembaruan populasi posko.",
      created_by: profile.id,
    });
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
    const { data: shelter } = await supabase.from("shelters").select("id, name").eq("code", parsed.shelterCode).single();
    if (!shelter) throw new Error("Posko tidak ditemukan.");

    const { data, error } = await supabase.from("needs").insert({
      shelter_id: shelter.id,
      item: parsed.item,
      category: parsed.category,
      requested: parsed.requested,
      available: parsed.available,
      unit: parsed.unit,
      urgency: parsed.urgency,
    }).select("*").single();
    if (error) throw new Error(error.message);

    await writeAuditLog({ actorId: profile.id, action: "need.requested", targetTable: "needs", targetId: data.id, afterData: data });
    revalidatePath("/posko");
    revalidatePath("/dashboard");
    return ok(`Kebutuhan ${parsed.item} untuk ${shelter.name} berhasil diajukan.`);
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
    }).parse({
      shelterCode: value(formData, "shelterCode"),
      inventoryItemId: value(formData, "inventoryItemId"),
      quantity: value(formData, "quantity") || "1",
      eta: value(formData, "eta") || "Hari ini",
      priority: value(formData, "priority") || "warning",
      notes: value(formData, "notes"),
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
    await writeAuditLog({
      actorId: profile.id,
      action: "distribution.allocated",
      targetTable: "distributions",
      targetId: result?.distribution_id ?? null,
      afterData: data,
    });
    revalidatePath("/logistik");
    revalidatePath("/dashboard");
    return ok(`Distribusi ${result?.distribution_code ?? "baru"} berhasil dialokasikan.`);
  });
}

export async function createThirdPartyAid(formData: FormData) {
  return runAction(async () => {
    const profile = await requireOneOf(privilegedRoles);
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

    const { data, error } = await supabase
      .from("distributions")
      .update({ status: "diterima", progress: 100 })
      .eq("id", before.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await writeAuditLog({ actorId: profile.id, action: "distribution.received", targetTable: "distributions", targetId: before.id, beforeData: before, afterData: data });
    revalidatePath("/logistik");
    revalidatePath("/dashboard");
    revalidatePath("/audit-log");
    return ok(`Distribusi ${code} berhasil dikonfirmasi diterima.`);
  });
}
