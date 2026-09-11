-- Migration: Operational Attachments, File Evidence, and Storage Security
-- Created: 2026-09-11 01:00:00

-- ====================================================================
-- 0. HELPER FUNCTION OVERLOAD: is_ops_role()
-- ====================================================================
-- No-arg overload checking admin and bpbd_operator
create or replace function public.is_ops_role()
returns boolean
language sql
stable
set search_path to 'public', 'auth'
as $$
  select public.current_app_role() in ('admin'::public.app_role, 'bpbd_operator'::public.app_role)
$$;

-- ====================================================================
-- 1. SETUP SUPABASE STORAGE BUCKET: operational_evidence
-- ====================================================================
-- Dedicated private bucket for operational disaster evidence
-- Photos, signed PODs, verification snapshots, field documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'operational_evidence',
  'operational_evidence',
  false,
  10485760, -- 10 MB per file limit
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf',
    'text/plain'
  ];

-- ====================================================================
-- 2. CREATE TABLE: public.operational_attachments
-- ====================================================================
create table if not exists public.operational_attachments (
  id uuid primary key default gen_random_uuid(),
  module text not null, -- 'reports', 'verifications', 'events', 'shelters', 'sms', 'aid_requests', 'distributions', 'deliveries', 'audit'
  entity_type text not null, -- 'field_reports', 'report_verifications', 'disaster_events', 'shelters', 'shelter_population_updates', 'sms_messages', 'aid_requests', 'distributions', 'delivery_tracking_updates', 'proof_of_delivery', 'audit_logs', 'third_party_aids'
  entity_id uuid not null,
  file_bucket text not null default 'operational_evidence',
  file_path text not null,
  original_file_name text,
  mime_type text,
  file_size bigint,
  visibility text not null default 'internal'
    check (visibility in ('internal', 'public_safe', 'restricted', 'private')),
  description text,
  caption text,
  metadata jsonb not null default '{}'::jsonb,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure caption and uploaded_at exist if table was previously created
alter table public.operational_attachments add column if not exists caption text;
alter table public.operational_attachments add column if not exists uploaded_at timestamptz not null default now();

-- Compound and foreign key indexes
create index if not exists operational_attachments_entity_idx
  on public.operational_attachments(entity_type, entity_id);

create index if not exists operational_attachments_module_idx
  on public.operational_attachments(module);

create index if not exists operational_attachments_visibility_idx
  on public.operational_attachments(visibility);

create index if not exists operational_attachments_uploaded_by_idx
  on public.operational_attachments(uploaded_by);

create index if not exists operational_attachments_bucket_path_idx
  on public.operational_attachments(file_bucket, file_path);

-- Updated_at trigger
drop trigger if exists operational_attachments_set_updated_at on public.operational_attachments;
create trigger operational_attachments_set_updated_at
  before update on public.operational_attachments
  for each row execute function public.set_updated_at();

-- ====================================================================
-- 3. LINK PROOF_OF_DELIVERY TO ATTACHMENT MODEL & BACKFILL LEGACY DATA
-- ====================================================================
alter table public.proof_of_delivery
  add column if not exists attachment_id uuid references public.operational_attachments(id) on delete set null;

create index if not exists proof_of_delivery_attachment_id_idx
  on public.proof_of_delivery(attachment_id);

-- Backfill existing proof_path in proof_of_delivery into operational_attachments without losing data
do $$
declare
  r record;
  new_attach_id uuid;
begin
  for r in
    select id, shelter_id, proof_path, created_by, created_at, receiver_note
    from public.proof_of_delivery
    where proof_path is not null and attachment_id is null
  loop
    insert into public.operational_attachments (
      module,
      entity_type,
      entity_id,
      file_bucket,
      file_path,
      original_file_name,
      visibility,
      description,
      uploaded_by,
      uploaded_at,
      created_at,
      updated_at
    ) values (
      'deliveries',
      'proof_of_delivery',
      r.id,
      'operational_evidence',
      r.proof_path,
      split_part(r.proof_path, '/', array_length(string_to_array(r.proof_path, '/'), 1)),
      'internal',
      coalesce(r.receiver_note, 'Bukti serah terima bantuan posko (terintegrasi otomatis)'),
      r.created_by,
      r.created_at,
      r.created_at,
      r.created_at
    )
    returning id into new_attach_id;

    update public.proof_of_delivery
    set attachment_id = new_attach_id
    where id = r.id;
  end loop;
end;
$$;

-- ====================================================================
-- 4. UNIFIED ATTACHMENT ACCESS HELPER (SECURITY DEFINER)
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

  -- 1. Public-safe is visible to all (anon & authenticated)
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

-- Helper function checking if user has access to a file in storage
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

-- Safe RPC to update harmless metadata without modifying sensitive attributes
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

  -- Update only harmless metadata fields (description, caption)
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

-- ====================================================================
-- 5. ROW LEVEL SECURITY ON operational_attachments
-- ====================================================================
alter table public.operational_attachments enable row level security;

-- 5.1 SELECT for anon: only public_safe files
drop policy if exists attachments_select_anon on public.operational_attachments;
create policy attachments_select_anon
  on public.operational_attachments
  for select
  to anon
  using (visibility = 'public_safe');

-- 5.2 SELECT for authenticated: strictly mirrors scoped access
drop policy if exists attachments_select_auth on public.operational_attachments;
create policy attachments_select_auth
  on public.operational_attachments
  for select
  to authenticated
  using (
    public.user_can_access_attachment(id)
  );

-- 5.3 INSERT for authenticated: role-scoped upload authorization
-- Normal users cannot directly insert public_safe files
drop policy if exists attachments_insert_auth on public.operational_attachments;
create policy attachments_insert_auth
  on public.operational_attachments
  for insert
  to authenticated
  with check (
    -- Admin and BPBD operators can attach files anywhere with any visibility
    public.is_ops_role()
    -- Normal users cannot publish public_safe files directly
    or (
      visibility in ('internal', 'restricted', 'private')
      and (
        -- Field officers can attach to reports, verifications, and events
        (
          public.current_app_role() = 'field_officer'
          and entity_type in ('field_reports', 'report_verifications', 'disaster_events')
          and (uploaded_by = auth.uid() or uploaded_by is null)
        )
        -- Shelter managers can attach documentation to managed shelters
        or (
          public.current_app_role() = 'shelter_manager'
          and (
            (entity_type = 'shelters' and public.user_can_access_shelter(entity_id))
            or (entity_type = 'shelter_population_updates' and exists (
              select 1 from public.shelter_population_updates spu
              where spu.id = entity_id and public.user_can_access_shelter(spu.shelter_id)
            ))
            or (entity_type = 'proof_of_delivery' and exists (
              select 1 from public.proof_of_delivery pod
              where pod.id = entity_id and public.user_can_access_shelter(pod.shelter_id)
            ))
          )
          and (uploaded_by = auth.uid() or uploaded_by is null)
        )
        -- Warehouse managers can attach documentation to accessible distributions/warehouses
        or (
          public.current_app_role() = 'warehouse_manager'
          and (
            (entity_type = 'distributions' and public.user_can_access_distribution(entity_id))
            or (entity_type = 'proof_of_delivery' and exists (
              select 1 from public.proof_of_delivery pod
              join public.distributions d on d.id = pod.distribution_id
              where pod.id = entity_id and public.user_can_access_distribution(d.id)
            ))
          )
          and (uploaded_by = auth.uid() or uploaded_by is null)
        )
        -- Drivers can upload delivery tracking and proof of delivery for their assigned deliveries
        or (
          public.current_app_role() = 'driver'
          and (
            (entity_type = 'distributions' and exists (
              select 1 from public.distribution_vehicle_assignments dva
              join public.drivers drv on drv.id = dva.driver_id
              where dva.distribution_id = entity_id and drv.profile_id = auth.uid()
            ))
            or (entity_type = 'proof_of_delivery' and exists (
              select 1 from public.proof_of_delivery pod
              join public.distribution_vehicle_assignments dva on dva.distribution_id = pod.distribution_id
              join public.drivers drv on drv.id = dva.driver_id
              where pod.id = entity_id and drv.profile_id = auth.uid()
            ))
          )
          and (uploaded_by = auth.uid() or uploaded_by is null)
        )
        -- Institution partners can attach to third party aid
        or (
          public.current_app_role() = 'institution_partner'
          and entity_type = 'third_party_aids'
          and (uploaded_by = auth.uid() or uploaded_by is null)
        )
      )
    )
  );

-- 5.4 UPDATE for authenticated: restricted strictly to Admin and BPBD Operator
-- Normal uploaders cannot update table rows directly (must use update_attachment_metadata RPC for harmless updates)
drop policy if exists attachments_update_auth on public.operational_attachments;
create policy attachments_update_auth
  on public.operational_attachments
  for update
  to authenticated
  using (public.is_ops_role())
  with check (public.is_ops_role());

-- 5.5 DELETE for authenticated: restricted strictly to Admin and BPBD Operator
-- Disallow unauthorized tampering or destruction of operational disaster evidence
drop policy if exists attachments_delete_auth on public.operational_attachments;
create policy attachments_delete_auth
  on public.operational_attachments
  for delete
  to authenticated
  using (public.is_ops_role());

-- ====================================================================
-- 6. STORAGE OBJECTS POLICIES FOR operational_evidence BUCKET
-- ====================================================================
-- 6.1 Storage Select for anon: ONLY explicitly public_safe files
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

-- 6.2 Storage Select for authenticated: strictly mirrors attachment metadata access
drop policy if exists operational_evidence_select_auth on storage.objects;
create policy operational_evidence_select_auth
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'operational_evidence'
    and public.user_can_access_attachment_file('operational_evidence', storage.objects.name)
  );

-- 6.3 Storage Insert for authenticated: authorized operational roles
drop policy if exists operational_evidence_insert_auth on storage.objects;
create policy operational_evidence_insert_auth
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'operational_evidence'
    and (
      public.is_ops_role()
      or public.current_app_role() in ('field_officer', 'shelter_manager', 'warehouse_manager', 'driver', 'institution_partner')
    )
  );

-- 6.4 Storage Delete for authenticated: admin/ops only
drop policy if exists operational_evidence_delete_auth on storage.objects;
create policy operational_evidence_delete_auth
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'operational_evidence'
    and public.is_ops_role()
  );

-- ====================================================================
-- 7. RECORD MIGRATION ENTRY
-- ====================================================================
insert into supabase_migrations.schema_migrations (version, statements, name)
values (
  '20260911010000',
  array['operational_attachments_and_storage_security'],
  'operational_attachments_and_storage_security'
)
on conflict (version) do nothing;
