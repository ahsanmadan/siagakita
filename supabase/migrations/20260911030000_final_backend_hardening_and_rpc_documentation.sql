-- Migration: Function Documentation Comments for RPC and Internal Helper Functions
-- Created: 2026-09-11 03:00:00

-- ====================================================================
-- 1. INTENTIONALLY EXPOSED RPC FUNCTIONS (public schema)
-- ====================================================================

-- 1.1 public.allocate_distribution_atomic
comment on function public.allocate_distribution_atomic(
  uuid, text, integer, text, public.crisis_status, text
) is 'SECURITY DEFINER RPC for atomic stock allocation and distribution creation. Intentionally callable by authenticated warehouse managers, BPBD operators, and admins to ensure ACID transaction consistency without race conditions when decrementing inventory and dispatching relief. Protected by: caller authentication (auth.uid()), role authorization (admin/bpbd_operator/warehouse_manager), warehouse access check (user_can_access_warehouse), stock availability validation, and automatic audit logging. Revoked from public and anon.';

-- 1.2 public.log_audit_event
comment on function public.log_audit_event(
  uuid, text, text, uuid, text, text, jsonb, jsonb, text, uuid, text, jsonb
) is 'SECURITY DEFINER RPC for tamper-resistant operational audit logging. Intentionally callable by authenticated sessions and service_role to record immutable disaster response actions. Protected by: caller authentication (auth.uid()), anti-spoofing assertion that overrides actor_id with auth.uid() for authenticated users, target table whitelisting, action naming hierarchy validation, and automated credential/payload sanitization. Revoked from public and anon.';

-- 1.3 public.update_attachment_metadata
comment on function public.update_attachment_metadata(
  uuid, text, text
) is 'SECURITY DEFINER RPC for updating harmless metadata (description, caption) on operational attachments. Intentionally callable by authenticated uploaders, BPBD operators, and admins. Protected by: caller authentication (auth.uid()), ownership verification (uploaded_by = auth.uid() or is_ops_role()), and strict column immutability preventing alteration of file_bucket, file_path, visibility, entity_type, entity_id, or uploaded_by. Non-ops users cannot elevate visibility to public_safe. Revoked from public and anon.';


-- ====================================================================
-- 2. INTERNAL HELPER FUNCTIONS (app_private schema)
-- ====================================================================

-- 2.1 app_private.user_can_access_attachment
comment on function app_private.user_can_access_attachment(
  uuid
) is 'Internal SECURITY DEFINER helper function in app_private schema. Evaluated exclusively by RLS policies on public.operational_attachments to resolve fine-grained access control based on user role, entity ownership, and visibility level (public_safe, internal, restricted, private). Not a public-facing RPC endpoint.';

-- 2.2 app_private.user_can_access_attachment_file
comment on function app_private.user_can_access_attachment_file(
  text, text
) is 'Internal SECURITY DEFINER helper function in app_private schema. Evaluated exclusively by RLS policies on storage.objects for the operational_evidence bucket to ensure storage file downloads match database attachment permissions. Not a public-facing RPC endpoint.';

-- 2.3 app_private.user_can_insert_attachment
comment on function app_private.user_can_insert_attachment(
  text, text, uuid, text, uuid
) is 'Internal SECURITY DEFINER helper function in app_private schema. Evaluated exclusively by INSERT RLS policy on public.operational_attachments to validate module, entity type, caller ownership, and prevent non-ops users from setting public_safe visibility. Not a public-facing RPC endpoint.';

-- 2.4 app_private.user_can_access_distribution
comment on function app_private.user_can_access_distribution(
  uuid
) is 'Internal SECURITY DEFINER helper function in app_private schema. Evaluated exclusively by RLS policies on distribution child tables (distribution_vehicle_assignments, delivery_tracking_updates, distribution_status_history) to restrict access to authorized operators, origin warehouse managers, destination shelter managers, and assigned drivers. Not a public-facing RPC endpoint.';
