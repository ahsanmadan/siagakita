-- Migration: Account Roles, Permissions Matrix, Institution Membership, and Access Control Hardening
-- Created: 2026-09-11 00:30:00

-- ====================================================================
-- 1. ENHANCE APP_ROLE ENUM SAFELY
-- ====================================================================
alter type public.app_role add value if not exists 'institution_partner';

-- ====================================================================
-- 2. ENHANCE USER_INSTITUTIONS MEMBERSHIP STRUCTURE
-- ====================================================================
-- Supports multi-institution membership with explicit status and role.
-- Inactive or pending members MUST NOT inherit operational access.

alter table public.user_institutions
  add column if not exists status text not null default 'active'
    check (status in ('active', 'pending', 'inactive')),
  add column if not exists role text not null default 'member',
  add column if not exists joined_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists user_institutions_user_status_idx
  on public.user_institutions(user_id, status);

create index if not exists user_institutions_institution_status_idx
  on public.user_institutions(institution_id, status);

-- Trigger to update updated_at on user_institutions
drop trigger if exists user_institutions_set_updated_at on public.user_institutions;
create trigger user_institutions_set_updated_at
  before update on public.user_institutions
  for each row execute function public.set_updated_at();

-- ====================================================================
-- 3. PERMISSIONS & ROLE_PERMISSIONS MATRIX TABLES (OPTIONAL / EXTENSIBLE)
-- ====================================================================
-- Provides standard RBAC catalog without overcomplicating simple queries.

create table if not exists public.permissions (
  id text primary key,
  module text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role public.app_role not null,
  permission_id text not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role, permission_id)
);

create index if not exists role_permissions_role_idx
  on public.role_permissions(role);

-- Enable RLS on permission tables
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

-- Read policies for authenticated users
create policy "permissions_select" on public.permissions
  for select to authenticated using (true);

create policy "role_permissions_select" on public.role_permissions
  for select to authenticated using (true);

-- Admin write policies
create policy "permissions_admin_write" on public.permissions
  for all to authenticated
  using (public.current_app_role() = 'admin'::public.app_role)
  with check (public.current_app_role() = 'admin'::public.app_role);

create policy "role_permissions_admin_write" on public.role_permissions
  for all to authenticated
  using (public.current_app_role() = 'admin'::public.app_role)
  with check (public.current_app_role() = 'admin'::public.app_role);

-- Seed base permissions
insert into public.permissions (id, module, description) values
  ('events.read', 'events', 'Melihat daftar dan detail kejadian bencana'),
  ('events.manage', 'events', 'Membuat, mengubah, dan mengeskalasi kejadian bencana'),
  ('reports.create', 'reports', 'Membuat laporan situasi bencana'),
  ('reports.verify', 'reports', 'Memverifikasi dan menindaklanjuti laporan warga'),
  ('shelters.read', 'shelters', 'Melihat data posko pengungsian'),
  ('shelters.manage', 'shelters', 'Mengelola posko, populasi, dan pengajuan kebutuhan posko'),
  ('logistics.read', 'logistics', 'Melihat inventaris stok gudang dan distribusi'),
  ('logistics.manage', 'logistics', 'Mengelola stok barang, alokasi bantuan, dan armada distribusi'),
  ('tracking.update', 'tracking', 'Memperbarui lokasi dan status pengiriman armada'),
  ('partner.collaborate', 'partner', 'Mengelola bantuan pihak ketiga dan kolaborasi instansi mitra'),
  ('audit.read', 'audit', 'Melihat log audit investigasi operasional'),
  ('accounts.manage', 'accounts', 'Mengelola akun personel dan verifikasi pendaftaran')
on conflict (id) do update set description = excluded.description;

