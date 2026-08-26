create or replace function public.current_app_role()
returns public.app_role
language sql
stable
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
as $$
  select public.current_app_role() = any(roles)
$$;

create or replace function public.user_has_institution(target_institution_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_institutions ui
    where ui.user_id = (select auth.uid())
      and ui.institution_id = target_institution_id
  )
$$;

create or replace function public.user_can_access_shelter(target_shelter_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.shelters s
    where s.id = target_shelter_id
      and (
        s.institution_id is null
        or public.user_has_institution(s.institution_id)
        or public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
      )
  )
$$;

create or replace function public.user_can_access_warehouse(target_warehouse_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.warehouses w
    where w.id = target_warehouse_id
      and (
        w.institution_id is null
        or public.user_has_institution(w.institution_id)
        or public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
      )
  )
$$;

revoke execute on function public.current_app_role() from public;
revoke execute on function public.is_ops_role(public.app_role[]) from public;
revoke execute on function public.user_has_institution(uuid) from public;
revoke execute on function public.user_can_access_shelter(uuid) from public;
revoke execute on function public.user_can_access_warehouse(uuid) from public;

grant execute on function public.current_app_role() to anon, authenticated;
grant execute on function public.is_ops_role(public.app_role[]) to authenticated;
grant execute on function public.user_has_institution(uuid) to authenticated;
grant execute on function public.user_can_access_shelter(uuid) to authenticated;
grant execute on function public.user_can_access_warehouse(uuid) to authenticated;

drop policy if exists "profiles_select_internal" on public.profiles;
drop policy if exists "profiles_admin_write" on public.profiles;
drop policy if exists "institutions_select_internal" on public.institutions;
drop policy if exists "institutions_admin_write" on public.institutions;
drop policy if exists "user_institutions_select" on public.user_institutions;
drop policy if exists "user_institutions_admin_write" on public.user_institutions;
drop policy if exists "events_public_safe_select" on public.disaster_events;
drop policy if exists "events_operator_write" on public.disaster_events;
drop policy if exists "history_select_internal" on public.event_status_history;
drop policy if exists "history_operator_insert" on public.event_status_history;
drop policy if exists "shelters_public_safe_select" on public.shelters;
drop policy if exists "shelters_operator_write" on public.shelters;
drop policy if exists "population_updates_select_internal" on public.shelter_population_updates;
drop policy if exists "population_updates_insert" on public.shelter_population_updates;
drop policy if exists "needs_select_internal" on public.needs;
drop policy if exists "needs_write_posko" on public.needs;
drop policy if exists "warehouses_select_internal" on public.warehouses;
drop policy if exists "warehouses_operator_write" on public.warehouses;
drop policy if exists "inventory_select_internal" on public.inventory_items;
drop policy if exists "inventory_warehouse_write" on public.inventory_items;
drop policy if exists "stock_movements_select_internal" on public.stock_movements;
drop policy if exists "stock_movements_insert" on public.stock_movements;
drop policy if exists "distributions_select_internal" on public.distributions;
drop policy if exists "distributions_write" on public.distributions;
drop policy if exists "distribution_items_select_internal" on public.distribution_items;
drop policy if exists "distribution_items_write" on public.distribution_items;
drop policy if exists "reports_select_internal" on public.field_reports;
drop policy if exists "reports_public_insert" on public.field_reports;
drop policy if exists "reports_operator_update" on public.field_reports;
drop policy if exists "report_verifications_select_internal" on public.report_verifications;
drop policy if exists "report_verifications_insert" on public.report_verifications;
drop policy if exists "third_party_aids_select_internal" on public.third_party_aids;
drop policy if exists "third_party_aids_write" on public.third_party_aids;
drop policy if exists "recommendations_select_internal" on public.ai_recommendations;
drop policy if exists "recommendations_operator_update" on public.ai_recommendations;
drop policy if exists "audit_select_operator" on public.audit_logs;
drop policy if exists "audit_insert_internal" on public.audit_logs;

create policy "profiles_select_scoped" on public.profiles for select to authenticated
using (
  (select auth.uid()) = id
  or public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
);
create policy "profiles_admin_write" on public.profiles for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "institutions_select_internal" on public.institutions for select to authenticated
using (true);
create policy "institutions_operator_write" on public.institutions for all to authenticated
using (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role]))
with check (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role]));

create policy "user_institutions_select_scoped" on public.user_institutions for select to authenticated
using (
  (select auth.uid()) = user_id
  or public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
);
create policy "user_institutions_admin_write" on public.user_institutions for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "events_public_safe_select" on public.disaster_events for select to anon, authenticated
using (state = 'active');
create policy "events_operator_write" on public.disaster_events for all to authenticated
using (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role]))
with check (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role]));

create policy "history_select_internal" on public.event_status_history for select to authenticated
using (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role]));
create policy "history_operator_insert" on public.event_status_history for insert to authenticated
with check (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role]));

create policy "shelters_public_safe_select" on public.shelters for select to anon, authenticated
using (true);
create policy "shelters_write_scoped" on public.shelters for all to authenticated
using (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
  or (
    public.current_app_role() = 'shelter_manager'
    and institution_id is not null
    and public.user_has_institution(institution_id)
  )
)
with check (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
  or (
    public.current_app_role() = 'shelter_manager'
    and institution_id is not null
    and public.user_has_institution(institution_id)
  )
);

