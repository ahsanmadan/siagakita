-- Migration: Database Security Hardening for RPC, SECURITY DEFINER Functions, Grants, and RLS Quality
-- Created: 2026-09-10 15:00:00

-- 1. Hardened mask_sensitive_jsonb (STABLE to eliminate linter warning)
create or replace function public.mask_sensitive_jsonb(p_data jsonb)
returns jsonb
language plpgsql
stable
set search_path to 'public', 'extensions'
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

-- 2. Hardened Access Helpers with Strict search_path and Scoping
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
set search_path to 'public', 'auth'
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'app_role', '')::public.app_role,
    'public_viewer'::public.app_role
  )
$$;

create or replace function public.is_ops_role(roles public.app_role[])
returns boolean
language sql
stable
set search_path to 'public', 'auth'
as $$
  select public.current_app_role() = any(roles)
$$;

create or replace function public.user_has_institution(target_institution_id uuid)
returns boolean
language sql
stable
set search_path to 'public', 'auth'
as $$
  select exists (
    select 1
    from public.user_institutions ui
    where ui.user_id = (select auth.uid())
      and ui.institution_id = target_institution_id
  )
$$;

create or replace function public.user_can_access_warehouse(target_warehouse_id uuid)
returns boolean
language sql
stable
set search_path to 'public', 'auth'
as $$
  select exists (
    select 1
    from public.warehouses w
    where w.id = target_warehouse_id
      and (
        public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
        or (w.institution_id is not null and public.user_has_institution(w.institution_id))
      )
  )
$$;

create or replace function public.user_can_access_shelter(target_shelter_id uuid)
returns boolean
language sql
stable
set search_path to 'public', 'auth'
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
  )
$$;

