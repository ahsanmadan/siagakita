-- ==============================================================================
-- SIAGAKITA: CLEAN SLATE RESET SCRIPT (ZERO DUMMY DATA)
-- ==============================================================================
-- Script ini menghapus seluruh data transaksi bencana tiruan / dummy,
-- sehingga sistem berada dalam kondisi bersih dan siap menerima data operasional
-- nyata melalui alur input aplikasi resmi (Lapor Warga -> Asesmen -> Posko -> Gudang).
--
-- CATATAN: Master Akun Pengguna (RBAC), Master Lembaga (BPBD/PMI/TNI), dan
-- Master Gudang Logistik tetap dipertahankan agar pengguna dapat login dan beroperasi.
-- ==============================================================================

begin;

-- 1. Bersihkan transaksi rekomendasi & bantuan pihak ketiga
truncate table public.ai_recommendations cascade;
truncate table public.third_party_aids cascade;

-- 2. Bersihkan transaksi laporan lapangan & distribusi armada
truncate table public.field_reports cascade;
truncate table public.distributions cascade;

-- 3. Bersihkan transaksi kebutuhan & posko pengungsian
truncate table public.needs cascade;
truncate table public.shelters cascade;

-- 4. Bersihkan riwayat eskalasi & kejadian bencana
truncate table public.event_status_history cascade;
truncate table public.disaster_events cascade;

-- 5. Catat log sanitasi sistem
insert into public.audit_logs (actor_id, action, target_table, target_id, after_data)
values (
  '00000000-0000-4000-8000-000000000001',
  'system.clean_slate_executed',
  'system',
  null,
  jsonb_build_object(
    'status', 'zero_dummy_active',
    'timestamp', now(),
    'message', 'Seluruh data transaksi dummy dibersihkan. Sistem siap menerima alur data riil.'
  )
);

commit;