create policy "population_updates_select_scoped" on public.shelter_population_updates for select to authenticated
using (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
  or public.user_can_access_shelter(shelter_id)
);
create policy "population_updates_insert_scoped" on public.shelter_population_updates for insert to authenticated
with check (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
  or public.user_can_access_shelter(shelter_id)
);

create policy "needs_select_scoped" on public.needs for select to authenticated
using (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role, 'warehouse_manager'::public.app_role])
  or public.user_can_access_shelter(shelter_id)
);
create policy "needs_write_scoped" on public.needs for all to authenticated
using (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
  or public.user_can_access_shelter(shelter_id)
)
with check (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
  or public.user_can_access_shelter(shelter_id)
);

create policy "warehouses_select_internal" on public.warehouses for select to authenticated
using (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or (
    public.current_app_role() = 'warehouse_manager'
    and (institution_id is null or public.user_has_institution(institution_id))
  )
);
create policy "warehouses_write_scoped" on public.warehouses for all to authenticated
using (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or (
    public.current_app_role() = 'warehouse_manager'
    and institution_id is not null
    and public.user_has_institution(institution_id)
  )
)
with check (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or (
    public.current_app_role() = 'warehouse_manager'
    and institution_id is not null
    and public.user_has_institution(institution_id)
  )
);

create policy "inventory_select_scoped" on public.inventory_items for select to authenticated
using (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or public.user_can_access_warehouse(warehouse_id)
);
create policy "inventory_write_scoped" on public.inventory_items for all to authenticated
using (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or (
    public.current_app_role() = 'warehouse_manager'
    and public.user_can_access_warehouse(warehouse_id)
  )
)
with check (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or (
    public.current_app_role() = 'warehouse_manager'
    and public.user_can_access_warehouse(warehouse_id)
  )
);

create policy "stock_movements_select_scoped" on public.stock_movements for select to authenticated
using (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or exists (
    select 1 from public.inventory_items ii
    where ii.id = inventory_item_id
      and public.user_can_access_warehouse(ii.warehouse_id)
  )
);
create policy "stock_movements_insert_scoped" on public.stock_movements for insert to authenticated
with check (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or exists (
    select 1 from public.inventory_items ii
    where ii.id = inventory_item_id
      and public.current_app_role() = 'warehouse_manager'
      and public.user_can_access_warehouse(ii.warehouse_id)
  )
);

create policy "distributions_select_scoped" on public.distributions for select to authenticated
using (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or public.user_can_access_warehouse(origin_warehouse_id)
  or public.user_can_access_shelter(destination_shelter_id)
);
create policy "distributions_write_scoped" on public.distributions for all to authenticated
using (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or (
    public.current_app_role() = 'warehouse_manager'
    and public.user_can_access_warehouse(origin_warehouse_id)
  )
)
with check (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or (
    public.current_app_role() = 'warehouse_manager'
    and public.user_can_access_warehouse(origin_warehouse_id)
  )
);

create policy "distribution_items_select_scoped" on public.distribution_items for select to authenticated
using (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or exists (
    select 1 from public.distributions d
    where d.id = distribution_id
      and (
        public.user_can_access_warehouse(d.origin_warehouse_id)
        or public.user_can_access_shelter(d.destination_shelter_id)
      )
  )
);
create policy "distribution_items_write_scoped" on public.distribution_items for all to authenticated
using (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or exists (
    select 1 from public.distributions d
    where d.id = distribution_id
      and public.current_app_role() = 'warehouse_manager'
      and public.user_can_access_warehouse(d.origin_warehouse_id)
  )
)
with check (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or exists (
    select 1 from public.distributions d
    where d.id = distribution_id
      and public.current_app_role() = 'warehouse_manager'
      and public.user_can_access_warehouse(d.origin_warehouse_id)
  )
);

create policy "reports_select_internal" on public.field_reports for select to authenticated
using (public.current_app_role() <> 'public_viewer');
create policy "reports_public_insert" on public.field_reports for insert to anon, authenticated
with check (true);
create policy "reports_operator_update" on public.field_reports for update to authenticated
using (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role]))
with check (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role]));

create policy "report_verifications_select_internal" on public.report_verifications for select to authenticated
using (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role]));
create policy "report_verifications_insert" on public.report_verifications for insert to authenticated
with check (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role]));

create policy "third_party_aids_select_scoped" on public.third_party_aids for select to authenticated
using (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or (warehouse_id is not null and public.user_can_access_warehouse(warehouse_id))
);
create policy "third_party_aids_write_scoped" on public.third_party_aids for all to authenticated
using (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or (
    public.current_app_role() = 'warehouse_manager'
    and warehouse_id is not null
    and public.user_can_access_warehouse(warehouse_id)
  )
)
with check (
  public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role])
  or (
    public.current_app_role() = 'warehouse_manager'
    and warehouse_id is not null
    and public.user_can_access_warehouse(warehouse_id)
  )
);

create policy "recommendations_select_internal" on public.ai_recommendations for select to authenticated
using (public.current_app_role() <> 'public_viewer');
create policy "recommendations_operator_update" on public.ai_recommendations for update to authenticated
using (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role]))
with check (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role]));

create policy "audit_select_operator" on public.audit_logs for select to authenticated
using (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role]));
create policy "audit_insert_internal" on public.audit_logs for insert to authenticated
with check ((select auth.uid()) = actor_id);
