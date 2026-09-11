-- Migration: Enhance Audit Log System with Metadata, Severity, Indonesian Summaries, and Masking
-- Created: 2026-09-10 14:00:00

-- 1. Add Professional Audit Metadata Columns
alter table public.audit_logs
  add column if not exists actor_role text,
  add column if not exists institution_id uuid references public.institutions(id) on delete set null,
  add column if not exists summary text,
  add column if not exists severity text default 'info',
  add column if not exists ip_address text,
  add column if not exists user_agent text,
  add column if not exists request_id text,
  add column if not exists source text default 'web',
  add column if not exists metadata jsonb default '{}'::jsonb;

-- Ensure check constraint on severity
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'audit_logs_severity_check'
      and conrelid = 'public.audit_logs'::regclass
  ) then
    alter table public.audit_logs
      add constraint audit_logs_severity_check
      check (severity in ('info', 'notice', 'warning', 'critical'));
  end if;
end $$;

-- 2. Backfill Actor Role and Institution
update public.audit_logs a
set
  actor_role = coalesce(p.app_role::text, 'system')
from public.profiles p
where a.actor_id = p.id
  and a.actor_role is null;

update public.audit_logs a
set
  institution_id = ui.institution_id
from public.user_institutions ui
where a.actor_id = ui.user_id
  and a.institution_id is null;

update public.audit_logs
set actor_role = 'system'
where actor_id is null and actor_role is null;

-- 3. Backfill Severity Levels
update public.audit_logs
set severity = 'critical'
where action in (
  'event.escalated',
  'event.opened_from_report',
  'report.rejected',
  'account.rejected',
  'account.batch_rejected'
) and (severity is null or severity = 'info');

update public.audit_logs
set severity = 'warning'
where action in (
  'distribution.delayed',
  'report.marked_duplicate',
  'sms.rejected',
  'sms.marked_duplicate',
  'aid_request.rejected'
) and (severity is null or severity = 'info');

update public.audit_logs
set severity = 'notice'
where action in (
  'report.verified',
  'report.followed_up',
  'aid_request.allocated',
  'aid_request.partially_fulfilled',
  'aid_request.fulfilled',
  'aid_allocation.created',
  'aid_allocation.delivered',
  'distribution.received',
  'distribution.arrived',
  'distribution.vehicle_assigned',
  'distribution.checkpoint_updated',
  'distribution.location_updated',
  'shelter.population_updated',
  'proof_of_delivery.confirmed',
  'account.verified',
  'account.batch_verified'
) and (severity is null or severity = 'info');

update public.audit_logs
set severity = 'info'
where severity is null;

