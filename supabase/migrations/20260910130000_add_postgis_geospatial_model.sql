-- 20260910130000_add_postgis_geospatial_model.sql
-- Enables PostGIS, introduces geography(Point, 4326) columns, coordinate constraints,
-- spatial GIST indexes, automated synchronization triggers, and public-safe map views.

-- 1. Enable PostGIS extension safely in extensions schema
create extension if not exists postgis with schema extensions;

-- 2. Add coordinate columns to warehouses if missing
alter table public.warehouses
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

-- Seed coordinates for existing warehouses if empty
update public.warehouses
set latitude = -0.9471, longitude = 100.4172
where latitude is null and longitude is null and name ilike '%Sumbar%';

update public.warehouses
set latitude = -0.2789, longitude = 100.0351
where latitude is null and longitude is null and name ilike '%Agam%';

-- 3. Add coordinate constraints (-90 <= latitude <= 90 and -180 <= longitude <= 180)
do $$
begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'disaster_events_lat_check' and table_name = 'disaster_events') then
    alter table public.disaster_events add constraint disaster_events_lat_check check (latitude is null or (latitude >= -90 and latitude <= 90));
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'disaster_events_lng_check' and table_name = 'disaster_events') then
    alter table public.disaster_events add constraint disaster_events_lng_check check (longitude is null or (longitude >= -180 and longitude <= 180));
  end if;

  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'shelters_lat_check' and table_name = 'shelters') then
    alter table public.shelters add constraint shelters_lat_check check (latitude is null or (latitude >= -90 and latitude <= 90));
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'shelters_lng_check' and table_name = 'shelters') then
    alter table public.shelters add constraint shelters_lng_check check (longitude is null or (longitude >= -180 and longitude <= 180));
  end if;

  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'warehouses_lat_check' and table_name = 'warehouses') then
    alter table public.warehouses add constraint warehouses_lat_check check (latitude is null or (latitude >= -90 and latitude <= 90));
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'warehouses_lng_check' and table_name = 'warehouses') then
    alter table public.warehouses add constraint warehouses_lng_check check (longitude is null or (longitude >= -180 and longitude <= 180));
  end if;

  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'sms_parse_results_lat_check' and table_name = 'sms_parse_results') then
    alter table public.sms_parse_results add constraint sms_parse_results_lat_check check (latitude is null or (latitude >= -90 and latitude <= 90));
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'sms_parse_results_lng_check' and table_name = 'sms_parse_results') then
    alter table public.sms_parse_results add constraint sms_parse_results_lng_check check (longitude is null or (longitude >= -180 and longitude <= 180));
  end if;

  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'delivery_tracking_lat_check' and table_name = 'delivery_tracking_updates') then
    alter table public.delivery_tracking_updates add constraint delivery_tracking_lat_check check (latitude is null or (latitude >= -90 and latitude <= 90));
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'delivery_tracking_lng_check' and table_name = 'delivery_tracking_updates') then
    alter table public.delivery_tracking_updates add constraint delivery_tracking_lng_check check (longitude is null or (longitude >= -180 and longitude <= 180));
  end if;

  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'distributions_lat_check' and table_name = 'distributions') then
    alter table public.distributions add constraint distributions_lat_check check (last_latitude is null or (last_latitude >= -90 and last_latitude <= 90));
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'distributions_lng_check' and table_name = 'distributions') then
    alter table public.distributions add constraint distributions_lng_check check (last_longitude is null or (last_longitude >= -180 and last_longitude <= 180));
  end if;
end $$;

-- 4. Add geography(Point, 4326) columns
alter table public.disaster_events
  add column if not exists location_point extensions.geography(Point, 4326);

alter table public.shelters
  add column if not exists location_point extensions.geography(Point, 4326);

alter table public.warehouses
  add column if not exists location_point extensions.geography(Point, 4326);

alter table public.sms_parse_results
  add column if not exists location_point extensions.geography(Point, 4326);

alter table public.delivery_tracking_updates
  add column if not exists location_point extensions.geography(Point, 4326);

