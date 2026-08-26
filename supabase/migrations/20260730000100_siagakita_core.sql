create extension if not exists pgcrypto;

create type public.app_role as enum (
  'admin',
  'bpbd_operator',
  'field_officer',
  'shelter_manager',
  'warehouse_manager',
  'public_viewer'
);

create type public.crisis_status as enum ('critical', 'major', 'warning', 'safe');
create type public.event_state as enum ('draft', 'active', 'closed', 'rehabilitation');
create type public.escalation_level as enum ('Kabupaten', 'Provinsi', 'Nasional');
create type public.report_channel as enum ('Web', 'SMS Zero-Grid', 'Petugas');
create type public.report_status as enum ('baru', 'diverifikasi', 'ditindaklanjuti');
create type public.distribution_status as enum ('disiapkan', 'dalam-perjalanan', 'diterima');
create type public.warehouse_level as enum ('Posko', 'Kabupaten', 'Provinsi', 'Nasional');
create type public.aid_status as enum ('menunggu-pencocokan', 'diterima-gudang', 'dialokasikan');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  app_role public.app_role not null default 'public_viewer',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  contact_status text not null default 'aktif' check (contact_status in ('aktif', 'menunggu')),
  created_at timestamptz not null default now()
);

create table public.user_institutions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  primary key (user_id, institution_id)
);

create table public.disaster_events (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  disaster_type text not null,
  location text not null,
  province text not null,
  status public.crisis_status not null default 'warning',
  state public.event_state not null default 'active',
  escalation_level public.escalation_level not null default 'Kabupaten',
  latitude double precision not null,
  longitude double precision not null,
  affected_people integer not null default 0 check (affected_people >= 0),
  active_shelters integer not null default 0 check (active_shelters >= 0),
  summary text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_status_history (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.disaster_events(id) on delete cascade,
  previous_status public.crisis_status,
  next_status public.crisis_status not null,
  previous_escalation public.escalation_level,
  next_escalation public.escalation_level not null,
  note text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.shelters (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  event_id uuid not null references public.disaster_events(id) on delete cascade,
  institution_id uuid references public.institutions(id),
  name text not null,
  location text not null,
  status public.crisis_status not null default 'warning',
  latitude double precision not null,
  longitude double precision not null,
  capacity integer not null check (capacity >= 0),
  population_total integer not null default 0 check (population_total >= 0),
  children integer not null default 0 check (children >= 0),
  elderly integer not null default 0 check (elderly >= 0),
  pregnant integer not null default 0 check (pregnant >= 0),
  disability integer not null default 0 check (disability >= 0),
  last_update timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shelter_population_updates (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references public.shelters(id) on delete cascade,
  population_total integer not null check (population_total >= 0),
  children integer not null default 0 check (children >= 0),
  elderly integer not null default 0 check (elderly >= 0),
  pregnant integer not null default 0 check (pregnant >= 0),
  disability integer not null default 0 check (disability >= 0),
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.needs (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references public.shelters(id) on delete cascade,
  item text not null,
  category text not null,
  requested integer not null check (requested >= 0),
  available integer not null default 0 check (available >= 0),
  unit text not null,
  urgency public.crisis_status not null default 'warning',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id),
  name text not null,
  level public.warehouse_level not null,
  location text,
  created_at timestamptz not null default now()
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  item text not null,
  category text not null,
  stock integer not null default 0 check (stock >= 0),
  reserved integer not null default 0 check (reserved >= 0 and reserved <= stock),
  unit text not null,
  status public.crisis_status not null default 'safe',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  movement_type text not null check (movement_type in ('in', 'reserved', 'out', 'adjustment')),
  quantity integer not null check (quantity > 0),
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.distributions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  destination_shelter_id uuid references public.shelters(id),
  origin_warehouse_id uuid references public.warehouses(id),
  cargo_summary text not null,
  eta text not null,
  progress integer not null default 0 check (progress between 0 and 100),
  status public.distribution_status not null default 'disiapkan',
  institution text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.distribution_items (
  id uuid primary key default gen_random_uuid(),
  distribution_id uuid not null references public.distributions(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id),
  item text not null,
  quantity integer not null check (quantity > 0),
  unit text not null
);

create table public.field_reports (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  channel public.report_channel not null,
  location text not null,
  reporter text not null,
  reporter_contact text,
  received_at timestamptz not null default now(),
  summary text not null,
  status public.report_status not null default 'baru',
  severity public.crisis_status not null default 'warning',
  event_id uuid references public.disaster_events(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.report_verifications (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.field_reports(id) on delete cascade,
  status public.report_status not null,
  note text not null,
  verified_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.third_party_aids (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  cargo text not null,
  quantity integer,
  unit text,
  status public.aid_status not null default 'menunggu-pencocokan',
  warehouse_id uuid references public.warehouses(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.disaster_events(id) on delete cascade,
  shelter_id uuid references public.shelters(id) on delete cascade,
  title text not null,
  rationale text not null,
  confidence integer not null check (confidence between 0 and 100),
  priority public.crisis_status not null,
  action text not null,
  factors text[] not null default '{}',
  source text not null default 'rule-based',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_table text not null,
  target_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index disaster_events_status_idx on public.disaster_events(status, state);
create index shelters_event_idx on public.shelters(event_id);
create index needs_shelter_urgency_idx on public.needs(shelter_id, urgency);
create index inventory_warehouse_idx on public.inventory_items(warehouse_id);
create index distributions_status_idx on public.distributions(status);
create index field_reports_status_idx on public.field_reports(status, severity);
create index audit_logs_target_idx on public.audit_logs(target_table, target_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger disaster_events_set_updated_at before update on public.disaster_events for each row execute function public.set_updated_at();
create trigger shelters_set_updated_at before update on public.shelters for each row execute function public.set_updated_at();
create trigger needs_set_updated_at before update on public.needs for each row execute function public.set_updated_at();
create trigger inventory_items_set_updated_at before update on public.inventory_items for each row execute function public.set_updated_at();
create trigger distributions_set_updated_at before update on public.distributions for each row execute function public.set_updated_at();
create trigger field_reports_set_updated_at before update on public.field_reports for each row execute function public.set_updated_at();
create trigger third_party_aids_set_updated_at before update on public.third_party_aids for each row execute function public.set_updated_at();

create or replace view public.public_event_summary
with (security_invoker = true)
as
select id, code, name, disaster_type, location, province, status, state, latitude, longitude, summary, updated_at
from public.disaster_events
where state = 'active';

create or replace view public.public_shelter_summary
with (security_invoker = true)
as
select id, code, event_id, name, location, status, latitude, longitude, last_update
from public.shelters;

alter table public.profiles enable row level security;
alter table public.institutions enable row level security;
alter table public.user_institutions enable row level security;
alter table public.disaster_events enable row level security;
alter table public.event_status_history enable row level security;
alter table public.shelters enable row level security;
alter table public.shelter_population_updates enable row level security;
alter table public.needs enable row level security;
alter table public.warehouses enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.distributions enable row level security;
alter table public.distribution_items enable row level security;
alter table public.field_reports enable row level security;
alter table public.report_verifications enable row level security;
alter table public.third_party_aids enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_internal" on public.profiles for select to authenticated
using ((select auth.uid()) = id or (auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator'));
create policy "profiles_admin_write" on public.profiles for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin');

create policy "institutions_select_internal" on public.institutions for select to authenticated using (true);
create policy "institutions_admin_write" on public.institutions for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator'))
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator'));

create policy "user_institutions_select" on public.user_institutions for select to authenticated
using ((select auth.uid()) = user_id or (auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator'));
create policy "user_institutions_admin_write" on public.user_institutions for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin');

create policy "events_public_safe_select" on public.disaster_events for select to anon, authenticated
using (state = 'active');
create policy "events_operator_write" on public.disaster_events for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator'))
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator'));

create policy "history_select_internal" on public.event_status_history for select to authenticated using (true);
create policy "history_operator_insert" on public.event_status_history for insert to authenticated
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator'));

create policy "shelters_public_safe_select" on public.shelters for select to anon, authenticated using (true);
create policy "shelters_operator_write" on public.shelters for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'field_officer', 'shelter_manager'))
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'field_officer', 'shelter_manager'));

create policy "population_updates_select_internal" on public.shelter_population_updates for select to authenticated using (true);
create policy "population_updates_insert" on public.shelter_population_updates for insert to authenticated
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'field_officer', 'shelter_manager'));

create policy "needs_select_internal" on public.needs for select to authenticated using (true);
create policy "needs_write_posko" on public.needs for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'field_officer', 'shelter_manager'))
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'field_officer', 'shelter_manager'));

create policy "warehouses_select_internal" on public.warehouses for select to authenticated using (true);
create policy "warehouses_operator_write" on public.warehouses for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'warehouse_manager'))
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'warehouse_manager'));

