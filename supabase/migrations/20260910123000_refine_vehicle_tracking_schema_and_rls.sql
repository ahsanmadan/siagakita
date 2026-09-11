-- 20260910123000_refine_vehicle_tracking_schema_and_rls.sql
-- Refines vehicle tracking foreign keys, converts status columns to distribution_status enum,
-- and tightens RLS access scopes across all vehicle tracking tables.

-- 1. Helper function for distribution access
create or replace function public.user_can_access_distribution(target_dist_id uuid)
returns boolean
language sql
security definer
stable
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

-- 2. Safely backfill & alter vehicles.institution_id and drivers.institution_id to uuid FK
do $$
begin
  -- Backfill institution_id from institutions table if matching name exists
  update public.vehicles v
  set institution_id = i.id::text
  from public.institutions i
  where v.institution_name is not null
    and lower(v.institution_name) = lower(i.name)
    and v.institution_id is null;

  update public.drivers d
  set institution_id = i.id::text
  from public.institutions i
  where d.institution_name is not null
    and lower(d.institution_name) = lower(i.name)
    and d.institution_id is null;

  -- Default backfill to BPBD institution if name contains BPBD
  update public.vehicles
  set institution_id = (select id::text from public.institutions where name ilike '%BPBD%' limit 1)
  where institution_id is null and institution_name ilike '%BPBD%';

  update public.drivers
  set institution_id = (select id::text from public.institutions where name ilike '%BPBD%' limit 1)
  where institution_id is null and institution_name ilike '%BPBD%';

  -- Nullify any remaining non-UUID strings to guarantee safe cast
  update public.vehicles
  set institution_id = null
  where institution_id is not null
    and institution_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  update public.drivers
  set institution_id = null
  where institution_id is not null
    and institution_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
end $$;

-- Drop previous FK if exists, then alter column type to uuid with FK
alter table public.vehicles
  alter column institution_id drop default,
  alter column institution_id type uuid using institution_id::uuid;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'vehicles_institution_id_fkey' and table_name = 'vehicles'
  ) then
    alter table public.vehicles
      add constraint vehicles_institution_id_fkey
      foreign key (institution_id) references public.institutions(id) on delete set null;
  end if;
end $$;

alter table public.drivers
  alter column institution_id drop default,
  alter column institution_id type uuid using institution_id::uuid;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'drivers_institution_id_fkey' and table_name = 'drivers'
  ) then
    alter table public.drivers
      add constraint drivers_institution_id_fkey
      foreign key (institution_id) references public.institutions(id) on delete set null;
  end if;
end $$;

create index if not exists vehicles_institution_id_idx on public.vehicles(institution_id);
create index if not exists drivers_institution_id_idx on public.drivers(institution_id);

-- 3. Safely convert status columns to distribution_status enum
-- Convert delivery_tracking_updates.status
update public.delivery_tracking_updates
set status = 'dalam_perjalanan'
where status not in (
  select enumlabel from pg_enum join pg_type on pg_enum.enumtypid = pg_type.oid where pg_type.typname = 'distribution_status'
);

alter table public.delivery_tracking_updates
  alter column status type public.distribution_status using status::public.distribution_status;

-- Convert distribution_status_history.previous_status and next_status
update public.distribution_status_history
set previous_status = null
where previous_status is not null and previous_status not in (
  select enumlabel from pg_enum join pg_type on pg_enum.enumtypid = pg_type.oid where pg_type.typname = 'distribution_status'
);

update public.distribution_status_history
set next_status = 'dalam_perjalanan'
where next_status not in (
  select enumlabel from pg_enum join pg_type on pg_enum.enumtypid = pg_type.oid where pg_type.typname = 'distribution_status'
);

alter table public.distribution_status_history
  alter column previous_status type public.distribution_status using previous_status::public.distribution_status,
  alter column next_status type public.distribution_status using next_status::public.distribution_status;