-- 4. Backfill Human-Readable Indonesian Summaries
update public.audit_logs
set summary = case
  -- Kejadian & Bencana
  when action = 'event.escalated' then
    'Tingkat eskalasi status bencana ditingkatkan menjadi ' || coalesce(after_data->>'escalation_level', after_data->>'escalationLevel', 'level baru') || '.'
  when action = 'event.opened_from_report' then
    'Kejadian bencana resmi dibuka dari laporan warga: ' || coalesce(after_data->>'name', after_data->>'title', 'Bencana') || '.'
  
  -- Laporan Lapangan & AI
  when action = 'report.created' then
    'Laporan situasi baru diterima via ' || coalesce(after_data->>'channel', 'lapangan') || ' di ' || coalesce(after_data->>'location', 'lokasi') || '.'
  when action = 'report.needs_verification' then
    'Laporan ditandai membutuhkan verifikasi lanjutan oleh petugas posko/lapangan.'
  when action = 'report.verified' then
    'Laporan lapangan dikonfirmasi valid oleh petugas.'
  when action = 'report.followed_up' then
    'Laporan lapangan ditindaklanjuti oleh tim reaksi cepat.'
  when action = 'report.marked_duplicate' then
    'Laporan ditandai sebagai duplikat dari laporan yang sudah ada.'
  when action = 'report.rejected' then
    'Laporan ditolak setelah peninjauan triase operasional.'
  when action = 'report.converted_to_event' then
    'Laporan resmi ditingkatkan menjadi kejadian bencana aktif.'
  when action = 'report.ai_triaged_groq' then
    'Triase otomatis AI: urgensi ' || coalesce(after_data->>'urgency', after_data->>'severity', 'dianalisis') || '.'

  -- SMS Zero-Grid
  when action = 'sms.received_and_parsed' then
    'Pesan SMS Zero-Grid darurat diterima dan diekstraksi.'
  when action = 'sms.accepted' then
    'Pesan SMS darurat disetujui menjadi laporan lapangan resmi.'
  when action = 'sms.edited_and_accepted' then
    'Pesan SMS darurat disesuaikan operator lalu disetujui.'
  when action = 'sms.rejected' then
    'Pesan SMS darurat ditolak (tidak relevan/fiktif).'
  when action = 'sms.marked_duplicate' then
    'Pesan SMS darurat ditandai duplikat informasi serupa.'

  -- Pengajuan & Alokasi Bantuan
  when action = 'aid_request.submitted' then
    'Pengajuan kebutuhan logistik posko diajukan ke pusat logistik.'
  when action = 'aid_request.reviewed' then
    'Pengajuan bantuan posko telah ditinjau oleh operator logistik.'
  when action = 'aid_request.rejected' then
    'Pengajuan bantuan logistik posko ditolak.'
  when action = 'aid_request.allocated' then
    'Alokasi barang bantuan posko disetujui dari stok gudang.'
  when action = 'aid_request.partially_fulfilled' then
    'Sebagian permintaan logistik posko telah dialokasikan.'
  when action = 'aid_request.fulfilled' then
    'Seluruh alokasi kebutuhan logistik posko telah selesai dipenuhi.'
  when action = 'aid_allocation.created' then
    'Pencatatan alokasi logistik dibuat dari gudang.'
  when action = 'aid_allocation.delivered' then
    'Alokasi logistik telah diterima lengkap oleh posko tujuan.'

  -- Posko
  when action = 'shelter.created' then
    'Posko pengungsian baru didaftarkan: ' || coalesce(after_data->>'name', 'Posko') || '.'
  when action = 'shelter.population_updated' then
    'Jumlah pengungsi di posko diperbarui: total ' || coalesce(after_data->>'population_total', after_data->>'total', '0') || ' jiwa.'
  when action = 'need.requested' then
    'Kebutuhan logistik posko diajukan: ' || coalesce(after_data->>'item', 'barang bantuan') || '.'

  -- Distribusi & Armada
  when action = 'distribution.created' then
    'Surat jalan distribusi armada logistik ' || coalesce(after_data->>'code', '') || ' diterbitkan.'
  when action = 'distribution.allocated' then
    'Alokasi barang distribusi logistik telah disetujui.'
  when action = 'distribution.vehicle_assigned' then
    'Kendaraan armada dan pengemudi ditugaskan ke pengiriman ' || coalesce(after_data->>'code', '') || '.'
  when action = 'distribution.location_updated' or action = 'distribution.checkpoint_updated' then
    'Lokasi terakhir diperbarui: ' || coalesce(after_data->>'last_location_name', after_data->>'location', 'titik perjalanan') || '.'
  when action = 'distribution.delayed' then
    'Distribusi logistik tertunda di perjalanan: ' || coalesce(after_data->>'driver_note', after_data->>'note', 'kendala rute') || '.'
  when action = 'distribution.arrived' then
    'Armada distribusi tiba di posko tujuan.'
  when action = 'distribution.status_updated' then
    'Status distribusi logistik diperbarui menjadi ' || coalesce(after_data->>'status', '') || '.'
  when action = 'distribution.received' then
    'Barang bantuan distribusi selesai diserahterimakan di posko penerima.'
  when action = 'proof_of_delivery.confirmed' then
    'Bukti serah terima bantuan (Proof of Delivery) dikonfirmasi posko.'

  -- Bantuan Pihak Ketiga
  when action = 'third_party_aid.created' then
    'Penerimaan bantuan eksternal dicatat dari ' || coalesce(after_data->>'source_name', 'donatur') || '.'
  when action = 'third_party_aid.received_at_warehouse' then
    'Bantuan pihak ketiga telah diverifikasi dan masuk gudang penyangga.'
  when action = 'third_party_aid.allocated' then
    'Bantuan pihak ketiga dialokasikan ke posko prioritas.'

  -- Akun
  when action = 'auth.registered_pending' then
    'Pendaftaran akun baru menunggu aktivasi operator.'
  when action = 'account.verified' then
    'Akun petugas diaktifkan dan disetujui.'
  when action = 'account.rejected' then
    'Permohonan akun petugas ditolak.'
  when action = 'account.batch_verified' then
    'Verifikasi massal persetujuan akun petugas.'
  when action = 'account.batch_rejected' then
    'Penolakan massal akun pengguna.'
  
  -- Fallback umum
  else
    replace(action, '.', ' ') || ' pada ' || target_table
