-- 20260910110000_add_aid_requests_and_allocations.sql
-- Establishes structured aid request and stock allocation workflow

-- 1. Create Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'aid_request_status') then
    create type public.aid_request_status as enum (
      'diajukan',
      'ditinjau',
      'sebagian_dialokasikan',
      'dialokasikan',
      'dalam_distribusi',
      'terpenuhi',
      'ditolak',
      'dibatalkan'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'aid_allocation_status') then
    create type public.aid_allocation_status as enum (
      'dialokasikan',
      'sebagian_dikirim',
      'dikirim',
      'diterima',
      'dibatalkan'
    );
  end if;
end $$;

-- 2. Create Table: aid_requests
create table if not exists public.aid_requests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  shelter_id uuid not null references public.shelters(id) on delete cascade,
  event_id uuid references public.disaster_events(id) on delete set null,
  status public.aid_request_status not null default 'diajukan',
  priority public.crisis_status not null default 'warning',
  notes text,
  requested_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Create Table: aid_request_items
create table if not exists public.aid_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.aid_requests(id) on delete cascade,
  item text not null,
  category text not null default 'Logistik',
  requested_quantity integer not null check (requested_quantity > 0),
  allocated_quantity integer not null default 0 check (allocated_quantity >= 0),
  fulfilled_quantity integer not null default 0 check (fulfilled_quantity >= 0),
  unit text not null default 'unit',
  urgency public.crisis_status not null default 'warning',
  notes text,
  fulfillment_status text not null default 'menunggu' check (fulfillment_status in ('menunggu', 'sebagian', 'dialokasikan', 'terpenuhi')),
  legacy_need_id uuid references public.needs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Create Table: aid_allocations
create table if not exists public.aid_allocations (
  id uuid primary key default gen_random_uuid(),
  request_item_id uuid not null references public.aid_request_items(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  allocated_quantity integer not null check (allocated_quantity > 0),
  allocation_status public.aid_allocation_status not null default 'dialokasikan',
  allocated_by uuid references public.profiles(id) on delete set null,
  allocated_at timestamptz not null default now(),
  distribution_id uuid references public.distributions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Indexes
create index if not exists aid_requests_shelter_id_idx on public.aid_requests(shelter_id);
create index if not exists aid_requests_status_idx on public.aid_requests(status);
create index if not exists aid_requests_created_at_idx on public.aid_requests(created_at desc);

create index if not exists aid_request_items_request_id_idx on public.aid_request_items(request_id);
create index if not exists aid_request_items_legacy_need_idx on public.aid_request_items(legacy_need_id);

create index if not exists aid_allocations_request_item_id_idx on public.aid_allocations(request_item_id);
create index if not exists aid_allocations_warehouse_id_idx on public.aid_allocations(warehouse_id);
create index if not exists aid_allocations_distribution_id_idx on public.aid_allocations(distribution_id);

-- 6. Updated_at triggers
drop trigger if exists aid_requests_set_updated_at on public.aid_requests;
create trigger aid_requests_set_updated_at
  before update on public.aid_requests
  for each row execute function public.set_updated_at();

drop trigger if exists aid_request_items_set_updated_at on public.aid_request_items;
create trigger aid_request_items_set_updated_at
  before update on public.aid_request_items
  for each row execute function public.set_updated_at();

drop trigger if exists aid_allocations_set_updated_at on public.aid_allocations;
create trigger aid_allocations_set_updated_at
  before update on public.aid_allocations
  for each row execute function public.set_updated_at();

-- 7. RLS Configuration
alter table public.aid_requests enable row level security;
alter table public.aid_request_items enable row level security;
alter table public.aid_allocations enable row level security;

-- aid_requests policies
drop policy if exists "aid_requests_select" on public.aid_requests;
create policy "aid_requests_select" on public.aid_requests
  for select to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'warehouse_manager'::public.app_role])
    or public.user_can_access_shelter(shelter_id)
  );

drop policy if exists "aid_requests_insert" on public.aid_requests;
create policy "aid_requests_insert" on public.aid_requests
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'shelter_manager'::public.app_role])
    and (
      public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
      or public.user_can_access_shelter(shelter_id)
    )
  );

drop policy if exists "aid_requests_update" on public.aid_requests;
create policy "aid_requests_update" on public.aid_requests
  for update to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'warehouse_manager'::public.app_role])
    or public.user_can_access_shelter(shelter_id)
  );