create policy "inventory_select_internal" on public.inventory_items for select to authenticated using (true);
create policy "inventory_warehouse_write" on public.inventory_items for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'warehouse_manager'))
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'warehouse_manager'));

create policy "stock_movements_select_internal" on public.stock_movements for select to authenticated using (true);
create policy "stock_movements_insert" on public.stock_movements for insert to authenticated
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'warehouse_manager'));

create policy "distributions_select_internal" on public.distributions for select to authenticated using (true);
create policy "distributions_write" on public.distributions for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'warehouse_manager'))
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'warehouse_manager'));

create policy "distribution_items_select_internal" on public.distribution_items for select to authenticated using (true);
create policy "distribution_items_write" on public.distribution_items for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'warehouse_manager'))
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'warehouse_manager'));

create policy "reports_select_internal" on public.field_reports for select to authenticated using (true);
create policy "reports_public_insert" on public.field_reports for insert to anon, authenticated
with check (true);
create policy "reports_operator_update" on public.field_reports for update to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'field_officer'))
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'field_officer'));

create policy "report_verifications_select_internal" on public.report_verifications for select to authenticated using (true);
create policy "report_verifications_insert" on public.report_verifications for insert to authenticated
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'field_officer'));

create policy "third_party_aids_select_internal" on public.third_party_aids for select to authenticated using (true);
create policy "third_party_aids_write" on public.third_party_aids for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'warehouse_manager'))
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator', 'warehouse_manager'));

create policy "recommendations_select_internal" on public.ai_recommendations for select to authenticated using (true);
create policy "recommendations_operator_update" on public.ai_recommendations for update to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator'))
with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator'));

create policy "audit_select_operator" on public.audit_logs for select to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('admin', 'bpbd_operator'));
create policy "audit_insert_internal" on public.audit_logs for insert to authenticated
with check ((select auth.uid()) = actor_id);

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.public_event_summary, public.public_shelter_summary to anon, authenticated;
grant select (id, code, name, disaster_type, location, province, status, state, latitude, longitude, summary, updated_at) on public.disaster_events to anon;
grant select (id, code, event_id, name, location, status, latitude, longitude, last_update) on public.shelters to anon;
grant insert on public.field_reports to anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
