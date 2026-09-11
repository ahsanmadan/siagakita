-- Migration: Refine Audit Log Security, Anti-Spoofing, and Access Control
-- Created: 2026-09-10 14:30:00

-- 1. Update Severity Constraint to Include 'important' and Maintain Compatibility
alter table public.audit_logs
  drop constraint if exists audit_logs_severity_check;

-- Normalize existing 'notice' to 'important' for cleaner classification
update public.audit_logs
set severity = 'important'
where severity = 'notice';

alter table public.audit_logs
  add constraint audit_logs_severity_check
  check (severity in ('info', 'important', 'notice', 'warning', 'critical'));

-- 2. Enhanced Masking Function in Database
create or replace function public.mask_sensitive_jsonb(p_data jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  k text;
  v jsonb;
  res jsonb := '{}'::jsonb;
  str_val text;
begin
  if p_data is null or jsonb_typeof(p_data) != 'object' then
    return p_data;
  end if;

  for k, v in select * from jsonb_each(p_data) loop
    if k in (
      'password', 'token', 'secret', 'sim_number', 'license_number',
      'driver_license', 'nomor_sim', 'nik', 'ktp'
    ) then
      res := res || jsonb_build_object(k, '***MASKED***');
    elsif k in (
      'phone', 'phone_number', 'sender_phone', 'reporter_phone',
      'driver_phone', 'contact_phone', 'telepon', 'hp', 'no_hp'
    ) then
      str_val := v #>> '{}';
      if length(str_val) >= 7 then
        res := res || jsonb_build_object(k, substring(str_val from 1 for 4) || '****' || substring(str_val from length(str_val) - 2));
      else
        res := res || jsonb_build_object(k, '***MASKED***');
      end if;
    elsif k in ('raw_message', 'raw_payload', 'pesan_raw') then
      str_val := v #>> '{}';
      if length(str_val) > 80 then
        res := res || jsonb_build_object(k, substring(str_val from 1 for 77) || '...');
      else
        res := res || jsonb_build_object(k, v);
      end if;
    else
      -- Recursively mask nested objects
      if jsonb_typeof(v) = 'object' then
        res := res || jsonb_build_object(k, public.mask_sensitive_jsonb(v));
      else
        res := res || jsonb_build_object(k, v);
      end if;
    end if;
  end loop;

  return res;
end;
$$;

-- 3. Hardened Anti-Spoofing log_audit_event Function
create or replace function public.log_audit_event(
  p_actor_id uuid default null,
  p_action text default 'system.event',
  p_target_table text default 'system',
  p_target_id uuid default null,
  p_summary text default null,
  p_severity text default 'info',
  p_before_data jsonb default null,
  p_after_data jsonb default null,
  p_actor_role text default null,
  p_institution_id uuid default null,
  p_source text default 'web',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_caller_uid uuid := auth.uid();
  v_caller_role text := coalesce(auth.role(), 'none');
  v_actor_id uuid;
  v_role text;
  v_institution uuid;
  v_summary text := p_summary;
  v_severity text := coalesce(p_severity, 'info');
  v_log_id uuid;
begin
  -- ANTI-SPOOFING ENFORCEMENT:
  -- If called by an authenticated user, actor MUST be the authenticated caller.
  -- Client cannot forge another user's actor_id, actor_role, or institution_id.
  if v_caller_uid is not null then
    v_actor_id := v_caller_uid;

    -- Derive trusted role from profiles table
    select p.app_role::text
    into v_role
    from public.profiles p
    where p.id = v_actor_id;

    -- Derive trusted institution from user_institutions table
    select ui.institution_id
    into v_institution
    from public.user_institutions ui
    where ui.user_id = v_actor_id
    limit 1;

  -- Trusted internal execution (service_role, postgres, or background worker where auth.uid() is null)
  elsif v_caller_role = 'service_role' or v_caller_role = 'none' or current_user = 'postgres' then
    v_actor_id := p_actor_id;
    v_role := coalesce(p_actor_role, 'system');
    v_institution := p_institution_id;

    if v_actor_id is not null and (v_role = 'system' or v_role is null) then
      select p.app_role::text into v_role from public.profiles p where p.id = v_actor_id;
    end if;

    if v_actor_id is not null and v_institution is null then
      select ui.institution_id into v_institution from public.user_institutions ui where ui.user_id = v_actor_id limit 1;
    end if;
  else
    raise exception 'Unauthorized audit log invocation for role %', v_caller_role;
  end if;

  if v_role is null then
    v_role := 'system';
  end if;

  -- Normalize severity
  if v_severity not in ('info', 'important', 'notice', 'warning', 'critical') then
    v_severity := 'info';
  end if;
  if v_severity = 'notice' then
    v_severity := 'important';
  end if;

  -- Fallback human summary if empty
  if v_summary is null or trim(v_summary) = '' then
    v_summary := replace(p_action, '.', ' ') || ' pada ' || p_target_table;
  end if;

  -- Insert securely into audit_logs
  insert into public.audit_logs (
    actor_id,
    actor_role,
    institution_id,
    action,
    target_table,
    target_id,
    summary,
    severity,
    before_data,
    after_data,
    source,
    metadata
  ) values (
    v_actor_id,
    v_role,
    v_institution,
    p_action,
    p_target_table,
    p_target_id,
    v_summary,
    v_severity,
    public.mask_sensitive_jsonb(p_before_data),
    public.mask_sensitive_jsonb(p_after_data),
    coalesce(p_source, 'web'),
    coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_log_id;

  return v_log_id;
end;
$$;

-- 4. Tighten Privileges: Revoke Execute from PUBLIC and anon
revoke all on function public.log_audit_event from public, anon;
grant execute on function public.log_audit_event to authenticated, service_role;

revoke all on function public.mask_sensitive_jsonb from public, anon;
grant execute on function public.mask_sensitive_jsonb to authenticated, service_role;

-- 5. Tighten Table Access: Revoke Direct Table Modification
-- Normal users should NOT write directly into audit_logs.
-- All writes must pass through log_audit_event() or trusted service role.
revoke insert, update, delete, truncate on public.audit_logs from public, anon, authenticated;
grant select on public.audit_logs to authenticated;

-- Drop loose insert policy
drop policy if exists "audit_insert_internal" on public.audit_logs;

-- Read policy strictly preserved for operations roles
drop policy if exists "audit_select_operator" on public.audit_logs;
create policy "audit_select_operator" on public.audit_logs
  for select to authenticated
  using (is_ops_role(ARRAY['admin'::app_role, 'bpbd_operator'::app_role]));