-- aid_request_items policies
drop policy if exists "aid_request_items_select" on public.aid_request_items;
create policy "aid_request_items_select" on public.aid_request_items
  for select to authenticated
  using (
    exists (
      select 1 from public.aid_requests r
      where r.id = aid_request_items.request_id
        and (
          public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'warehouse_manager'::public.app_role])
          or public.user_can_access_shelter(r.shelter_id)
        )
    )
  );

drop policy if exists "aid_request_items_all" on public.aid_request_items;
create policy "aid_request_items_all" on public.aid_request_items
  for all to authenticated
  using (
    exists (
      select 1 from public.aid_requests r
      where r.id = aid_request_items.request_id
        and (
          public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'warehouse_manager'::public.app_role])
          or public.user_can_access_shelter(r.shelter_id)
        )
    )
  );

-- aid_allocations policies
drop policy if exists "aid_allocations_select" on public.aid_allocations;
create policy "aid_allocations_select" on public.aid_allocations
  for select to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or public.user_can_access_warehouse(warehouse_id)
    or exists (
      select 1 from public.aid_request_items ri
      join public.aid_requests r on r.id = ri.request_id
      where ri.id = aid_allocations.request_item_id
        and public.user_can_access_shelter(r.shelter_id)
    )
  );

drop policy if exists "aid_allocations_insert" on public.aid_allocations;
create policy "aid_allocations_insert" on public.aid_allocations
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or public.user_can_access_warehouse(warehouse_id)
  );

drop policy if exists "aid_allocations_update" on public.aid_allocations;
create policy "aid_allocations_update" on public.aid_allocations
  for update to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or public.user_can_access_warehouse(warehouse_id)
    or exists (
      select 1 from public.aid_request_items ri
      join public.aid_requests r on r.id = ri.request_id
      where ri.id = aid_allocations.request_item_id
        and public.user_can_access_shelter(r.shelter_id)
    )
  );

-- 8. Register in realtime publication if present
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.aid_requests;
    alter publication supabase_realtime add table public.aid_request_items;
    alter publication supabase_realtime add table public.aid_allocations;
  end if;
exception
  when duplicate_object then null;
end $$;

-- 9. Safe Backfill from existing needs table
do $$
declare
  need_record record;
  new_req_id uuid;
  req_code text;
  req_status public.aid_request_status;
  item_fulfillment text;
  seq_counter integer := 1;
begin
  for need_record in
    select n.*, s.event_id as shelter_event_id
    from public.needs n
    left join public.shelters s on s.id = n.shelter_id
    order by n.created_at asc
  loop
    -- Determine initial status from requested vs available
    if need_record.available >= need_record.requested and need_record.requested > 0 then
      req_status := 'terpenuhi';
      item_fulfillment := 'terpenuhi';
    elsif need_record.available > 0 then
      req_status := 'sebagian_dialokasikan';
      item_fulfillment := 'sebagian';
    else
      req_status := 'diajukan';
      item_fulfillment := 'menunggu';
    end if;

    req_code := 'REQ-' || to_char(need_record.created_at, 'YYYYMM') || '-' || to_char(seq_counter, 'FM0000') || '-' || substr(replace(need_record.id::text, '-', ''), 25, 8);
    seq_counter := seq_counter + 1;

    insert into public.aid_requests (
      code,
      shelter_id,
      event_id,
      status,
      priority,
      notes,
      created_at,
      updated_at
    )
    values (
      req_code,
      need_record.shelter_id,
      need_record.shelter_event_id,
      req_status,
      need_record.urgency,
      'Migrasi kebutuhan historis posko (' || need_record.item || ').',
      need_record.created_at,
      need_record.updated_at
    )
    returning id into new_req_id;

    insert into public.aid_request_items (
      request_id,
      item,
      category,
      requested_quantity,
      allocated_quantity,
      fulfilled_quantity,
      unit,
      urgency,
      notes,
      fulfillment_status,
      legacy_need_id,
      created_at,
      updated_at
    )
    values (
      new_req_id,
      need_record.item,
      need_record.category,
      need_record.requested,
      need_record.available,
      case when need_record.available >= need_record.requested then need_record.requested else need_record.available end,
      need_record.unit,
      need_record.urgency,
      'Item kebutuhan posko teregister.',
      item_fulfillment,
      need_record.id,
      need_record.created_at,
      need_record.updated_at
    );
  end loop;
end $$;
