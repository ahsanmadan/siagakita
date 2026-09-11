-- 20260910120000_add_logistics_vehicle_tracking.sql
-- Logistics vehicle tracking, driver assignments, delivery status history, and proof of delivery

-- 1. Safely expand distribution_status enum
alter type public.distribution_status add value if not exists 'menunggu_alokasi';
alter type public.distribution_status add value if not exists 'dialokasikan';
alter type public.distribution_status add value if not exists 'berangkat';
alter type public.distribution_status add value if not exists 'dalam_perjalanan';
alter type public.distribution_status add value if not exists 'tertunda';
alter type public.distribution_status add value if not exists 'tiba_di_posko';
alter type public.distribution_status add value if not exists 'diterima_posko';
alter type public.distribution_status add value if not exists 'selesai';
alter type public.distribution_status add value if not exists 'dibatalkan';

-- 2. Add cached location tracking fields to distributions
alter table public.distributions
  add column if not exists last_location_name text,
  add column if not exists last_latitude double precision,
  add column if not exists last_longitude double precision,
  add column if not exists last_tracking_updated_at timestamptz;

-- 3. Create Table: vehicles
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  plate_number text not null,
  name text not null,
  vehicle_type text not null,
  capacity_weight_kg numeric check (capacity_weight_kg is null or capacity_weight_kg >= 0),
  capacity_volume_m3 numeric check (capacity_volume_m3 is null or capacity_volume_m3 >= 0),
  capacity_description text,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  institution_id text,
  institution_name text,
  operational_status text not null default 'siap' check (operational_status in ('siap', 'bertugas', 'perbaikan', 'nonaktif')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Create Table: drivers
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  phone_number text,
  license_number text,
  institution_id text,
  institution_name text,
  active_status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Create Table: distribution_vehicle_assignments
create table if not exists public.distribution_vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  distribution_id uuid not null references public.distributions(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  assignment_status text not null default 'aktif' check (assignment_status in ('aktif', 'selesai', 'dibatalkan', 'diganti')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Create Table: delivery_tracking_updates (Source of truth for manual location checkpoints)
create table if not exists public.delivery_tracking_updates (
  id uuid primary key default gen_random_uuid(),
  distribution_id uuid not null references public.distributions(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  status text not null,
  location_name text,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meter numeric check (accuracy_meter is null or accuracy_meter >= 0),
  note text,
  source text not null default 'manual_driver' check (source in ('manual_driver', 'manual_petugas', 'checkpoint_posko', 'system')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 7. Create Table: proof_of_delivery
create table if not exists public.proof_of_delivery (
  id uuid primary key default gen_random_uuid(),
  distribution_id uuid not null references public.distributions(id) on delete cascade,
  shelter_id uuid not null references public.shelters(id) on delete cascade,
  received_by text not null,
  received_by_profile_id uuid references public.profiles(id) on delete set null,
  received_at timestamptz not null default now(),
  receiver_note text,
  proof_path text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 8. Create Table: distribution_status_history
create table if not exists public.distribution_status_history (
  id uuid primary key default gen_random_uuid(),
  distribution_id uuid not null references public.distributions(id) on delete cascade,
  previous_status text,
  next_status text not null,
  note text,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 9. Indexes
create index if not exists vehicles_warehouse_id_idx on public.vehicles(warehouse_id);
create index if not exists vehicles_status_idx on public.vehicles(operational_status);
create index if not exists drivers_profile_id_idx on public.drivers(profile_id);
create index if not exists drivers_active_idx on public.drivers(active_status);
create index if not exists dist_assignments_dist_id_idx on public.distribution_vehicle_assignments(distribution_id);
create index if not exists dist_assignments_vehicle_id_idx on public.distribution_vehicle_assignments(vehicle_id);
create index if not exists dist_assignments_driver_id_idx on public.distribution_vehicle_assignments(driver_id);
create index if not exists tracking_updates_dist_id_idx on public.delivery_tracking_updates(distribution_id);
create index if not exists tracking_updates_created_at_idx on public.delivery_tracking_updates(created_at desc);
create index if not exists pod_dist_id_idx on public.proof_of_delivery(distribution_id);
create index if not exists pod_shelter_id_idx on public.proof_of_delivery(shelter_id);
create index if not exists dist_status_hist_dist_id_idx on public.distribution_status_history(distribution_id);
create index if not exists dist_status_hist_created_at_idx on public.distribution_status_history(created_at desc);

-- 10. Updated_at triggers
drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

drop trigger if exists drivers_set_updated_at on public.drivers;
create trigger drivers_set_updated_at
  before update on public.drivers
  for each row execute function public.set_updated_at();

drop trigger if exists dist_assignments_set_updated_at on public.distribution_vehicle_assignments;
create trigger dist_assignments_set_updated_at
  before update on public.distribution_vehicle_assignments
  for each row execute function public.set_updated_at();

-- 11. Row Level Security
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.distribution_vehicle_assignments enable row level security;
alter table public.delivery_tracking_updates enable row level security;
alter table public.proof_of_delivery enable row level security;
alter table public.distribution_status_history enable row level security;

-- Policies: vehicles
drop policy if exists "vehicles_select" on public.vehicles;
create policy "vehicles_select" on public.vehicles
  for select to authenticated
  using (true);

drop policy if exists "vehicles_write" on public.vehicles;
create policy "vehicles_write" on public.vehicles
  for all to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'warehouse_manager'::public.app_role])
  );

-- Policies: drivers (public cannot read sensitive driver info like phone number/license)
drop policy if exists "drivers_select" on public.drivers;
create policy "drivers_select" on public.drivers
  for select to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'warehouse_manager'::public.app_role, 'driver'::public.app_role, 'shelter_manager'::public.app_role])
  );

drop policy if exists "drivers_write" on public.drivers;
create policy "drivers_write" on public.drivers
  for all to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'warehouse_manager'::public.app_role])
  );

