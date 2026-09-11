"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  maskAuditPayload,
  resolveAuditSeverity,
  generateAuditSummary,
  type WriteAuditLogParams,
} from "@/lib/audit-utils";

// ── Reusable Server Action for Audit Logging ────────────────────────
export async function writeAuditLog({
  actorId,
  action,
  targetTable,
  targetId,
  summary,
  severity,
  actorRole,
  institutionId,
  source = "web",
  beforeData,
  afterData,
  metadata = {},
}: WriteAuditLogParams) {
  try {
    const supabase = await createSupabaseServerClient();

    const finalSeverity = severity || resolveAuditSeverity(action);
    const finalSummary = summary || generateAuditSummary(action, targetTable, afterData, beforeData);

    // Apply data masking
    const maskedBefore = maskAuditPayload(beforeData);
    const maskedAfter = maskAuditPayload(afterData);

    // Execute via controlled security definer function
    // Enforces anti-spoofing in database: authenticated callers cannot spoof actor_id
    const { error: rpcError } = await supabase.rpc("log_audit_event", {
      p_actor_id: actorId || null,
      p_action: action,
      p_target_table: targetTable,
      p_target_id: targetId ?? null,
      p_summary: finalSummary,
      p_severity: finalSeverity,
      p_before_data: (maskedBefore as Record<string, unknown>) ?? null,
      p_after_data: (maskedAfter as Record<string, unknown>) ?? null,
      p_actor_role: actorRole || null,
      p_institution_id: institutionId || null,
      p_source: source,
      p_metadata: metadata,
    });

    if (rpcError) {
      console.warn("writeAuditLog RPC warning:", rpcError.message);
    }
  } catch (err) {
    // Audit logging should never crash the main application workflow
    console.error("writeAuditLog failed:", err);
  }
}