-- 4. TIGHTEN ROW LEVEL SECURITY POLICIES

-- Vehicles Policies
drop policy if exists "vehicles_select" on public.vehicles;
create policy "vehicles_select" on public.vehicles
  for select to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.is_ops_role(array['warehouse_manager'::public.app_role])
      and (warehouse_id is null or public.user_can_access_warehouse(warehouse_id))
    )
    or exists (
      select 1 from public.distribution_vehicle_assignments dva
      join public.drivers d on d.id = dva.driver_id
      where dva.vehicle_id = vehicles.id
        and dva.assignment_status = 'aktif'
        and d.profile_id = (select auth.uid())
    )
    or exists (
      select 1 from public.distribution_vehicle_assignments dva
      join public.distributions dist on dist.id = dva.distribution_id
      where dva.vehicle_id = vehicles.id
        and dist.destination_shelter_id is not null
        and public.user_can_access_shelter(dist.destination_shelter_id)
    )
  );

drop policy if exists "vehicles_write" on public.vehicles;
drop policy if exists "vehicles_insert" on public.vehicles;
create policy "vehicles_insert" on public.vehicles
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.is_ops_role(array['warehouse_manager'::public.app_role])
      and (warehouse_id is null or public.user_can_access_warehouse(warehouse_id))
    )
  );

drop policy if exists "vehicles_update" on public.vehicles;
create policy "vehicles_update" on public.vehicles
  for update to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.is_ops_role(array['warehouse_manager'::public.app_role])
      and (warehouse_id is null or public.user_can_access_warehouse(warehouse_id))
    )
  )
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.is_ops_role(array['warehouse_manager'::public.app_role])
      and (warehouse_id is null or public.user_can_access_warehouse(warehouse_id))
    )
  );

-- Drivers Policies
-- Shelter managers cannot read drivers table directly (preventing exposure of phone number & license)
drop policy if exists "drivers_select" on public.drivers;
create policy "drivers_select" on public.drivers
  for select to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.is_ops_role(array['warehouse_manager'::public.app_role])
      and (
        institution_id is null
        or public.user_has_institution(institution_id)
      )
    )
    or profile_id = (select auth.uid())
  );

drop policy if exists "drivers_write" on public.drivers;
drop policy if exists "drivers_insert" on public.drivers;
create policy "drivers_insert" on public.drivers
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.is_ops_role(array['warehouse_manager'::public.app_role])
      and (institution_id is null or public.user_has_institution(institution_id))
    )
  );

drop policy if exists "drivers_update" on public.drivers;
create policy "drivers_update" on public.drivers
  for update to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.is_ops_role(array['warehouse_manager'::public.app_role])
      and (institution_id is null or public.user_has_institution(institution_id))
    )
    or profile_id = (select auth.uid())
  )
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.is_ops_role(array['warehouse_manager'::public.app_role])
      and (institution_id is null or public.user_has_institution(institution_id))
    )
    or profile_id = (select auth.uid())
  );

-- Distribution Vehicle Assignments Policies
drop policy if exists "assignments_select" on public.distribution_vehicle_assignments;
create policy "assignments_select" on public.distribution_vehicle_assignments
  for select to authenticated
  using (
    public.user_can_access_distribution(distribution_id)
  );

drop policy if exists "assignments_write" on public.distribution_vehicle_assignments;
drop policy if exists "assignments_insert" on public.distribution_vehicle_assignments;
create policy "assignments_insert" on public.distribution_vehicle_assignments
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.is_ops_role(array['warehouse_manager'::public.app_role])
      and exists (
        select 1 from public.distributions d
        where d.id = distribution_id
          and d.origin_warehouse_id is not null
          and public.user_can_access_warehouse(d.origin_warehouse_id)
      )
      and exists (
        select 1 from public.vehicles v
        where v.id = vehicle_id
          and (v.warehouse_id is null or public.user_can_access_warehouse(v.warehouse_id))
      )
    )
  );

