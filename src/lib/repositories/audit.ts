import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateAuditSummary, resolveAuditSeverity, type AuditSeverity } from "@/lib/audit-utils";

type AuditRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  institution_id: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  summary: string | null;
  severity: AuditSeverity | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
    app_role: string;
  } | {
    full_name: string;
    email: string;
    app_role: string;
  }[] | null;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function summarizePayload(payload: Record<string, unknown> | null) {
  if (!payload) return "Tidak ada payload tersimpan.";

  const preferredKeys = ["code", "status", "name", "source_name", "cargo", "distribution_code", "note"];
  const summary = preferredKeys
    .map((key) => {
      const value = payload[key];
      if (typeof value === "string" || typeof value === "number") return `${key}: ${value}`;
      return null;
    })
    .filter(Boolean)
    .join(" · ");

  return summary || `${Object.keys(payload).length} field tercatat`;
}

function readStatus(payload: Record<string, unknown> | null) {
  if (!payload) return null;
  const value = payload.status;
  return typeof value === "string" ? value : null;
}

export type AuditLogItem = {
  id: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  institutionId: string | null;
  action: string;
  targetTable: string;
  targetId: string | null;
  summary: string;
  severity: AuditSeverity;
  source: string;
  metadata: Record<string, unknown> | null;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  beforeSummary: string;
  afterSummary: string;
  beforeStatus: string | null;
  afterStatus: string | null;
  createdAt: string;
  createdAtIso: string;
};

export const getAuditLogs = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      "id, actor_id, actor_role, institution_id, action, target_table, target_id, summary, severity, source, metadata, before_data, after_data, created_at, profiles(full_name, email, app_role)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as AuditRow[]).map((row) => {
    const actor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const actorRole = row.actor_role || actor?.app_role || "system";
    const severity = row.severity || resolveAuditSeverity(row.action);
    const summary = row.summary || generateAuditSummary(row.action, row.target_table, row.after_data, row.before_data);

    return {
      id: row.id,
      actorName: actor?.full_name ?? (actorRole === "system" ? "Sistem Otomatis" : "Petugas"),
      actorEmail: actor?.email ?? "-",
      actorRole,
      institutionId: row.institution_id,
      action: row.action,
      targetTable: row.target_table,
      targetId: row.target_id,
      summary,
      severity,
      source: row.source || "web",
      metadata: row.metadata,
      beforeData: row.before_data,
      afterData: row.after_data,
      beforeSummary: summarizePayload(row.before_data),
      afterSummary: summarizePayload(row.after_data),
      beforeStatus: readStatus(row.before_data),
      afterStatus: readStatus(row.after_data),
      createdAt: formatTime(row.created_at),
      createdAtIso: row.created_at,
    };
  });
});
