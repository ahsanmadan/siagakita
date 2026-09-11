-- Migration: Performance Cleanup, Foreign Key Indexing, and RLS Policy Consolidation
-- Created: 2026-09-11 00:15:00

-- ====================================================================
-- 1. ADD COVERING INDEXES FOR UNINDEXED FOREIGN KEYS
-- ====================================================================

-- aid_requests foreign keys
create index if not exists aid_requests_event_id_idx
  on public.aid_requests(event_id);

create index if not exists aid_requests_requested_by_idx
  on public.aid_requests(requested_by);

create index if not exists aid_requests_reviewed_by_idx
  on public.aid_requests(reviewed_by);

-- aid_allocations foreign keys
create index if not exists aid_allocations_allocated_by_idx
  on public.aid_allocations(allocated_by);

create index if not exists aid_allocations_inventory_item_id_idx
  on public.aid_allocations(inventory_item_id);

-- distribution_vehicle_assignments foreign keys
create index if not exists distribution_vehicle_assignments_assigned_by_idx
  on public.distribution_vehicle_assignments(assigned_by);

-- delivery_tracking_updates foreign keys
create index if not exists delivery_tracking_updates_created_by_idx
  on public.delivery_tracking_updates(created_by);

create index if not exists delivery_tracking_updates_driver_id_idx
  on public.delivery_tracking_updates(driver_id);

create index if not exists delivery_tracking_updates_vehicle_id_idx
  on public.delivery_tracking_updates(vehicle_id);

-- proof_of_delivery foreign keys
create index if not exists proof_of_delivery_created_by_idx
  on public.proof_of_delivery(created_by);

create index if not exists proof_of_delivery_received_by_profile_id_idx
  on public.proof_of_delivery(received_by_profile_id);

-- distribution_status_history foreign keys
create index if not exists distribution_status_history_changed_by_idx
  on public.distribution_status_history(changed_by);


-- ====================================================================
-- 2. CONSOLIDATE MULTIPLE PERMISSIVE POLICIES ON DISTRIBUTIONS
-- ====================================================================
-- Distributions previously had two permissive SELECT policies for authenticated users:
-- 1) distributions_public_safe_select_auth (active disaster events check)
-- 2) distributions_select_scoped (operational check)
-- We consolidate authenticated SELECT into a single policy combining both permissions with OR.
-- Anon policy distributions_public_safe_select_anon is left untouched for public map view.

drop policy if exists "distributions_public_safe_select_auth" on public.distributions;
drop policy if exists "distributions_select_scoped" on public.distributions;

create policy "distributions_select" on public.distributions
  for select to authenticated
  using (
    -- Operational access (operators, warehouse manager, shelter manager)
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (origin_warehouse_id is not null and public.user_can_access_warehouse(origin_warehouse_id))
    or (destination_shelter_id is not null and public.user_can_access_shelter(destination_shelter_id))
    -- Or public active event distribution access
    or exists (
      select 1 from public.shelters s
      join public.disaster_events e on e.id = s.event_id
      where s.id = distributions.destination_shelter_id
        and e.state = 'active'::public.event_state
    )
  );


-- ====================================================================
-- 3. SPLIT CMD ALL POLICIES INTO DEDICATED WRITE POLICIES
-- ====================================================================
-- Splitting ALL policies eliminates implicit permissive SELECT behavior,
-- ensuring each table has a single explicit SELECT policy for authenticated users,
-- with clean INSERT, UPDATE, and DELETE policies.

-- --------------------------------------------------------------------
-- A. disaster_events
-- --------------------------------------------------------------------
drop policy if exists "events_operator_write" on public.disaster_events;

create policy "events_operator_insert" on public.disaster_events
  for insert to authenticated
  with check (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role]));

create policy "events_operator_update" on public.disaster_events
  for update to authenticated
  using (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role]))
  with check (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role]));

create policy "events_operator_delete" on public.disaster_events
  for delete to authenticated
  using (public.current_app_role() = 'admin'::public.app_role);

-- --------------------------------------------------------------------
-- B. shelters
-- --------------------------------------------------------------------
drop policy if exists "shelters_write_scoped" on public.shelters;

create policy "shelters_write_insert" on public.shelters
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
    or (
      public.current_app_role() = 'shelter_manager'::public.app_role
      and institution_id is not null
      and public.user_has_institution(institution_id)
    )
  );

create policy "shelters_write_update" on public.shelters
  for update to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
    or (
      public.current_app_role() = 'shelter_manager'::public.app_role
      and institution_id is not null
      and public.user_has_institution(institution_id)
    )
  )
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
    or (
      public.current_app_role() = 'shelter_manager'::public.app_role
      and institution_id is not null
      and public.user_has_institution(institution_id)
    )
  );

