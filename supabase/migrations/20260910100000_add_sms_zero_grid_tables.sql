-- =====================================================================
-- SiagaKita | SMS Zero-Grid Dedicated Workflow
-- 1. sms_status enum
-- 2. sms_messages table (raw SMS messages, immutable source of truth)
-- 3. sms_parse_results table (structured extracted data, multiple versions supported)
-- 4. RLS policies: internal authenticated access only (protect citizen phone numbers)
-- =====================================================================

-- 1. Enum status pemrosesan SMS
do $$
begin
  if not exists (select 1 from pg_type where typname = 'sms_status') then
    create type public.sms_status as enum (
      'pending',
      'parsed',
      'accepted',
      'rejected',
      'duplicate',
      'failed'
    );
  end if;
end $$;

-- 2. Tabel sms_messages (SMS mentah)
create table if not exists public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  sender_phone text not null,
  raw_message text not null,
  received_at timestamptz not null default now(),
  gateway_source text not null default 'manual-relay',
  status public.sms_status not null default 'pending',
  field_report_id uuid references public.field_reports(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Tabel sms_parse_results (hasil ekstraksi struktur data)
create table if not exists public.sms_parse_results (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.sms_messages(id) on delete cascade,
  location text not null,
  disaster_type text not null default 'Bencana Lapangan',
  severity public.crisis_status not null default 'warning',
  needs_summary text not null,
  quantity numeric,
  unit text,
  reporter_name text,
  latitude double precision,
  longitude double precision,
  confidence_score integer not null default 75,
  parser_version text not null default 'v1.0-zero-grid',
  parse_error text,
  is_accepted boolean not null default false,
  created_at timestamptz not null default now()
);

-- 4. Indeks performa
create index if not exists sms_messages_status_idx
  on public.sms_messages(status, received_at desc);
create index if not exists sms_messages_sender_phone_idx
  on public.sms_messages(sender_phone);
create index if not exists sms_messages_field_report_id_idx
  on public.sms_messages(field_report_id);
create index if not exists sms_parse_results_message_id_idx
  on public.sms_parse_results(message_id, created_at desc);

-- 5. Trigger updated_at
drop trigger if exists sms_messages_set_updated_at on public.sms_messages;
create trigger sms_messages_set_updated_at
  before update on public.sms_messages
  for each row execute function public.set_updated_at();

-- 6. Row Level Security (RLS)
alter table public.sms_messages enable row level security;
alter table public.sms_parse_results enable row level security;

-- Policies sms_messages: Authenticated internal ops roles only
drop policy if exists "sms_messages_select_internal" on public.sms_messages;
create policy "sms_messages_select_internal" on public.sms_messages
  for select to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
  );

drop policy if exists "sms_messages_insert_internal" on public.sms_messages;
create policy "sms_messages_insert_internal" on public.sms_messages
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
  );

drop policy if exists "sms_messages_update_internal" on public.sms_messages;
create policy "sms_messages_update_internal" on public.sms_messages
  for update to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
  )
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
  );

-- Policies sms_parse_results
drop policy if exists "sms_parse_results_select_internal" on public.sms_parse_results;
create policy "sms_parse_results_select_internal" on public.sms_parse_results
  for select to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
  );

drop policy if exists "sms_parse_results_insert_internal" on public.sms_parse_results;
create policy "sms_parse_results_insert_internal" on public.sms_parse_results
  for insert to authenticated
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
  );

drop policy if exists "sms_parse_results_update_internal" on public.sms_parse_results;
create policy "sms_parse_results_update_internal" on public.sms_parse_results
  for update to authenticated
  using (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
  )
  with check (
    public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role, 'field_officer'::public.app_role])
  );

-- 7. Registrasi realtime publikasi
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sms_messages'
    ) then
      alter publication supabase_realtime add table public.sms_messages;
    end if;
  end if;
end $$;