alter table public.distributions
  add column if not exists last_location_point extensions.geography(Point, 4326);

-- 5. Create Trigger Functions for Automated Spatial Point Sync (Longitude First, Latitude Second)
create or replace function public.sync_spatial_point()
returns trigger
language plpgsql
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

-- Attach triggers
drop trigger if exists disaster_events_sync_spatial on public.disaster_events;
create trigger disaster_events_sync_spatial
  before insert or update of latitude, longitude on public.disaster_events
  for each row execute function public.sync_spatial_point();

drop trigger if exists shelters_sync_spatial on public.shelters;
create trigger shelters_sync_spatial
  before insert or update of latitude, longitude on public.shelters
  for each row execute function public.sync_spatial_point();

drop trigger if exists warehouses_sync_spatial on public.warehouses;
create trigger warehouses_sync_spatial
  before insert or update of latitude, longitude on public.warehouses
  for each row execute function public.sync_spatial_point();

drop trigger if exists sms_parse_results_sync_spatial on public.sms_parse_results;
create trigger sms_parse_results_sync_spatial
  before insert or update of latitude, longitude on public.sms_parse_results
  for each row execute function public.sync_spatial_point();

drop trigger if exists delivery_tracking_sync_spatial on public.delivery_tracking_updates;
create trigger delivery_tracking_sync_spatial
  before insert or update of latitude, longitude on public.delivery_tracking_updates
  for each row execute function public.sync_spatial_point();

drop trigger if exists distributions_sync_spatial on public.distributions;
create trigger distributions_sync_spatial
  before insert or update of last_latitude, last_longitude on public.distributions
  for each row execute function public.sync_distribution_spatial_point();

-- 6. Backfill existing rows with valid spatial points
update public.disaster_events
set location_point = extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)::extensions.geography
where longitude is not null and latitude is not null and location_point is null;

update public.shelters
set location_point = extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)::extensions.geography
where longitude is not null and latitude is not null and location_point is null;

update public.warehouses
set location_point = extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)::extensions.geography
where longitude is not null and latitude is not null and location_point is null;

update public.sms_parse_results
set location_point = extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)::extensions.geography
where longitude is not null and latitude is not null and location_point is null;

update public.delivery_tracking_updates
set location_point = extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)::extensions.geography
where longitude is not null and latitude is not null and location_point is null;

update public.distributions
set last_location_point = extensions.ST_SetSRID(extensions.ST_MakePoint(last_longitude, last_latitude), 4326)::extensions.geography
where last_longitude is not null and last_latitude is not null and last_location_point is null;

-- 7. Spatial GIST Indexes
create index if not exists disaster_events_location_point_gist_idx on public.disaster_events using gist(location_point);
create index if not exists shelters_location_point_gist_idx on public.shelters using gist(location_point);
create index if not exists warehouses_location_point_gist_idx on public.warehouses using gist(location_point);
create index if not exists sms_parse_results_location_point_gist_idx on public.sms_parse_results using gist(location_point);
create index if not exists delivery_tracking_updates_location_point_gist_idx on public.delivery_tracking_updates using gist(location_point);
create index if not exists distributions_last_location_point_gist_idx on public.distributions using gist(last_location_point);

-- 8. Public-Safe Map Views
drop view if exists public.public_event_summary cascade;
drop view if exists public.public_shelter_summary cascade;
drop view if exists public.public_delivery_tracking_summary cascade;

-- View 1: public_event_summary (sanitized active disaster events)
create or replace view public.public_event_summary as
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

-- View 2: public_shelter_summary (sanitized shelter capacity and status)
create or replace view public.public_shelter_summary as
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

-- View 3: public_delivery_tracking_summary (sanitized logistics tracking without driver phone or internal notes)
create or replace view public.public_delivery_tracking_summary as
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

-- 9. Grants for Public Access
grant select on public.public_event_summary to anon, authenticated;
grant select on public.public_shelter_summary to anon, authenticated;
grant select on public.public_delivery_tracking_summary to anon, authenticated;