create policy "shelters_write_delete" on public.shelters
  for delete to authenticated
  using (public.current_app_role() = 'admin'::public.app_role);

-- --------------------------------------------------------------------
-- C. distributions
-- --------------------------------------------------------------------
drop policy if exists "distributions_write_scoped" on public.distributions;

create policy "distributions_write_insert" on public.distributions
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.current_app_role() = 'warehouse_manager'::public.app_role
      and origin_warehouse_id is not null
      and public.user_can_access_warehouse(origin_warehouse_id)
    )
  );

create policy "distributions_write_update" on public.distributions
  for update to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.current_app_role() = 'warehouse_manager'::public.app_role
      and origin_warehouse_id is not null
      and public.user_can_access_warehouse(origin_warehouse_id)
    )
  )
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.current_app_role() = 'warehouse_manager'::public.app_role
      and origin_warehouse_id is not null
      and public.user_can_access_warehouse(origin_warehouse_id)
    )
  );

create policy "distributions_write_delete" on public.distributions
  for delete to authenticated
  using (public.current_app_role() = 'admin'::public.app_role);

-- --------------------------------------------------------------------
-- D. distribution_items
-- --------------------------------------------------------------------
drop policy if exists "distribution_items_write_scoped" on public.distribution_items;

create policy "distribution_items_write_insert" on public.distribution_items
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or exists (
      select 1 from public.distributions d
      where d.id = distribution_items.distribution_id
        and public.current_app_role() = 'warehouse_manager'::public.app_role
        and d.origin_warehouse_id is not null
        and public.user_can_access_warehouse(d.origin_warehouse_id)
    )
  );

create policy "distribution_items_write_update" on public.distribution_items
  for update to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or exists (
      select 1 from public.distributions d
      where d.id = distribution_items.distribution_id
        and public.current_app_role() = 'warehouse_manager'::public.app_role
        and d.origin_warehouse_id is not null
        and public.user_can_access_warehouse(d.origin_warehouse_id)
    )
  )
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or exists (
      select 1 from public.distributions d
      where d.id = distribution_items.distribution_id
        and public.current_app_role() = 'warehouse_manager'::public.app_role
        and d.origin_warehouse_id is not null
        and public.user_can_access_warehouse(d.origin_warehouse_id)
    )
  );

create policy "distribution_items_write_delete" on public.distribution_items
  for delete to authenticated
  using (public.current_app_role() = 'admin'::public.app_role);

-- --------------------------------------------------------------------
-- E. institutions
-- --------------------------------------------------------------------
drop policy if exists "institutions_operator_write" on public.institutions;

create policy "institutions_write_insert" on public.institutions
  for insert to authenticated
  with check (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role]));

create policy "institutions_write_update" on public.institutions
  for update to authenticated
  using (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role]))
  with check (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role]));

create policy "institutions_write_delete" on public.institutions
  for delete to authenticated
  using (public.current_app_role() = 'admin'::public.app_role);

-- --------------------------------------------------------------------
-- F. inventory_items
-- --------------------------------------------------------------------
drop policy if exists "inventory_write_scoped" on public.inventory_items;

create policy "inventory_write_insert" on public.inventory_items
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.current_app_role() = 'warehouse_manager'::public.app_role
      and warehouse_id is not null
      and public.user_can_access_warehouse(warehouse_id)
    )
  );

create policy "inventory_write_update" on public.inventory_items
  for update to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.current_app_role() = 'warehouse_manager'::public.app_role
      and warehouse_id is not null
      and public.user_can_access_warehouse(warehouse_id)
    )
  )
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.current_app_role() = 'warehouse_manager'::public.app_role
      and warehouse_id is not null
      and public.user_can_access_warehouse(warehouse_id)
    )
  );

create policy "inventory_write_delete" on public.inventory_items
  for delete to authenticated
  using (public.current_app_role() = 'admin'::public.app_role);

-- --------------------------------------------------------------------
-- G. needs
-- --------------------------------------------------------------------
drop policy if exists "needs_write_scoped" on public.needs;

create policy "needs_write_insert" on public.needs
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
    or (shelter_id is not null and public.user_can_access_shelter(shelter_id))
  );

create policy "needs_write_update" on public.needs
  for update to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
    or (shelter_id is not null and public.user_can_access_shelter(shelter_id))
  )
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
    or (shelter_id is not null and public.user_can_access_shelter(shelter_id))
  );

create policy "needs_write_delete" on public.needs
  for delete to authenticated
  using (public.current_app_role() = 'admin'::public.app_role);

