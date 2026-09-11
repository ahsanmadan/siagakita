-- Migration: Refine Storage Objects & Operational Attachments RLS Policies
-- Created: 2026-09-11 01:30:00

-- ====================================================================
-- 0. GRANT HELPER FUNCTIONS FOR SECURITY EVALUATION
-- ====================================================================
grant execute on function public.is_ops_role() to authenticated, anon;
grant execute on function public.user_can_access_shelter(uuid) to authenticated;
grant execute on function public.user_can_access_distribution(uuid) to authenticated;

-- ====================================================================
-- 1. HELPER FUNCTION: USER ATTACHMENT ACCESS VERIFICATION
-- ====================================================================
create or replace function public.user_can_access_attachment(target_attachment_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'auth'
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

  -- 1. Public-safe is visible to all
  if attach.visibility = 'public_safe' then
    return true;
  end if;

  -- Unauthenticated users cannot access non-public_safe files
  uid := auth.uid();
  if uid is null then
    return false;
  end if;

  -- 2. Admin and BPBD operators have full operational access
  if public.is_ops_role() then
    return true;
  end if;

  -- 3. Uploader always has read access to their own upload
  if attach.uploaded_by = uid then
    return true;
  end if;

  -- 4. Restricted and Private files are strictly for ops or uploader
  if attach.visibility in ('restricted', 'private') then
    return false;
  end if;

  -- 5. Internal files scoped strictly by role and operational entity
  if attach.visibility = 'internal' then
    user_role := public.current_app_role();

    -- Field officer: reports they submitted, verifications they performed, or active events
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
    end if;

    -- Shelter manager: shelters/population updates/proof of delivery they manage
    if user_role = 'shelter_manager' then
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
    end if;

    -- Warehouse manager: distributions or proof of delivery they can access
    if user_role = 'warehouse_manager' then
      if attach.entity_type = 'distributions' then
        return public.user_can_access_distribution(attach.entity_id);
      elsif attach.entity_type = 'proof_of_delivery' then
        return exists (
          select 1 from public.proof_of_delivery pod
          join public.distributions d on d.id = pod.distribution_id
          where pod.id = attach.entity_id and public.user_can_access_distribution(d.id)
        );
      end if;
    end if;

    -- Driver: assigned distributions or proof of delivery
    if user_role = 'driver' then
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
    end if;

    -- Institution partner: third party aids created by self
    if user_role = 'institution_partner' and attach.entity_type = 'third_party_aids' then
      return exists (
        select 1 from public.third_party_aids tpa
        where tpa.id = attach.entity_id and tpa.created_by = uid
      );
    end if;
  end if;

  return false;
end;
$$;

grant execute on function public.user_can_access_attachment(uuid) to authenticated, anon;

-- ====================================================================
-- 2. HELPER FUNCTION: STORAGE FILE ACCESS (MIRRORS ATTACHMENT ACCESS)
-- ====================================================================
create or replace function public.user_can_access_attachment_file(target_bucket text, target_file_path text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'auth'
as $$
declare
  attach_id uuid;
begin
  select id into attach_id
  from public.operational_attachments
  where file_bucket = target_bucket and file_path = target_file_path
  limit 1;

  if attach_id is null then
    -- If no metadata record exists, deny by default unless admin/bpbd_operator
    return public.is_ops_role();
  end if;

  return public.user_can_access_attachment(attach_id);
end;
$$;

grant execute on function public.user_can_access_attachment_file(text, text) to authenticated, anon;

-- ====================================================================
-- 3. TIGHTEN operational_evidence_select_auth ON storage.objects
-- ====================================================================
-- Drop previous broad exists-only policy
drop policy if exists operational_evidence_select_auth on storage.objects;

-- Recreate with strictly scoped access mirroring operational_attachments:
-- Admin/BPBD operator: can read all operational evidence
-- Authenticated users: can only read public_safe files, their own uploads,
-- or internal files related to entities they are authorized to access.
-- Cannot read unrelated internal, restricted, or private files.
create policy operational_evidence_select_auth
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'operational_evidence'
    and public.user_can_access_attachment_file('operational_evidence', storage.objects.name)
  );

-- Ensure anon select only reads explicitly public_safe files
drop policy if exists operational_evidence_select_anon on storage.objects;
create policy operational_evidence_select_anon
  on storage.objects
  for select
  to anon
  using (
    bucket_id = 'operational_evidence'
    and exists (
      select 1 from public.operational_attachments oa
      where oa.file_bucket = 'operational_evidence'
        and oa.file_path = storage.objects.name
        and oa.visibility = 'public_safe'
    )
  );

-- ====================================================================
-- 4. TIGHTEN attachments_update_auth ON public.operational_attachments
-- ====================================================================
-- Drop previous overly broad uploader update policy
drop policy if exists attachments_update_auth on public.operational_attachments;

-- Recreate: Only Admin and BPBD Operator can execute direct table UPDATE.
-- Normal uploaders cannot update table rows directly, preventing any unauthorized
-- changes to visibility, file_bucket, file_path, entity_type, entity_id, or uploaded_by,
-- and strictly preventing promotion to public_safe.
create policy attachments_update_auth
  on public.operational_attachments
  for update
  to authenticated
  using (public.is_ops_role())
  with check (public.is_ops_role());

-- ====================================================================
-- 5. HELPER FUNCTION & POLICY FOR ATTACHMENT INSERT
-- ====================================================================
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
set search_path to 'public', 'auth'
as $$
declare
  uid uuid;
  user_role public.app_role;
begin
  uid := auth.uid();
  if uid is null then
    return false;
  end if;

  -- Admin & BPBD operator can insert anywhere with any visibility
  if public.is_ops_role() then
    return true;
  end if;

  -- Normal users cannot directly publish public_safe files
  if target_visibility not in ('internal', 'restricted', 'private') then
    return false;
  end if;

  -- Uploaded_by must match caller if provided
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

grant execute on function public.user_can_insert_attachment(text, text, uuid, text, uuid) to authenticated;

drop policy if exists attachments_insert_auth on public.operational_attachments;
create policy attachments_insert_auth
  on public.operational_attachments
  for insert
  to authenticated
  with check (
    public.user_can_insert_attachment(module, entity_type, entity_id, visibility, uploaded_by)
  );

-- ====================================================================
-- 6. TRIGGER GUARD: PREVENT IMMUTABLE/SENSITIVE FIELD TAMPERING
-- ====================================================================
create or replace function public.protect_attachment_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'auth'
as $$
begin
  if public.is_ops_role() then
    return new;
  end if;

  -- Disallow changing immutable metadata
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

drop trigger if exists trg_protect_attachment_immutable_fields on public.operational_attachments;
create trigger trg_protect_attachment_immutable_fields
  before update on public.operational_attachments
  for each row execute function public.protect_attachment_immutable_fields();

-- ====================================================================
-- 7. CONTROLLED RPC FOR SAFE HARMLESS METADATA UPDATES
-- ====================================================================
create or replace function public.update_attachment_metadata(
  target_attachment_id uuid,
  new_description text default null,
  new_caption text default null
)
returns public.operational_attachments
language plpgsql
security definer
set search_path to 'public', 'auth'
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

  -- Only updates description and caption; sensitive fields remain untouched
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

grant execute on function public.update_attachment_metadata(uuid, text, text) to authenticated;