drop policy if exists "assignments_update" on public.distribution_vehicle_assignments;
create policy "assignments_update" on public.distribution_vehicle_assignments
  for update to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.is_ops_role(array['warehouse_manager'::public.app_role])
      and exists (
        select 1 from public.distributions d
        where d.id = distribution_id
          and d.origin_warehouse_id is not null
          and public.user_can_access_warehouse(d.origin_warehouse_id)
      )
    )
  )
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.is_ops_role(array['warehouse_manager'::public.app_role])
      and exists (
        select 1 from public.distributions d
        where d.id = distribution_id
          and d.origin_warehouse_id is not null
          and public.user_can_access_warehouse(d.origin_warehouse_id)
      )
    )
  );

-- Delivery Tracking Updates Policies
drop policy if exists "tracking_updates_select" on public.delivery_tracking_updates;
create policy "tracking_updates_select" on public.delivery_tracking_updates
  for select to authenticated
  using (
    public.user_can_access_distribution(distribution_id)
  );

drop policy if exists "tracking_updates_insert" on public.delivery_tracking_updates;
create policy "tracking_updates_insert" on public.delivery_tracking_updates
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.is_ops_role(array['warehouse_manager'::public.app_role])
      and exists (
        select 1 from public.distributions d
        where d.id = distribution_id
          and d.origin_warehouse_id is not null
          and public.user_can_access_warehouse(d.origin_warehouse_id)
      )
    )
    or exists (
      select 1 from public.drivers d
      join public.distribution_vehicle_assignments dva on dva.driver_id = d.id
      where dva.distribution_id = delivery_tracking_updates.distribution_id
        and dva.assignment_status = 'aktif'
        and d.profile_id = (select auth.uid())
    )
  );

-- Proof of Delivery Policies
drop policy if exists "pod_select" on public.proof_of_delivery;
create policy "pod_select" on public.proof_of_delivery
  for select to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or public.user_can_access_shelter(shelter_id)
    or exists (
      select 1 from public.distributions d
      where d.id = proof_of_delivery.distribution_id
        and d.origin_warehouse_id is not null
        and public.user_can_access_warehouse(d.origin_warehouse_id)
    )
    or exists (
      select 1 from public.drivers dr
      join public.distribution_vehicle_assignments dva on dva.driver_id = dr.id
      where dva.distribution_id = proof_of_delivery.distribution_id
        and dr.profile_id = (select auth.uid())
    )
  );

drop policy if exists "pod_insert" on public.proof_of_delivery;
create policy "pod_insert" on public.proof_of_delivery
  for insert to authenticated
  with check (
    (
      public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
      or public.user_can_access_shelter(shelter_id)
    )
    and exists (
      select 1 from public.distributions d
      where d.id = distribution_id
        and d.destination_shelter_id = shelter_id
    )
  );

-- Distribution Status History Policies
drop policy if exists "status_history_select" on public.distribution_status_history;
create policy "status_history_select" on public.distribution_status_history
  for select to authenticated
  using (
    public.user_can_access_distribution(distribution_id)
  );

drop policy if exists "status_history_insert" on public.distribution_status_history;
create policy "status_history_insert" on public.distribution_status_history
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.is_ops_role(array['warehouse_manager'::public.app_role])
      and exists (
        select 1 from public.distributions d
        where d.id = distribution_id
          and d.origin_warehouse_id is not null
          and public.user_can_access_warehouse(d.origin_warehouse_id)
      )
    )
    or exists (
      select 1 from public.distributions d
      where d.id = distribution_id
        and d.destination_shelter_id is not null
        and public.user_can_access_shelter(d.destination_shelter_id)
    )
    or exists (
      select 1 from public.drivers d
      join public.distribution_vehicle_assignments dva on dva.driver_id = d.id
      where dva.distribution_id = distribution_status_history.distribution_id
        and dva.assignment_status = 'aktif'
        and d.profile_id = (select auth.uid())
    )
  );