-- Policies: distribution_vehicle_assignments
drop policy if exists "assignments_select" on public.distribution_vehicle_assignments;
create policy "assignments_select" on public.distribution_vehicle_assignments
  for select to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'warehouse_manager'::public.app_role, 'shelter_manager'::public.app_role])
    or exists (
      select 1 from public.drivers d
      where d.id = distribution_vehicle_assignments.driver_id
        and d.profile_id = auth.uid()
    )
  );

drop policy if exists "assignments_write" on public.distribution_vehicle_assignments;
create policy "assignments_write" on public.distribution_vehicle_assignments
  for all to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'warehouse_manager'::public.app_role])
  );

-- Policies: delivery_tracking_updates
drop policy if exists "tracking_updates_select" on public.delivery_tracking_updates;
create policy "tracking_updates_select" on public.delivery_tracking_updates
  for select to authenticated
  using (true);

drop policy if exists "tracking_updates_insert" on public.delivery_tracking_updates;
create policy "tracking_updates_insert" on public.delivery_tracking_updates
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'warehouse_manager'::public.app_role])
    or exists (
      select 1 from public.drivers d
      join public.distribution_vehicle_assignments dva on dva.driver_id = d.id
      where dva.distribution_id = delivery_tracking_updates.distribution_id
        and dva.assignment_status = 'aktif'
        and d.profile_id = auth.uid()
    )
  );

-- Policies: proof_of_delivery
drop policy if exists "pod_select" on public.proof_of_delivery;
create policy "pod_select" on public.proof_of_delivery
  for select to authenticated
  using (true);

drop policy if exists "pod_insert" on public.proof_of_delivery;
create policy "pod_insert" on public.proof_of_delivery
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or public.user_can_access_shelter(shelter_id)
  );

-- Policies: distribution_status_history
drop policy if exists "status_history_select" on public.distribution_status_history;
create policy "status_history_select" on public.distribution_status_history
  for select to authenticated
  using (true);

drop policy if exists "status_history_insert" on public.distribution_status_history;
create policy "status_history_insert" on public.distribution_status_history
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'warehouse_manager'::public.app_role, 'shelter_manager'::public.app_role])
    or exists (
      select 1 from public.drivers d
      join public.distribution_vehicle_assignments dva on dva.driver_id = d.id
      where dva.distribution_id = distribution_status_history.distribution_id
        and dva.assignment_status = 'aktif'
        and d.profile_id = auth.uid()
    )
  );

-- 12. Register realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.vehicles;
    alter publication supabase_realtime add table public.distribution_vehicle_assignments;
    alter publication supabase_realtime add table public.delivery_tracking_updates;
    alter publication supabase_realtime add table public.proof_of_delivery;
    alter publication supabase_realtime add table public.distribution_status_history;
  end if;
exception
  when duplicate_object then null;
end $$;

-- 13. Seed default fleet and initial history for existing distribution if needed
do $$
declare
  wh_id uuid;
  v1_id uuid;
  v2_id uuid;
  d1_id uuid;
  d2_id uuid;
  dist_id uuid;
begin
  select id into wh_id from public.warehouses order by created_at asc limit 1;
  
  if not exists (select 1 from public.vehicles limit 1) then
    insert into public.vehicles (code, plate_number, name, vehicle_type, capacity_weight_kg, capacity_volume_m3, capacity_description, warehouse_id, institution_name, operational_status)
    values
      ('ARM-01', 'B 9234 BPD', 'Truk Isuzu Elf Box 01', 'Truk Box 4 Roda', 2500, 12, 'Kapasitas 2.5 ton beras/sembako', wh_id, 'BPBD Jawa Barat', 'siap')
    returning id into v1_id;

    insert into public.vehicles (code, plate_number, name, vehicle_type, capacity_weight_kg, capacity_volume_m3, capacity_description, warehouse_id, institution_name, operational_status)
    values
      ('ARM-02', 'B 9811 KMN', 'Toyota Hilux 4x4 Double Cabin', 'Pickup 4x4', 1000, 4, 'Kendaraan taktis medan terjal/longsor', wh_id, 'Tagana', 'siap')
    returning id into v2_id;
  end if;

  if not exists (select 1 from public.drivers limit 1) then
    insert into public.drivers (name, phone_number, license_number, institution_name, active_status)
    values
      ('Rudi Hartono', '0812-8877-6655', 'SIM B1: 89012345678', 'BPBD Armada Logistik', true)
    returning id into d1_id;

    insert into public.drivers (name, phone_number, license_number, institution_name, active_status)
    values
      ('Bambang Sugiarto', '0857-2233-4411', 'SIM A: 77889900112', 'Relawan Transportasi Tagana', true)
    returning id into d2_id;
  end if;

  -- Backfill status history & assignment for existing distribution
  for dist_id in select id from public.distributions loop
    if not exists (select 1 from public.distribution_status_history where distribution_id = dist_id) then
      insert into public.distribution_status_history (distribution_id, previous_status, next_status, note)
      values (dist_id, null, 'dalam_perjalanan', 'Distribusi aktif sedang dalam proses pengiriman logistik.');
    end if;

    if not exists (select 1 from public.distribution_vehicle_assignments where distribution_id = dist_id) then
      select id into v1_id from public.vehicles limit 1;
      select id into d1_id from public.drivers limit 1;
      if v1_id is not null and d1_id is not null then
        insert into public.distribution_vehicle_assignments (distribution_id, vehicle_id, driver_id, assignment_status, notes)
        values (dist_id, v1_id, d1_id, 'aktif', 'Penugasan armada distribusi darurat');
      end if;
    end if;
  end loop;
end $$;
