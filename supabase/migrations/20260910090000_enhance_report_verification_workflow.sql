-- Peningkatan Alur Verifikasi & Triase Laporan SiagaKita
-- 1. Tambahkan nilai enum baru ke report_status secara non-destruktif
-- Nilai eksisting ('baru', 'diverifikasi', 'ditindaklanjuti', 'ditolak') tetap utuh.
alter type public.report_status add value if not exists 'perlu_verifikasi';
alter type public.report_status add value if not exists 'duplikat';
alter type public.report_status add value if not exists 'dibuka_jadi_kejadian';

-- 2. Tambah kolom previous_status dan next_status pada report_verifications
alter table public.report_verifications
  add column if not exists previous_status public.report_status;

alter table public.report_verifications
  add column if not exists next_status public.report_status;

-- Isi next_status dengan status yang sudah ada untuk data lama
update public.report_verifications
  set next_status = status
  where next_status is null and status is not null;

-- 3. Index pendukung untuk query status verifikasi laporan
create index if not exists report_verifications_status_idx
  on public.report_verifications(status, previous_status, next_status);
