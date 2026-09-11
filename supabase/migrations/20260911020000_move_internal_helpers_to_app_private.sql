-- Migration: Move Internal Helper Functions to app_private Schema
-- Created: 2026-09-11 02:00:00

-- ====================================================================
-- 1. CREATE INTERNAL NON-EXPOSED SCHEMA: app_private
-- ====================================================================
create schema if not exists app_private;

-- Revoke all schema usage from public and anon
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated, service_role;

-- ====================================================================
-- 2. CREATE HELPER: app_private.user_can_access_distribution
-- ====================================================================
-- Internal helper function in app_private schema. Evaluated by RLS policies.
-- Not exposed as a public RPC endpoint via PostgREST.
create or replace function app_private.user_can_access_distribution(target_dist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, extensions, pg_temp
as $$
  select exists (
    select 1
    from public.distributions d
    where d.id = target_dist_id
      and (
        public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
        or (d.origin_warehouse_id is not null and public.user_can_access_warehouse(d.origin_warehouse_id))
        or (d.destination_shelter_id is not null and public.user_can_access_shelter(d.destination_shelter_id))
        or exists (
          select 1 from public.distribution_vehicle_assignments dva
          join public.drivers dr on dr.id = dva.driver_id
          where dva.distribution_id = d.id
            and dr.profile_id = (select auth.uid())
        )
      )
  );
$$;

revoke all on function app_private.user_can_access_distribution(uuid) from public, anon;
grant execute on function app_private.user_can_access_distribution(uuid) to authenticated, service_role;

-- ====================================================================
-- 3. CREATE HELPER: app_private.user_can_access_attachment
-- ====================================================================
-- Internal helper in app_private schema. Evaluated by operational_attachments RLS.
-- Not exposed as a public RPC endpoint via PostgREST.
create or replace function app_private.user_can_access_attachment(target_attachment_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  attach record;
  user_role public.app_role;
  uid uuid;
begin
  select * into attach
  from public.operational_attachments
  where id = target_attachment_id;

  if attach is null then
    return false;
  end if;

  -- Public-safe files are accessible to all
  if attach.visibility = 'public_safe' then
    return true;
  end if;

  uid := auth.uid();
  if uid is null then
    return false;
  end if;

  -- Admin & BPBD operator
  if public.is_ops_role() then
    return true;
  end if;

  -- Direct uploader
  if attach.uploaded_by = uid then
    return true;
  end if;

  -- Restricted/private files restricted to ops or uploader
  if attach.visibility in ('restricted', 'private') then
    return false;
  end if;

  -- Scoped internal access
  if attach.visibility = 'internal' then
    user_role := public.current_app_role();

    if user_role = 'field_officer' then
      if attach.entity_type = 'field_reports' then
        return exists (
          select 1 from public.field_reports fr
          where fr.id = attach.entity_id
            and (fr.created_by = uid or public.is_ops_role())
        );
      elsif attach.entity_type = 'report_verifications' then
        return exists (
          select 1 from public.report_verifications rv
          where rv.id = attach.entity_id
            and (rv.verified_by = uid or public.is_ops_role())
        );
      elsif attach.entity_type = 'disaster_events' then
        return exists (
          select 1 from public.disaster_events de
          where de.id = attach.entity_id and de.state = 'active'
        );
      end if;
    elsif user_role = 'shelter_manager' then
      if attach.entity_type = 'shelters' then
        return public.user_can_access_shelter(attach.entity_id);
      elsif attach.entity_type = 'shelter_population_updates' then
        return exists (
          select 1 from public.shelter_population_updates spu
          where spu.id = attach.entity_id and public.user_can_access_shelter(spu.shelter_id)
        );
      elsif attach.entity_type = 'proof_of_delivery' then
        return exists (
          select 1 from public.proof_of_delivery pod
          where pod.id = attach.entity_id and public.user_can_access_shelter(pod.shelter_id)
        );
      end if;
    elsif user_role = 'warehouse_manager' then
      if attach.entity_type = 'distributions' then
        return app_private.user_can_access_distribution(attach.entity_id);
      elsif attach.entity_type = 'proof_of_delivery' then
        return exists (
          select 1 from public.proof_of_delivery pod
          join public.distributions d on d.id = pod.distribution_id
          where pod.id = attach.entity_id and app_private.user_can_access_distribution(d.id)
        );
      end if;
    elsif user_role = 'driver' then
      if attach.entity_type = 'distributions' then
        return exists (
          select 1 from public.distribution_vehicle_assignments dva
          join public.drivers drv on drv.id = dva.driver_id
          where dva.distribution_id = attach.entity_id and drv.profile_id = uid
        );
      elsif attach.entity_type = 'proof_of_delivery' then
        return exists (
          select 1 from public.proof_of_delivery pod
          join public.distribution_vehicle_assignments dva on dva.distribution_id = pod.distribution_id
          join public.drivers drv on drv.id = dva.driver_id
          where pod.id = attach.entity_id and drv.profile_id = uid
        );
      end if;
    elsif user_role = 'institution_partner' and attach.entity_type = 'third_party_aids' then
      return exists (
        select 1 from public.third_party_aids tpa
        where tpa.id = attach.entity_id and tpa.created_by = uid
      );
    end if;
  end if;

  return false;
end;
$$;

revoke all on function app_private.user_can_access_attachment(uuid) from public, anon;
grant execute on function app_private.user_can_access_attachment(uuid) to authenticated, service_role;

-- ====================================================================
-- 4. CREATE HELPER: app_private.user_can_access_attachment_file
-- ====================================================================
-- Internal helper in app_private schema. Evaluated by storage.objects RLS.
-- Not exposed as a public RPC endpoint via PostgREST.
create or replace function app_private.user_can_access_attachment_file(target_bucket text, target_file_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  attach_id uuid;
begin
  select id into attach_id
  from public.operational_attachments
  where file_bucket = target_bucket and file_path = target_file_path
  limit 1;

  if attach_id is null then
    return public.is_ops_role();
  end if;

  return app_private.user_can_access_attachment(attach_id);
end;
$$;

revoke all on function app_private.user_can_access_attachment_file(text, text) from public, anon;
grant execute on function app_private.user_can_access_attachment_file(text, text) to authenticated, service_role;

-- ====================================================================
-- 5. CREATE HELPER: app_private.user_can_insert_attachment
-- ====================================================================
-- Internal helper in app_private schema. Evaluated by operational_attachments INSERT RLS.
-- Not exposed as a public RPC endpoint via PostgREST.
create or replace function app_private.user_can_insert_attachment(
  target_module text,
  target_entity_type text,
  target_entity_id uuid,
  target_visibility text,
  target_uploaded_by uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  uid uuid;
  user_role public.app_role;
begin
  if target_module is null or length(target_module) = 0 then
    return false;
  end if;

  uid := auth.uid();
  if uid is null then
    return false;
  end if;

  if public.is_ops_role() then
    return true;
  end if;

  if target_visibility not in ('internal', 'restricted', 'private') then
    return false;
  end if;

  if target_uploaded_by is not null and target_uploaded_by <> uid then
    return false;
  end if;

  user_role := public.current_app_role();

  if user_role = 'field_officer' then
    return target_entity_type in ('field_reports', 'report_verifications', 'disaster_events');
  elsif user_role = 'shelter_manager' then
    if target_entity_type = 'shelters' then
      return public.user_can_access_shelter(target_entity_id);
    elsif target_entity_type = 'shelter_population_updates' then
      return exists (
        select 1 from public.shelter_population_updates spu
        where spu.id = target_entity_id and public.user_can_access_shelter(spu.shelter_id)
      );
    elsif target_entity_type = 'proof_of_delivery' then
      return exists (
        select 1 from public.proof_of_delivery pod
        where pod.id = target_entity_id and public.user_can_access_shelter(pod.shelter_id)
      );
    end if;
  elsif user_role = 'warehouse_manager' then
    if target_entity_type = 'distributions' then
      return app_private.user_can_access_distribution(target_entity_id);
    elsif target_entity_type = 'proof_of_delivery' then
      return exists (
        select 1 from public.proof_of_delivery pod
        join public.distributions d on d.id = pod.distribution_id
        where pod.id = target_entity_id and app_private.user_can_access_distribution(d.id)
      );
    end if;
  elsif user_role = 'driver' then
    if target_entity_type = 'distributions' then
      return exists (
        select 1 from public.distribution_vehicle_assignments dva
        join public.drivers drv on drv.id = dva.driver_id
        where dva.distribution_id = target_entity_id and drv.profile_id = uid
      );
    elsif target_entity_type = 'proof_of_delivery' then
      return exists (
        select 1 from public.proof_of_delivery pod
        join public.distribution_vehicle_assignments dva on dva.distribution_id = pod.distribution_id
        join public.drivers drv on drv.id = dva.driver_id
        where pod.id = target_entity_id and drv.profile_id = uid
      );
    end if;
  elsif user_role = 'institution_partner' then
    return target_entity_type = 'third_party_aids';
  end if;

  return false;
end;
$$;

revoke all on function app_private.user_can_insert_attachment(text, text, uuid, text, uuid) from public, anon;
grant execute on function app_private.user_can_insert_attachment(text, text, uuid, text, uuid) to authenticated, service_role;

-- ====================================================================
-- 6. UPDATE RLS POLICIES TO USE app_private FUNCTIONS
-- ====================================================================

-- 6.1 operational_attachments SELECT
drop policy if exists attachments_select_auth on public.operational_attachments;
create policy attachments_select_auth
  on public.operational_attachments
  for select
  to authenticated
  using (app_private.user_can_access_attachment(id));

-- 6.2 operational_attachments INSERT
drop policy if exists attachments_insert_auth on public.operational_attachments;
create policy attachments_insert_auth
  on public.operational_attachments
  for insert
  to authenticated
  with check (app_private.user_can_insert_attachment(module, entity_type, entity_id, visibility, uploaded_by));

-- 6.3 storage.objects operational_evidence_select_auth
drop policy if exists operational_evidence_select_auth on storage.objects;
create policy operational_evidence_select_auth
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'operational_evidence'
    and app_private.user_can_access_attachment_file('operational_evidence', storage.objects.name)
  );

-- 6.4 distribution policies calling user_can_access_distribution
drop policy if exists "assignments_select" on public.distribution_vehicle_assignments;
create policy "assignments_select"
  on public.distribution_vehicle_assignments
  for select
  to authenticated
  using (app_private.user_can_access_distribution(distribution_id));

drop policy if exists "tracking_updates_select" on public.delivery_tracking_updates;
create policy "tracking_updates_select"
  on public.delivery_tracking_updates
  for select
  to authenticated
  using (app_private.user_can_access_distribution(distribution_id));

drop policy if exists "status_history_select" on public.distribution_status_history;
create policy "status_history_select"
  on public.distribution_status_history
  for select
  to authenticated
  using (app_private.user_can_access_distribution(distribution_id));

-- ====================================================================
-- 7. CLEAN UP DEPRECATED FUNCTIONS FROM public SCHEMA
-- ====================================================================
drop function if exists public.user_can_access_attachment(uuid);
drop function if exists public.user_can_access_attachment_file(text, text);
drop function if exists public.user_can_insert_attachment(text, text, uuid, text, uuid);
drop function if exists public.user_can_access_distribution(uuid);
