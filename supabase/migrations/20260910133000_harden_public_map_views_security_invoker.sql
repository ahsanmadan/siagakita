-- Migration: Harden Public Map Views with Security Invoker and Column-Level Exposure Control
-- Created: 2026-09-10 13:30:00

-- 1. Recreate Public Views explicitly with security_invoker = true
drop view if exists public.public_event_summary cascade;
drop view if exists public.public_shelter_summary cascade;
drop view if exists public.public_delivery_tracking_summary cascade;

-- View 1: public_event_summary (sanitized active disaster events)
create view public.public_event_summary
with (security_invoker = true) as
select
  id,
  code,
  name,
  disaster_type,
  location,
  province,
  status,
  state,
  latitude,
  longitude,
  location_point,
  summary,
  updated_at
from public.disaster_events
where state = 'active'::public.event_state;

comment on view public.public_event_summary is 'Sanitized active disaster events view for public map display with security_invoker enabled.';

-- View 2: public_shelter_summary (sanitized shelter capacity and status)
create view public.public_shelter_summary
with (security_invoker = true) as
select
  id,
  code,
  event_id,
  name,
  location,
  status,
  latitude,
  longitude,
  location_point,
  capacity,
  population_total,
  last_update
from public.shelters;

comment on view public.public_shelter_summary is 'Sanitized shelter summary view for public map display with security_invoker enabled.';

-- View 3: public_delivery_tracking_summary (sanitized logistics tracking, represents last known location label, no driver phone or internal notes)
create view public.public_delivery_tracking_summary
with (security_invoker = true) as
select
  d.id,
  d.code,
  s.name as destination_shelter_name,
  d.destination_shelter_id,
  d.cargo_summary,
  d.eta,
  d.progress,
  d.status,
  d.last_location_name,
  d.last_latitude,
  d.last_longitude,
  d.last_location_point,
  d.last_tracking_updated_at,
  d.updated_at
from public.distributions d
left join public.shelters s on s.id = d.destination_shelter_id;

comment on view public.public_delivery_tracking_summary is 'Sanitized logistics delivery tracking view for public map display with security_invoker enabled.';

-- 2. Clean view permissions: only SELECT allowed for anon and authenticated
revoke all on public.public_event_summary from anon, authenticated;
grant select on public.public_event_summary to anon, authenticated;

revoke all on public.public_shelter_summary from anon, authenticated;
grant select on public.public_shelter_summary to anon, authenticated;

revoke all on public.public_delivery_tracking_summary from anon, authenticated;
grant select on public.public_delivery_tracking_summary to anon, authenticated;

-- 3. Restrict anon privileges on underlying base tables to public-safe columns only
-- Prevents anon from directly reading sensitive internal columns (e.g. SELECT * FROM table)
revoke all on public.disaster_events from anon;
grant select (
  id,
  code,
  name,
  disaster_type,
  location,
  province,
  status,
  state,
  latitude,
  longitude,
  location_point,
  summary,
  updated_at
) on public.disaster_events to anon;

revoke all on public.shelters from anon;
grant select (
  id,
  code,
  event_id,
  name,
  location,
  status,
  latitude,
  longitude,
  location_point,
  capacity,
  population_total,
  last_update
) on public.shelters to anon;

revoke all on public.distributions from anon;
grant select (
  id,
  code,
  destination_shelter_id,
  cargo_summary,
  eta,
  progress,
  status,
  last_location_name,
  last_latitude,
  last_longitude,
  last_location_point,
  last_tracking_updated_at,
  updated_at
) on public.distributions to anon;

-- 4. RLS Policies for Public Safe Delivery Tracking
drop policy if exists "distributions_public_safe_select_anon" on public.distributions;
create policy "distributions_public_safe_select_anon" on public.distributions
  for select to anon
  using (
    exists (
      select 1 from public.shelters s
      join public.disaster_events e on e.id = s.event_id
      where s.id = distributions.destination_shelter_id
        and e.state = 'active'::public.event_state
    )
  );

drop policy if exists "distributions_public_safe_select_auth" on public.distributions;
create policy "distributions_public_safe_select_auth" on public.distributions
  for select to authenticated
  using (
    exists (
      select 1 from public.shelters s
      join public.disaster_events e on e.id = s.event_id
      where s.id = distributions.destination_shelter_id
        and e.state = 'active'::public.event_state
    )
  );
