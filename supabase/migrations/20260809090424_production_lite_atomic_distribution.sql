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
set search_path = public, auth
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
  if actor_id is null then
    raise exception 'Pengguna harus login untuk mengalokasikan distribusi.';
  end if;

  select p.app_role into actor_role
  from public.profiles p
  where p.id = actor_id;

  if actor_role is null or actor_role not in ('admin', 'bpbd_operator', 'warehouse_manager') then
    raise exception 'Peran akun ini tidak memiliki izin untuk mengalokasikan stok.';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Jumlah alokasi harus lebih dari 0.';
  end if;

  select *
  into shelter_row
  from public.shelters
  where code = p_shelter_code;

  if not found then
    raise exception 'Posko tujuan tidak ditemukan.';
  end if;

  select *
  into inventory_row
  from public.inventory_items
  where id = p_inventory_item_id;

  if not found then
    raise exception 'Item stok tidak ditemukan.';
  end if;

  if actor_role = 'warehouse_manager' and not public.user_can_access_warehouse(inventory_row.warehouse_id) then
    raise exception 'Akun gudang ini tidak memiliki akses ke stok tersebut.';
  end if;

  update public.inventory_items
  set reserved = reserved + p_quantity,
      status = case
        when stock - (reserved + p_quantity) <= 0 then 'critical'::public.crisis_status
        when stock - (reserved + p_quantity) <= greatest(1, floor(stock * 0.2)) then 'warning'::public.crisis_status
        else status
      end,
      updated_at = now()
  where id = p_inventory_item_id
    and stock - reserved >= p_quantity
  returning * into updated_inventory;

  if not found then
    raise exception 'Stok tidak cukup untuk alokasi ini.';
  end if;

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
  )
  values (
    distribution_code,
    shelter_row.id,
    inventory_row.warehouse_id,
    p_quantity::text || ' ' || inventory_row.unit || ' ' || inventory_row.item,
    coalesce(nullif(p_eta, ''), 'Hari ini'),
    20,
    'disiapkan',
    'BPBD',
    actor_id
  )
  returning * into distribution_row;

  insert into public.distribution_items (
    distribution_id,
    inventory_item_id,
    item,
    quantity,
    unit
  )
  values (
    distribution_row.id,
    inventory_row.id,
    inventory_row.item,
    p_quantity,
    inventory_row.unit
  );

  insert into public.stock_movements (
    inventory_item_id,
    movement_type,
    quantity,
    note,
    created_by
  )
  values (
    inventory_row.id,
    'reserved',
    p_quantity,
    coalesce(nullif(p_notes, ''), 'Dialokasikan ke ' || shelter_row.name || ' dengan prioritas ' || p_priority::text || '.'),
    actor_id
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

revoke execute on function public.allocate_distribution_atomic(uuid, text, integer, text, public.crisis_status, text) from public;
revoke execute on function public.allocate_distribution_atomic(uuid, text, integer, text, public.crisis_status, text) from anon;
grant execute on function public.allocate_distribution_atomic(uuid, text, integer, text, public.crisis_status, text) to authenticated;