end
where summary is null;

-- 5. Performance and Filtering Indexes
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_target_idx on public.audit_logs (target_table, target_id);
create index if not exists audit_logs_action_idx on public.audit_logs (action);
create index if not exists audit_logs_severity_idx on public.audit_logs (severity);
create index if not exists audit_logs_institution_id_idx on public.audit_logs (institution_id);

-- 6. Helper Function: Masking and Secure Logging in Database
create or replace function public.mask_sensitive_jsonb(p_data jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  k text;
  v jsonb;
  res jsonb := '{}'::jsonb;
  str_val text;
begin
  if p_data is null or jsonb_typeof(p_data) != 'object' then
    return p_data;
  end if;

  for k, v in select * from jsonb_each(p_data) loop
    if k in ('password', 'token', 'secret', 'sim_number', 'license_number') then
      res := res || jsonb_build_object(k, '***MASKED***');
    elsif k in ('phone', 'phone_number', 'sender_phone', 'reporter_phone') then
      str_val := v #>> '{}';
      if length(str_val) >= 7 then
        res := res || jsonb_build_object(k, substring(str_val from 1 for 4) || '****' || substring(str_val from length(str_val) - 2));
      else
        res := res || jsonb_build_object(k, '***MASKED***');
      end if;
    elsif k = 'raw_message' then
      str_val := v #>> '{}';
      if length(str_val) > 80 then
        res := res || jsonb_build_object(k, substring(str_val from 1 for 77) || '...');
      else
        res := res || jsonb_build_object(k, v);
      end if;
    else
      res := res || jsonb_build_object(k, v);
    end if;
  end loop;

  return res;
end;
$$;

create or replace function public.log_audit_event(
  p_actor_id uuid,
  p_action text,
  p_target_table text,
  p_target_id uuid default null,
  p_summary text default null,
  p_severity text default 'info',
  p_before_data jsonb default null,
  p_after_data jsonb default null,
  p_actor_role text default null,
  p_institution_id uuid default null,
  p_source text default 'web',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_log_id uuid;
  v_role text := p_actor_role;
  v_institution uuid := p_institution_id;
  v_summary text := p_summary;
begin
  -- Resolve actor role and institution if not passed
  if v_role is null and p_actor_id is not null then
    select p.app_role::text
    into v_role
    from public.profiles p
    where p.id = p_actor_id;
  end if;

  if v_institution is null and p_actor_id is not null then
    select ui.institution_id
    into v_institution
    from public.user_institutions ui
    where ui.user_id = p_actor_id
    limit 1;
  end if;

  if v_role is null then
    v_role := 'system';
  end if;

  -- Default human summary if not provided
  if v_summary is null then
    v_summary := replace(p_action, '.', ' ') || ' pada ' || p_target_table;
  end if;

  insert into public.audit_logs (
    actor_id,
    actor_role,
    institution_id,
    action,
    target_table,
    target_id,
    summary,
    severity,
    before_data,
    after_data,
    source,
    metadata
  ) values (
    p_actor_id,
    v_role,
    v_institution,
    p_action,
    p_target_table,
    p_target_id,
    v_summary,
    coalesce(p_severity, 'info'),
    public.mask_sensitive_jsonb(p_before_data),
    public.mask_sensitive_jsonb(p_after_data),
    coalesce(p_source, 'web'),
    coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_log_id;

  return v_log_id;
end;
$$;

-- 7. Secure RLS on audit_logs
revoke all on public.audit_logs from anon;

-- Ensure select policy only for admin and bpbd_operator
drop policy if exists "audit_select_operator" on public.audit_logs;
create policy "audit_select_operator" on public.audit_logs
  for select to authenticated
  using (is_ops_role(ARRAY['admin'::app_role, 'bpbd_operator'::app_role]));

-- Insert policy for authenticated users / operations
drop policy if exists "audit_insert_internal" on public.audit_logs;
create policy "audit_insert_internal" on public.audit_logs
  for insert to authenticated
  with check (true);