-- Seed role_permissions mappings
insert into public.role_permissions (role, permission_id) values
  -- admin
  ('admin', 'events.read'), ('admin', 'events.manage'),
  ('admin', 'reports.create'), ('admin', 'reports.verify'),
  ('admin', 'shelters.read'), ('admin', 'shelters.manage'),
  ('admin', 'logistics.read'), ('admin', 'logistics.manage'),
  ('admin', 'tracking.update'), ('admin', 'partner.collaborate'),
  ('admin', 'audit.read'), ('admin', 'accounts.manage'),
  -- bpbd_operator
  ('bpbd_operator', 'events.read'), ('bpbd_operator', 'events.manage'),
  ('bpbd_operator', 'reports.create'), ('bpbd_operator', 'reports.verify'),
  ('bpbd_operator', 'shelters.read'), ('bpbd_operator', 'shelters.manage'),
  ('bpbd_operator', 'logistics.read'), ('bpbd_operator', 'logistics.manage'),
  ('bpbd_operator', 'tracking.update'), ('bpbd_operator', 'partner.collaborate'),
  ('bpbd_operator', 'audit.read'), ('bpbd_operator', 'accounts.manage'),
  -- field_officer
  ('field_officer', 'events.read'), ('field_officer', 'reports.create'),
  ('field_officer', 'shelters.read'),
  -- shelter_manager
  ('shelter_manager', 'events.read'), ('shelter_manager', 'shelters.read'),
  ('shelter_manager', 'shelters.manage'),
  -- warehouse_manager
  ('warehouse_manager', 'events.read'), ('warehouse_manager', 'logistics.read'),
  ('warehouse_manager', 'logistics.manage'), ('warehouse_manager', 'shelters.read'),
  -- driver
  ('driver', 'events.read'), ('driver', 'tracking.update'),
  -- institution_partner
  ('institution_partner', 'events.read'), ('institution_partner', 'shelters.read'),
  ('institution_partner', 'logistics.read'), ('institution_partner', 'partner.collaborate'),
  -- public_viewer
  ('public_viewer', 'events.read')
on conflict do nothing;

-- ====================================================================
-- 4. HARDEN ACCESS HELPER FUNCTIONS (CHECK ACTIVE MEMBERSHIP)
-- ====================================================================

-- 4.1 user_has_institution
-- CRITICAL SECURITY CHECK: User must be an ACTIVE member of the target institution.
-- Pending or inactive members MUST NOT receive operational data access.
create or replace function public.user_has_institution(target_institution_id uuid)
returns boolean
language sql
stable
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.user_institutions ui
    where ui.user_id = (select auth.uid())
      and ui.institution_id = target_institution_id
      and ui.status = 'active'
  );
$$;

-- 4.2 user_can_access_warehouse
create or replace function public.user_can_access_warehouse(target_warehouse_id uuid)
returns boolean
language sql
stable
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.warehouses w
    where w.id = target_warehouse_id
      and (
        public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
        or (w.institution_id is not null and public.user_has_institution(w.institution_id))
      )
  );
$$;

-- 4.3 user_can_access_shelter
create or replace function public.user_can_access_shelter(target_shelter_id uuid)
returns boolean
language sql
stable
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.shelters s
    where s.id = target_shelter_id
      and (
        public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
        or (s.institution_id is not null and public.user_has_institution(s.institution_id))
        or (s.institution_id is null and public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role]))
      )
  );
$$;

-- 4.4 user_can_access_distribution
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

-- 4.5 Permission Check Helper
create or replace function public.user_has_permission(p_permission_id text)
returns boolean
language sql
stable
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.role_permissions rp
    where rp.role = public.current_app_role()
      and rp.permission_id = p_permission_id
  );
$$;

-- Revoke execute from public and anon
revoke all on function public.user_has_permission(text) from public, anon;
grant execute on function public.user_has_permission(text) to authenticated, service_role;

-- ====================================================================
-- 5. UPDATE RLS POLICIES FOR INSTITUTION_PARTNER
-- ====================================================================

-- 5.1 third_party_aids SELECT & UPDATE:
-- Institution partners can view third party aid records affiliated with their institution or all unassigned aids
drop policy if exists "third_party_aids_select_scoped" on public.third_party_aids;
create policy "third_party_aids_select_scoped" on public.third_party_aids
  for select to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (warehouse_id is not null and public.user_can_access_warehouse(warehouse_id))
    or (
      public.current_app_role() = 'institution_partner'::public.app_role
      and (
        created_by = (select auth.uid())
        or (warehouse_id is not null and public.user_can_access_warehouse(warehouse_id))
      )
    )
  );

drop policy if exists "third_party_aids_write_insert" on public.third_party_aids;
create policy "third_party_aids_write_insert" on public.third_party_aids
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.current_app_role() = 'warehouse_manager'::public.app_role
      and warehouse_id is not null
      and public.user_can_access_warehouse(warehouse_id)
    )
    or (
      public.current_app_role() = 'institution_partner'::public.app_role
      and created_by = (select auth.uid())
    )
  );

-- 5.2 user_institutions SELECT policy:
-- Users can see their own memberships, institution partners can see memberships of their institution, and operators can view all
drop policy if exists "user_institutions_select_scoped" on public.user_institutions;
create policy "user_institutions_select_scoped" on public.user_institutions
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.current_app_role() = 'institution_partner'::public.app_role
      and public.user_has_institution(institution_id)
    )
  );
