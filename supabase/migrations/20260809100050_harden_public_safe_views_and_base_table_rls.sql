-- Harden public map access: public users read safe views only, not base tables.
-- The views intentionally expose a small public-safe column set.

revoke all on public.public_event_summary from anon, authenticated;
revoke all on public.public_shelter_summary from anon, authenticated;
revoke all on public.disaster_events from anon;
revoke all on public.shelters from anon;

drop policy if exists "events_public_safe_select" on public.disaster_events;
drop policy if exists "shelters_public_safe_select" on public.shelters;
drop policy if exists "events_select_internal" on public.disaster_events;
drop policy if exists "shelters_select_internal" on public.shelters;

create policy "events_select_internal" on public.disaster_events
for select to authenticated
using (true);

create policy "shelters_select_internal" on public.shelters
for select to authenticated
using (
  public.is_ops_role(array[
    'admin'::public.app_role,
    'bpbd_operator'::public.app_role,
    'field_officer'::public.app_role,
    'warehouse_manager'::public.app_role
  ])
  or (
    public.current_app_role() = 'shelter_manager'::public.app_role
    and institution_id is not null
    and public.user_has_institution(institution_id)
  )
);

alter view public.public_event_summary set (security_invoker = false);
alter view public.public_shelter_summary set (security_invoker = false);

grant select on public.public_event_summary, public.public_shelter_summary to anon, authenticated;
comment on view public.public_event_summary is 'Public-safe active event summary. Exposes no victim identity, internal route, audit, or detailed logistics data.';
comment on view public.public_shelter_summary is 'Public-safe shelter summary. Exposes no victim identity, vulnerable-group details, stock detail, internal route, or audit data.';
