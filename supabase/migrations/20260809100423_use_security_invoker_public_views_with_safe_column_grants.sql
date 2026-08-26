-- Follow Supabase security advisor: public views should use invoker security.
-- Anonymous access is limited to the same safe columns used by the public map views.

alter view public.public_event_summary set (security_invoker = true);
alter view public.public_shelter_summary set (security_invoker = true);

drop policy if exists "events_public_safe_select" on public.disaster_events;
drop policy if exists "shelters_public_safe_select" on public.shelters;

create policy "events_public_safe_select" on public.disaster_events
for select to anon
using (state = 'active'::public.event_state);

create policy "shelters_public_safe_select" on public.shelters
for select to anon
using (
  exists (
    select 1
    from public.disaster_events e
    where e.id = shelters.event_id
      and e.state = 'active'::public.event_state
  )
);

revoke all on public.disaster_events from anon;
revoke all on public.shelters from anon;

grant select (id, code, name, disaster_type, location, province, status, state, latitude, longitude, summary, updated_at)
on public.disaster_events to anon;

grant select (id, code, event_id, name, location, status, latitude, longitude, last_update)
on public.shelters to anon;

grant select on public.public_event_summary, public.public_shelter_summary to anon, authenticated;
