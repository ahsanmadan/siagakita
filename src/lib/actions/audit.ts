"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function writeAuditLog({
  actorId,
  action,
  targetTable,
  targetId,
  beforeData,
  afterData,
}: {
  actorId: string;
  action: string;
  targetTable: string;
  targetId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
}) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    target_table: targetTable,
    target_id: targetId ?? null,
    before_data: beforeData ?? null,
    after_data: afterData ?? null,
  });
}