-- --------------------------------------------------------------------
-- H. profiles
-- --------------------------------------------------------------------
drop policy if exists "profiles_admin_write" on public.profiles;

create policy "profiles_write_insert" on public.profiles
  for insert to authenticated
  with check (public.current_app_role() = 'admin'::public.app_role);

create policy "profiles_write_update" on public.profiles
  for update to authenticated
  using (public.current_app_role() = 'admin'::public.app_role)
  with check (public.current_app_role() = 'admin'::public.app_role);

create policy "profiles_write_delete" on public.profiles
  for delete to authenticated
  using (public.current_app_role() = 'admin'::public.app_role);

-- --------------------------------------------------------------------
-- I. third_party_aids
-- --------------------------------------------------------------------
drop policy if exists "third_party_aids_write_scoped" on public.third_party_aids;

create policy "third_party_aids_write_insert" on public.third_party_aids
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.current_app_role() = 'warehouse_manager'::public.app_role
      and warehouse_id is not null
      and public.user_can_access_warehouse(warehouse_id)
    )
  );

create policy "third_party_aids_write_update" on public.third_party_aids
  for update to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.current_app_role() = 'warehouse_manager'::public.app_role
      and warehouse_id is not null
      and public.user_can_access_warehouse(warehouse_id)
    )
  )
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.current_app_role() = 'warehouse_manager'::public.app_role
      and warehouse_id is not null
      and public.user_can_access_warehouse(warehouse_id)
    )
  );

create policy "third_party_aids_write_delete" on public.third_party_aids
  for delete to authenticated
  using (public.current_app_role() = 'admin'::public.app_role);

-- --------------------------------------------------------------------
-- J. user_institutions
-- --------------------------------------------------------------------
drop policy if exists "user_institutions_admin_write" on public.user_institutions;

create policy "user_institutions_write_insert" on public.user_institutions
  for insert to authenticated
  with check (public.current_app_role() = 'admin'::public.app_role);

create policy "user_institutions_write_update" on public.user_institutions
  for update to authenticated
  using (public.current_app_role() = 'admin'::public.app_role)
  with check (public.current_app_role() = 'admin'::public.app_role);

create policy "user_institutions_write_delete" on public.user_institutions
  for delete to authenticated
  using (public.current_app_role() = 'admin'::public.app_role);

-- --------------------------------------------------------------------
-- K. warehouses
-- --------------------------------------------------------------------
drop policy if exists "warehouses_write_scoped" on public.warehouses;

create policy "warehouses_write_insert" on public.warehouses
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.current_app_role() = 'warehouse_manager'::public.app_role
      and institution_id is not null
      and public.user_has_institution(institution_id)
    )
  );

create policy "warehouses_write_update" on public.warehouses
  for update to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.current_app_role() = 'warehouse_manager'::public.app_role
      and institution_id is not null
      and public.user_has_institution(institution_id)
    )
  )
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
    or (
      public.current_app_role() = 'warehouse_manager'::public.app_role
      and institution_id is not null
      and public.user_has_institution(institution_id)
    )
  );

create policy "warehouses_write_delete" on public.warehouses
  for delete to authenticated
  using (public.current_app_role() = 'admin'::public.app_role);

-- --------------------------------------------------------------------
-- L. aid_request_items
-- --------------------------------------------------------------------
drop policy if exists "aid_request_items_all" on public.aid_request_items;

create policy "aid_request_items_select" on public.aid_request_items
  for select to authenticated
  using (
    exists (
      select 1 from public.aid_requests r
      where r.id = aid_request_items.request_id
        and (
          public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'warehouse_manager'::public.app_role])
          or (r.shelter_id is not null and public.user_can_access_shelter(r.shelter_id))
        )
    )
  );

create policy "aid_request_items_insert" on public.aid_request_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.aid_requests r
      where r.id = aid_request_items.request_id
        and (
          public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
          or (r.shelter_id is not null and public.user_can_access_shelter(r.shelter_id))
        )
    )
  );

create policy "aid_request_items_update" on public.aid_request_items
  for update to authenticated
  using (
    exists (
      select 1 from public.aid_requests r
      where r.id = aid_request_items.request_id
        and (
          public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'warehouse_manager'::public.app_role])
          or (r.shelter_id is not null and public.user_can_access_shelter(r.shelter_id))
        )
    )
  )
  with check (
    exists (
      select 1 from public.aid_requests r
      where r.id = aid_request_items.request_id
        and (
          public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'warehouse_manager'::public.app_role])
          or (r.shelter_id is not null and public.user_can_access_shelter(r.shelter_id))
        )
    )
  );

create policy "aid_request_items_delete" on public.aid_request_items
  for delete to authenticated
  using (public.current_app_role() = 'admin'::public.app_role);
