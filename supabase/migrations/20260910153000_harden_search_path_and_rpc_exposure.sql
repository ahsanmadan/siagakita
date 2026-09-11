-- Migration: Harden Function Search Paths, SECURITY DEFINER RPCs, and Table Whitelisting
-- Created: 2026-09-10 15:30:00

-- ====================================================================
-- 1. FIX MUTABLE SEARCH PATHS ON SPATIAL SYNC TRIGGER FUNCTIONS
-- ====================================================================
-- By setting search_path explicitly to public, extensions, pg_temp,
-- we eliminate the PostgreSQL search_path hijack warning and satisfy Supabase Advisor.

create or replace function public.sync_spatial_point()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  if new.longitude is not null and new.latitude is not null then
    new.location_point := extensions.ST_SetSRID(extensions.ST_MakePoint(new.longitude, new.latitude), 4326)::extensions.geography;
  else
    new.location_point := null;
  end if;
  return new;
end;
$$;

create or replace function public.sync_distribution_spatial_point()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  if new.last_longitude is not null and new.last_latitude is not null then
    new.last_location_point := extensions.ST_SetSRID(extensions.ST_MakePoint(new.last_longitude, new.last_latitude), 4326)::extensions.geography;
  else
    new.last_location_point := null;
  end if;
  return new;
end;
$$;

-- Revoke all execute from public and anon on trigger functions
revoke all on function public.sync_spatial_point() from public, anon;
revoke all on function public.sync_distribution_spatial_point() from public, anon;
grant execute on function public.sync_spatial_point() to authenticated, service_role;
grant execute on function public.sync_distribution_spatial_point() to authenticated, service_role;

-- ====================================================================
-- 2. HARDEN USER_CAN_ACCESS_DISTRIBUTION (RLS-ONLY HELPER)
-- ====================================================================
-- Justification:
-- user_can_access_distribution is an internal RLS evaluation helper.
-- It is marked STABLE and SECURITY DEFINER to evaluate distribution permissions
-- across assignments, warehouses, and shelters without circular RLS recursion.
-- We REVOKE EXECUTE from anon, public, AND authenticated users so it cannot
-- be invoked as a standalone RPC endpoint via the client API.
-- PostgreSQL RLS policy evaluation executes under table owner / superuser or definer context,
-- so revoking direct authenticated EXECUTE prevents RPC exposure while keeping RLS functional.

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

-- Protect helper from direct RPC invocation
revoke all on function public.user_can_access_distribution(uuid) from public, anon, authenticated;
grant execute on function public.user_can_access_distribution(uuid) to service_role, postgres;

-- ====================================================================
-- 3. HARDEN LOG_AUDIT_EVENT (RPC SECURITY DEFINER)
-- ====================================================================
-- Justification:
-- log_audit_event is callable by authenticated users and service_role to log audit records.
-- Because audit_logs has direct INSERT revoked for all users, this function is the single
-- secure conduit for operational auditing.
-- Security Controls:
-- 1. Anti-Spoofing: auth.uid() is strictly derived; caller cannot specify another actor_id.
-- 2. Role & Institution: actor_role and institution_id are derived directly from profiles/user_institutions.
-- 3. Whitelisted Action & Table Validation: arbitrary or spoofed action names/tables are rejected.
-- 4. Automatic Payload Masking: passwords, tokens, phone numbers, and raw messages are masked.
-- 5. Fixed search_path = public, extensions, pg_temp prevents search-path injection.

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
set search_path = public, extensions, pg_temp
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
  -- 1. Anti-Spoofing Caller Validation
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

    -- 2. Strict Whitelisting for Authenticated Callers:
    -- Prevent arbitrary fake action / table creation
    if p_target_table not in (
      'disaster_events', 'field_reports', 'shelters', 'warehouses',
      'inventory_items', 'needs', 'aid_requests', 'aid_request_items',
      'aid_allocations', 'stock_movements', 'distributions',
      'distribution_items', 'vehicles', 'drivers',
      'distribution_vehicle_assignments', 'delivery_tracking_updates',
      'distribution_status_history', 'proof_of_delivery',
      'sms_messages', 'sms_parse_results', 'third_party_aids',
      'profiles', 'ai_recommendations', 'system'
    ) then
      raise exception 'Target tabel audit tidak diizinkan: %', p_target_table;
    end if;

    -- Enforce standard hierarchical action prefixes
    if p_action !~ '^[a-z0-9_]+\.[a-z0-9_]+$' then
      raise exception 'Format nama action audit tidak valid: %', p_action;
    end if;

    if split_part(p_action, '.', 1) not in (
      'event', 'report', 'sms', 'aid_request', 'aid_allocation',
      'shelter', 'need', 'distribution', 'proof_of_delivery',
      'third_party_aid', 'auth', 'account', 'recommendation', 'system'
    ) then
      raise exception 'Kategori action audit tidak valid: %', p_action;
    end if;

  -- Trusted internal execution (service_role or database triggers)
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
    raise exception 'Akses audit log ditolak untuk peran: %', v_caller_role;
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

revoke all on function public.log_audit_event from public, anon;
grant execute on function public.log_audit_event to authenticated, service_role;

-- ====================================================================
-- 4. HARDEN ALLOCATE_DISTRIBUTION_ATOMIC (RPC SECURITY DEFINER)
-- ====================================================================
-- Justification:
-- allocate_distribution_atomic is callable by authenticated users because warehouse
-- managers and operational officers perform multi-table atomic reservation:
-- updating inventory items, creating distribution records, creating distribution items,
-- adding stock movements, and writing audit logs in a single transaction.
-- Security Controls:
-- 1. Validates auth.uid() is not null.
-- 2. Restricts callers strictly to ('admin', 'bpbd_operator', 'warehouse_manager').
-- 3. Enforces warehouse institutional scoping via public.user_can_access_warehouse.
-- 4. Validates positive quantity and guarantees sufficient available stock (stock - reserved >= p_quantity).
-- 5. Automatically logs stock movements and writes immutable audit entry.
-- 6. Fixed search_path = public, auth, extensions, pg_temp.

create or replace function public.allocate_distribution_atomic(
  p_inventory_item_id uuid,
  p_shelter_code text,
  p_quantity integer,
  p_eta text default 'Hari ini',
  p_priority public.crisis_status default 'warning',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
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

  if actor_role is null or actor_role not in ('admin'::public.app_role, 'bpbd_operator'::public.app_role, 'warehouse_manager'::public.app_role) then
    raise exception 'Peran akun ini tidak memiliki wewenang untuk mengalokasikan stok logistik.';
  end if;

  -- 2. Input Integrity Validation
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Jumlah alokasi logistik harus lebih dari 0.';
  end if;

  select * into shelter_row from public.shelters where code = p_shelter_code or id::text = p_shelter_code limit 1;
  if not found then
    raise exception 'Posko tujuan dengan kode % tidak ditemukan.', p_shelter_code;
  end if;

  select * into inventory_row from public.inventory_items where id = p_inventory_item_id;
  if not found then
    raise exception 'Item inventaris logistik tidak ditemukan.';
  end if;

  -- 3. Warehouse Scope Authorization
  if actor_role = 'warehouse_manager'::public.app_role and not public.user_can_access_warehouse(inventory_row.warehouse_id) then
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

revoke all on function public.allocate_distribution_atomic from public, anon;
grant execute on function public.allocate_distribution_atomic to authenticated, service_role;
