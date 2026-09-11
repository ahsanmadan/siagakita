-- Migration: Harden Function Grants and SECURITY DEFINER Exposure
-- Created: 2026-09-11 01:45:00

-- ====================================================================
-- 1. ENSURE COLUMNS EXIST ON OPERATIONAL ATTACHMENTS
-- ====================================================================
alter table public.operational_attachments add column if not exists caption text;
alter table public.operational_attachments add column if not exists uploaded_at timestamptz not null default now();

-- ====================================================================
-- 2. HARDEN TRIGGER FUNCTION: protect_attachment_immutable_fields
-- ====================================================================
-- Trigger functions must NEVER be directly executable via RPC.
-- Revoke all execution permissions from public, anon, and authenticated.
create or replace function public.protect_attachment_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
begin
  if public.is_ops_role() then
    return new;
  end if;

  if new.visibility <> old.visibility then
    raise exception 'Hanya Admin dan Operator BPBD yang berwenang mengubah visibilitas berkas bukti.';
  end if;

  if new.file_bucket <> old.file_bucket or new.file_path <> old.file_path then
    raise exception 'Tidak diizinkan memodifikasi path atau bucket berkas bukti.';
  end if;

  if new.entity_type <> old.entity_type or new.entity_id <> old.entity_id then
    raise exception 'Tidak diizinkan memodifikasi relasi entitas berkas bukti.';
  end if;

  if new.uploaded_by <> old.uploaded_by then
    raise exception 'Tidak diizinkan memodifikasi pemilik berkas bukti.';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_attachment_immutable_fields() from public, anon, authenticated;
grant execute on function public.protect_attachment_immutable_fields() to postgres, service_role;

-- ====================================================================
-- 3. HARDEN RLS HELPER: user_can_access_distribution
-- ====================================================================
-- Pure internal helper for RLS policies.
-- Revoke execution from public, anon, and authenticated to eliminate /rest/v1/rpc exposure.
create or replace function public.user_can_access_distribution(target_dist_id uuid)
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

-- Protect helper from unauthenticated RPC invocation.
-- Minimum grant required: authenticated, service_role for evaluating RLS policies on
-- distributions, distribution_vehicle_assignments, and operational_attachments.
-- Revoked from PUBLIC and anon to prevent unauthenticated RPC exposure.
revoke all on function public.user_can_access_distribution(uuid) from public, anon;
grant execute on function public.user_can_access_distribution(uuid) to authenticated, service_role;

-- ====================================================================
-- 4. HARDEN CONTROLLED RPC: update_attachment_metadata
-- ====================================================================
-- Intentionally exposed RPC for authenticated uploaders to update ONLY harmless metadata
-- (description, caption). It verifies caller identity and rejects access tampering.
-- Revoked from PUBLIC and anon.
create or replace function public.update_attachment_metadata(
  target_attachment_id uuid,
  new_description text default null,
  new_caption text default null
)
returns public.operational_attachments
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  attach public.operational_attachments;
  uid uuid;
  is_ops boolean;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Unauthenticated session';
  end if;

  select * into attach
  from public.operational_attachments
  where id = target_attachment_id;

  if attach is null then
    raise exception 'Attachment not found';
  end if;

  is_ops := public.is_ops_role();
  if not is_ops and attach.uploaded_by <> uid then
    raise exception 'Unauthorized to update this attachment';
  end if;

  update public.operational_attachments
  set
    description = coalesce(new_description, description),
    caption = coalesce(new_caption, caption),
    updated_at = now()
  where id = target_attachment_id
  returning * into attach;

  return attach;
end;
$$;

revoke all on function public.update_attachment_metadata(uuid, text, text) from public, anon;
grant execute on function public.update_attachment_metadata(uuid, text, text) to authenticated, service_role;

-- ====================================================================
-- 5. HARDEN RLS HELPER: user_can_access_attachment
-- ====================================================================
-- Used by operational_attachments SELECT policy.
-- Minimum grant: authenticated, service_role (required for RLS policy evaluation by authenticated callers).
-- Revoked from PUBLIC and anon.
create or replace function public.user_can_access_attachment(target_attachment_id uuid)
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

  -- Public-safe files are accessible
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

  -- Restricted/private restricted to ops and uploader
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
        return public.user_can_access_distribution(attach.entity_id);
      elsif attach.entity_type = 'proof_of_delivery' then
        return exists (
          select 1 from public.proof_of_delivery pod
          join public.distributions d on d.id = pod.distribution_id
          where pod.id = attach.entity_id and public.user_can_access_distribution(d.id)
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

revoke all on function public.user_can_access_attachment(uuid) from public, anon;
grant execute on function public.user_can_access_attachment(uuid) to authenticated, service_role;

-- ====================================================================
-- 6. HARDEN STORAGE HELPER: user_can_access_attachment_file
-- ====================================================================
-- Used by operational_evidence_select_auth storage policy.
-- Minimum grant: authenticated, service_role (required for storage RLS evaluation).
-- Revoked from PUBLIC and anon.
create or replace function public.user_can_access_attachment_file(target_bucket text, target_file_path text)
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

  return public.user_can_access_attachment(attach_id);
end;
$$;

revoke all on function public.user_can_access_attachment_file(text, text) from public, anon;
grant execute on function public.user_can_access_attachment_file(text, text) to authenticated, service_role;

-- ====================================================================
-- 7. HARDEN INSERT HELPER: user_can_insert_attachment
-- ====================================================================
-- Used by operational_attachments INSERT policy.
-- Minimum grant: authenticated, service_role (required for RLS insert check).
-- Revoked from PUBLIC and anon.
create or replace function public.user_can_insert_attachment(
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
  -- Validate target_module is present
  if target_module is null or length(target_module) = 0 then
    return false;
  end if;

  uid := auth.uid();
  if uid is null then
    return false;
  end if;

  -- Ops role has full insert privileges
  if public.is_ops_role() then
    return true;
  end if;

  -- Normal users cannot publish public_safe
  if target_visibility not in ('internal', 'restricted', 'private') then
    return false;
  end if;

  -- Caller must be uploader if specified
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
      return public.user_can_access_distribution(target_entity_id);
    elsif target_entity_type = 'proof_of_delivery' then
      return exists (
        select 1 from public.proof_of_delivery pod
        join public.distributions d on d.id = pod.distribution_id
        where pod.id = target_entity_id and public.user_can_access_distribution(d.id)
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

revoke all on function public.user_can_insert_attachment(text, text, uuid, text, uuid) from public, anon;
grant execute on function public.user_can_insert_attachment(text, text, uuid, text, uuid) to authenticated, service_role;