create or replace function public.user_can_access_distribution(target_dist_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'auth', 'extensions'
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

-- 3. Hardened allocate_distribution_atomic with Stock Integrity and Audit Logging
create or replace function public.allocate_distribution_atomic(
  p_inventory_item_id uuid,
  p_shelter_code text,
  p_quantity integer,
  p_eta text default 'Hari ini'::text,
  p_priority public.crisis_status default 'warning'::public.crisis_status,
  p_notes text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'extensions'
as $$
declare
  actor_id uuid := auth.uid();
  actor_role public.app_role;
  shelter_row public.shelters%rowtype;
  inventory_row public.inventory_items%rowtype;
  updated_inventory public.inventory_items%rowtype;
  distribution_row public.distributions%rowtype;
  distribution_code text;
begin
  -- 1. Caller Authentication Validation
  if actor_id is null then
    raise exception 'Pengguna harus terotentikasi untuk mengalokasikan distribusi.';
  end if;

  select p.app_role into actor_role from public.profiles p where p.id = actor_id;

  if actor_role is null or actor_role not in ('admin', 'bpbd_operator', 'warehouse_manager') then
    raise exception 'Peran akun ini tidak memiliki wewenang untuk mengalokasikan stok logistik.';
  end if;

  -- 2. Input Integrity Validation
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Jumlah alokasi logistik harus lebih dari 0.';
  end if;

  select * into shelter_row from public.shelters where code = p_shelter_code;
  if not found then
    raise exception 'Posko tujuan dengan kode % tidak ditemukan.', p_shelter_code;
  end if;

  select * into inventory_row from public.inventory_items where id = p_inventory_item_id;
  if not found then
    raise exception 'Item inventaris logistik tidak ditemukan.';
  end if;

  -- 3. Warehouse Scope Authorization
  if actor_role = 'warehouse_manager' and not public.user_can_access_warehouse(inventory_row.warehouse_id) then
    raise exception 'Pengelola gudang tidak memiliki wewenang mengalokasikan stok dari gudang ini.';
  end if;

  -- 4. Atomic Stock Reservation (Strict check against negative stock)
  update public.inventory_items
  set reserved = reserved + p_quantity,
      status = case
        when stock - (reserved + p_quantity) <= 0 then 'critical'::public.crisis_status
        when stock - (reserved + p_quantity) <= greatest(1, floor(stock * 0.2)) then 'warning'::public.crisis_status
        else status
      end,
      updated_at = now()
  where id = p_inventory_item_id and (stock - reserved) >= p_quantity
  returning * into updated_inventory;

  if not found then
    raise exception 'Stok barang tidak mencukupi untuk memenuhi alokasi ini.';
  end if;

  -- 5. Generate Distribution Code
  distribution_code := 'DST-' || to_char(extract(epoch from clock_timestamp())::bigint % 100000, 'FM00000');

  insert into public.distributions (
    code,
    destination_shelter_id,
    origin_warehouse_id,
    cargo_summary,
    eta,
    progress,
    status,
    institution,
    created_by
  ) values (
    distribution_code,
    shelter_row.id,
    inventory_row.warehouse_id,
    p_quantity::text || ' ' || inventory_row.unit || ' ' || inventory_row.item,
    coalesce(nullif(p_eta, ''), 'Hari ini'),
    20,
    'disiapkan'::public.distribution_status,
    'BPBD',
    actor_id
  ) returning * into distribution_row;

  insert into public.distribution_items (distribution_id, inventory_item_id, item, quantity, unit)
  values (distribution_row.id, inventory_row.id, inventory_row.item, p_quantity, inventory_row.unit);

  -- 6. Stock Movement Recording
  insert into public.stock_movements (inventory_item_id, movement_type, quantity, note, created_by)
  values (
    inventory_row.id,
    'reserved',
    p_quantity,
    coalesce(nullif(p_notes, ''), 'Dialokasikan ke ' || shelter_row.name || ' dengan prioritas ' || p_priority::text || '.'),
    actor_id
  );

  -- 7. Audit Log Recording via Controlled Path
  perform public.log_audit_event(
    actor_id,
    'distribution.allocated',
    'distributions',
    distribution_row.id,
    'Alokasi ' || p_quantity::text || ' ' || inventory_row.unit || ' ' || inventory_row.item || ' disetujui untuk posko ' || shelter_row.name || '.',
    'important',
    null,
    jsonb_build_object(
      'distribution_id', distribution_row.id,
      'distribution_code', distribution_row.code,
      'shelter_name', shelter_row.name,
      'item', inventory_row.item,
      'quantity', p_quantity,
      'unit', inventory_row.unit,
      'warehouse_id', inventory_row.warehouse_id
    ),
    actor_role::text,
    null,
    'web',
    jsonb_build_object('priority', p_priority)
  );

  return jsonb_build_object(
    'distribution_id', distribution_row.id,
    'distribution_code', distribution_row.code,
    'shelter', shelter_row.name,
    'inventory', jsonb_build_object(
      'id', updated_inventory.id,
      'item', updated_inventory.item,
      'stock', updated_inventory.stock,
      'reserved', updated_inventory.reserved,
      'unit', updated_inventory.unit
    )
  );
end;
$$;

-- 4. Tighten Routine Privileges: Revoke Execute from PUBLIC and anon
revoke all on function public.allocate_distribution_atomic from public, anon;
grant execute on function public.allocate_distribution_atomic to authenticated, service_role;

revoke all on function public.user_can_access_distribution from public, anon;
grant execute on function public.user_can_access_distribution to authenticated, service_role;

revoke all on function public.user_can_access_warehouse from public, anon;
grant execute on function public.user_can_access_warehouse to authenticated, service_role;

revoke all on function public.user_can_access_shelter from public, anon;
grant execute on function public.user_can_access_shelter to authenticated, service_role;

revoke all on function public.user_has_institution from public, anon;
grant execute on function public.user_has_institution to authenticated, service_role;

revoke all on function public.current_app_role from public, anon;
grant execute on function public.current_app_role to authenticated, service_role;

revoke all on function public.is_ops_role from public, anon;
grant execute on function public.is_ops_role to authenticated, service_role;

-- Revoke trigger functions execution from public and anon
revoke all on function public.set_updated_at from public, anon;
grant execute on function public.set_updated_at to authenticated, service_role;

revoke all on function public.sync_spatial_point from public, anon;
grant execute on function public.sync_spatial_point to authenticated, service_role;

revoke all on function public.sync_distribution_spatial_point from public, anon;
grant execute on function public.sync_distribution_spatial_point to authenticated, service_role;

-- 5. Deduplicate and Refine RLS Policies
-- Drop redundant select policy on aid_request_items (aid_request_items_all already covers select with same qual)
drop policy if exists "aid_request_items_select" on public.aid_request_items;
