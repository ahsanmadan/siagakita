import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuditRow = {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
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

export type AuditLogItem = {
  id: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetTable: string;
  targetId: string | null;
  beforeSummary: string;
  afterSummary: string;
  createdAt: string;
  createdAtIso: string;
};

export const getAuditLogs = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, target_table, target_id, before_data, after_data, created_at, profiles(full_name, email, app_role)")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as AuditRow[]).map((row) => {
    const actor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

    return {
      id: row.id,
      actorName: actor?.full_name ?? "Sistem",
      actorEmail: actor?.email ?? "-",
      actorRole: actor?.app_role ?? "system",
      action: row.action,
      targetTable: row.target_table,
      targetId: row.target_id,
      beforeSummary: summarizePayload(row.before_data),
      afterSummary: summarizePayload(row.after_data),
      createdAt: formatTime(row.created_at),
      createdAtIso: row.created_at,
    };
  });
});
