-- =====================================================================
-- SiagaKita | Blueprint Arsitektur Enterprise
-- Table Partitioning PostgreSQL untuk audit trail skala nasional
-- =====================================================================
--
-- TUJUAN
--   Menunjukkan rancangan partisi rentang waktu (range partitioning) untuk
--   tabel audit `audit_logs` ketika SiagaKita naik dari skala provinsi ke
--   skala nasional (perkiraan puluhan juta baris audit per tahun).
--
-- SIFAT MIGRASI: NON-DESTRUKTIF (BLUEPRINT)
--   Migrasi ini TIDAK mengubah, TIDAK mengganti nama, dan TIDAK menghapus
--   tabel produksi `public.audit_logs`. Seluruh objek blueprint dibuat pada
--   schema terpisah `enterprise_blueprint` sehingga:
--     1. `supabase db reset` tetap hijau tanpa downtime data operasional;
--     2. policy, index, dan publication `supabase_realtime` yang sudah
--        berjalan di `public` tidak tersentuh;
--     3. penguji teknis dapat menjalankan `explain` langsung pada struktur
--        terpartisi untuk memverifikasi klaim performa.
--   Prosedur cutover produksi sengaja ditulis sebagai komentar runbook di
--   bagian akhir file, bukan sebagai DDL aktif.
--
-- REFERENSI STRUKTUR SUMBER
--   `public.audit_logs` pada 20260730000100_siagakita_core.sql
--   Index produksi: (target_table, target_id, created_at desc), (actor_id)
--   RLS produksi  : select untuk admin/bpbd_operator, insert self-actor
-- =====================================================================

create schema if not exists enterprise_blueprint;

comment on schema enterprise_blueprint is
  'Schema blueprint arsitektur enterprise SiagaKita. Berisi rancangan tabel terpartisi dan otomatisasi lifecycle partisi untuk keperluan dokumentasi teknis dan uji performa. Bukan schema operasional.';

-- ---------------------------------------------------------------------
-- 1. TABEL INDUK TERPARTISI
-- ---------------------------------------------------------------------
-- Kolom mirror penuh dari `public.audit_logs` agar hasil uji performa
-- sebanding apple-to-apple dengan tabel produksi.
--
-- CATATAN PRIMARY KEY KOMPOSIT (id, created_at):
--   PostgreSQL mewajibkan setiap kolom partisi ikut serta dalam constraint
--   unique/primary key pada tabel terpartisi. Alasannya, unique index pada
--   tabel terpartisi diwujudkan sebagai kumpulan index per-partisi; tanpa
--   kolom partisi di dalam key, PostgreSQL tidak dapat menjamin keunikan
--   lintas partisi. Karena itu `primary key (id, created_at)`, bukan
--   `primary key (id)` seperti pada tabel non-partisi.
--   Konsekuensi aplikasi: setiap pembacaan satu baris audit sebaiknya
--   menyertakan `created_at` (atau rentang waktunya) agar tetap kena
--   partition pruning, bukan hanya `where id = $1`.
--
-- CATATAN FOREIGN KEY:
--   `actor_id` dibiarkan tanpa foreign key ke `public.profiles` pada
--   blueprint ini. Pada tabel append-only berukuran sangat besar, biaya
--   pengecekan referential integrity per insert menjadi signifikan,
--   sementara audit trail justru harus tetap dapat dibaca meskipun profil
--   aktor sudah dihapus. Integritas aktor cukup divalidasi di lapisan
--   aplikasi dan RLS.
create table if not exists enterprise_blueprint.audit_logs (
  id uuid not null default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_table text not null,
  target_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);

comment on table enterprise_blueprint.audit_logs is
  'Blueprint audit trail terpartisi per bulan berdasarkan created_at. Batas bawah inklusif, batas atas eksklusif.';
comment on column enterprise_blueprint.audit_logs.created_at is
  'Kunci partisi. Wajib dipakai sebagai predikat query agar partition pruning aktif.';

-- ---------------------------------------------------------------------
-- 2. PARTISI BULANAN EKSPLISIT
-- ---------------------------------------------------------------------
-- Konvensi nama: audit_logs_y<TAHUN>m<BULAN> (dua digit bulan).
-- Batas rentang: from ('YYYY-MM-01') to ('YYYY-(MM+1)-01').
--   Batas bawah INKLUSIF, batas atas EKSKLUSIF. Baris tepat pada
--   '2026-09-01 00:00:00+00' masuk ke partisi September, bukan Agustus,
--   sehingga tidak ada baris ganda maupun celah antar partisi.
create table if not exists enterprise_blueprint.audit_logs_y2026m08
  partition of enterprise_blueprint.audit_logs
  for values from ('2026-08-01') to ('2026-09-01');

create table if not exists enterprise_blueprint.audit_logs_y2026m09
  partition of enterprise_blueprint.audit_logs
  for values from ('2026-09-01') to ('2026-10-01');

create table if not exists enterprise_blueprint.audit_logs_y2026m10
  partition of enterprise_blueprint.audit_logs
  for values from ('2026-10-01') to ('2026-11-01');

create table if not exists enterprise_blueprint.audit_logs_y2026m11
  partition of enterprise_blueprint.audit_logs
  for values from ('2026-11-01') to ('2026-12-01');

create table if not exists enterprise_blueprint.audit_logs_y2026m12
  partition of enterprise_blueprint.audit_logs
  for values from ('2026-12-01') to ('2027-01-01');

-- PARTISI DEFAULT (CATCH-ALL)
--   Fungsi: jaring pengaman agar insert tidak pernah gagal dengan
--   "no partition of relation found for row" bila otomatisasi bulanan
--   terlambat berjalan. Audit trail tidak boleh hilang hanya karena
--   partisi belum dibuat.
--   Trade-off yang harus disadari penguji:
--     1. Selama partisi default berisi baris, penambahan partisi baru
--        memerlukan pemindaian penuh partisi default untuk memastikan
--        tidak ada baris yang seharusnya milik rentang baru. Ini mengambil
--        lock dan menjadi lambat bila partisi default membengkak.
--     2. Perencana query tidak dapat memangkas partisi default seagresif
--        partisi bereentang, karena batasnya tidak pasti.
--   Karena itu partisi default harus dipantau dan idealnya selalu kosong.
create table if not exists enterprise_blueprint.audit_logs_default
  partition of enterprise_blueprint.audit_logs default;

comment on table enterprise_blueprint.audit_logs_default is
  'Catch-all partition. Idealnya selalu kosong; isi tidak nol menandakan otomatisasi partisi bulanan gagal berjalan.';

-- ---------------------------------------------------------------------
-- 3. INDEX PER-PARTISI
-- ---------------------------------------------------------------------
-- Index dibuat pada tabel INDUK. PostgreSQL otomatis menurunkannya ke
-- setiap partisi yang sudah ada maupun partisi baru yang dibuat kemudian
-- (partitioned index). Jadi otomatisasi bulanan tidak perlu membuat index
-- secara manual.
--
-- MENGAPA INDEX PER-PARTISI LEBIH CEPAT DARI SATU INDEX GLOBAL:
--   1. Kedalaman B-tree tumbuh mengikuti jumlah baris. Satu index atas
--      120 juta baris lebih dalam daripada 12 index atas 10 juta baris,
--      sehingga jumlah page yang dibaca per lookup lebih banyak.
--   2. Index bulan aktif berukuran kecil sehingga muat di shared_buffers /
--      page cache. Query operasional yang hampir selalu menyentuh data
--      terbaru menjadi cache-friendly.
--   3. VACUUM, ANALYZE, dan REINDEX berjalan per partisi. Pemeliharaan
--      bulan lama tidak mengganggu partisi bulan aktif.
--   4. Bulk load dan arsip cukup menyentuh satu partisi, bukan mengocok
--      satu index raksasa.
create index if not exists audit_logs_target_idx
  on enterprise_blueprint.audit_logs (target_table, target_id, created_at desc);

create index if not exists audit_logs_actor_id_idx
  on enterprise_blueprint.audit_logs (actor_id);

create index if not exists audit_logs_created_at_idx
  on enterprise_blueprint.audit_logs (created_at desc);

-- ---------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY PADA TABEL TERPARTISI
-- ---------------------------------------------------------------------
-- Poin penting untuk penguji: partisi TIDAK melemahkan RLS. Policy yang
-- dipasang pada tabel induk berlaku untuk seluruh partisi karena akses
-- dilakukan melalui tabel induk. Partisi anak tetap diberi RLS agar akses
-- langsung ke partisi (misalnya `select from audit_logs_y2026m09`) juga
-- tunduk pada kebijakan yang sama.
--
-- Policy di bawah disamakan dengan produksi:
--   select : hanya admin dan bpbd_operator (via public.is_ops_role)
--   insert  : hanya boleh mencatat diri sendiri sebagai actor
--   tanpa policy update/delete  -> audit trail bersifat append-only
alter table enterprise_blueprint.audit_logs enable row level security;

do $$
declare
  child_table text;
begin
  for child_table in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_inherits i on i.inhrelid = c.oid
    join pg_class p on p.oid = i.inhparent
    join pg_namespace pn on pn.oid = p.relnamespace
    where n.nspname = 'enterprise_blueprint'
      and pn.nspname = 'enterprise_blueprint'
      and p.relname = 'audit_logs'
  loop
    execute format('alter table enterprise_blueprint.%I enable row level security', child_table);
  end loop;
end
$$;

-- Guard: helper role produksi mungkin belum ada bila migrasi ini dijalankan
-- pada database kosong di luar urutan. Blueprint tetap berhasil, hanya
-- policy-nya yang dilewati dengan notice yang jelas.
do $$
begin
  if to_regprocedure('public.is_ops_role(public.app_role[])') is null then
    raise notice '[blueprint] public.is_ops_role(app_role[]) tidak ditemukan. Policy RLS blueprint dilewati; tabel tetap RLS-enabled sehingga default-deny.';
    return;
  end if;

  drop policy if exists "blueprint_audit_select_operator" on enterprise_blueprint.audit_logs;
  drop policy if exists "blueprint_audit_insert_internal" on enterprise_blueprint.audit_logs;

  execute $ddl$
    create policy "blueprint_audit_select_operator"
      on enterprise_blueprint.audit_logs
      for select
      to authenticated
      using (public.is_ops_role(array['admin'::public.app_role, 'bpbd_operator'::public.app_role]))
  $ddl$;

  execute $ddl$
    create policy "blueprint_audit_insert_internal"
      on enterprise_blueprint.audit_logs
      for insert
      to authenticated
      with check ((select auth.uid()) = actor_id)
  $ddl$;
end
$$;

-- Hak akses schema: hanya role terautentikasi, dan tetap dibatasi RLS.
-- `anon` sengaja tidak diberi akses apa pun ke audit trail.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant usage on schema enterprise_blueprint to authenticated';
    execute 'grant select, insert on enterprise_blueprint.audit_logs to authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on schema enterprise_blueprint from anon';
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- 5. OTOMATISASI LIFECYCLE PARTISI
-- ---------------------------------------------------------------------
-- KEPUTUSAN DESAIN: TIDAK MEMAKAI TRIGGER BEFORE INSERT
--   Pola lama (era PostgreSQL 9.x) membuat partisi lewat trigger
--   BEFORE INSERT. Pola itu ditolak di blueprint ini karena:
--     1. Trigger plpgsql berjalan pada SETIAP baris insert, menambah
--        overhead permanen pada jalur tulis terpanas sistem.
--     2. Pembuatan tabel di dalam trigger mengambil lock DDL di tengah
--        transaksi tulis; pada lonjakan bencana ini berisiko lock
--        contention dan deadlock.
--     3. Sejak PostgreSQL 10+, routing baris ke partisi sudah dikerjakan
--        oleh engine (declarative partitioning), jadi trigger hanya
--        menambah biaya tanpa manfaat routing.
--   Blueprint memakai kombinasi yang lebih murah: penjadwalan pg_cron
--   (proaktif, di luar jalur request) + partisi default (jaring pengaman).

-- 5a. Fungsi idempotent pembuat satu partisi bulanan.
create or replace function enterprise_blueprint.ensure_audit_log_partition(target_month date)
returns text
language plpgsql
security definer
set search_path = enterprise_blueprint, public, pg_catalog
as $$
declare
  range_start date := date_trunc('month', target_month)::date;
  range_end date := (date_trunc('month', target_month) + interval '1 month')::date;
  partition_name text := format('audit_logs_y%sm%s', to_char(range_start, 'YYYY'), to_char(range_start, 'MM'));
begin
  execute format(
    'create table if not exists enterprise_blueprint.%I partition of enterprise_blueprint.audit_logs for values from (%L) to (%L)',
    partition_name,
    range_start,
    range_end
  );

  execute format('alter table enterprise_blueprint.%I enable row level security', partition_name);

  return partition_name;
end;
$$;

comment on function enterprise_blueprint.ensure_audit_log_partition(date) is
  'Membuat partisi bulanan audit_logs untuk bulan yang memuat target_month bila belum ada. Idempotent, aman dipanggil berulang.';

-- 5b. Fungsi pembungkus: bulan berjalan + N bulan ke depan.
--     Membuat partisi lebih awal (pre-create) penting agar sistem tidak
--     pernah bergantung pada partisi default saat pergantian bulan.
create or replace function enterprise_blueprint.ensure_upcoming_audit_log_partitions(months_ahead int default 3)
returns setof text
language plpgsql
security definer
set search_path = enterprise_blueprint, public, pg_catalog
as $$
declare
  month_offset int;
begin
  for month_offset in 0..greatest(coalesce(months_ahead, 0), 0) loop
    return next enterprise_blueprint.ensure_audit_log_partition(
      (date_trunc('month', now()) + make_interval(months => month_offset))::date
    );
  end loop;
end;
$$;

comment on function enterprise_blueprint.ensure_upcoming_audit_log_partitions(int) is
  'Menjamin partisi bulan berjalan dan months_ahead bulan berikutnya tersedia. Dipanggil terjadwal oleh pg_cron.';

-- 5c. Penjadwalan pg_cron.
--     Dibungkus guard karena pg_cron tidak selalu tersedia pada Supabase
--     lokal/CI. Bila tidak tersedia, migrasi TETAP SUKSES dan hanya
--     menampilkan notice berisi instruksi manual.
--     Jadwal '0 2 25 * *' = pukul 02:00 tanggal 25 setiap bulan, yaitu
--     beberapa hari sebelum pergantian bulan, memberi ruang untuk deteksi
--     kegagalan sebelum partisi baru benar-benar dibutuhkan.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      create extension if not exists pg_cron;
    exception
      when others then
        raise notice '[blueprint] pg_cron tersedia tetapi gagal diaktifkan: %. Lanjut tanpa penjadwalan.', sqlerrm;
    end;
  end if;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Idempotent: hapus job lama bernama sama sebelum mendaftarkan ulang.
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'siagakita_ensure_audit_partitions';

    perform cron.schedule(
      'siagakita_ensure_audit_partitions',
      '0 2 25 * *',
      'select enterprise_blueprint.ensure_upcoming_audit_log_partitions(3);'
    );

    raise notice '[blueprint] pg_cron job siagakita_ensure_audit_partitions terpasang (0 2 25 * *).';
  else
    raise notice '[blueprint] pg_cron tidak tersedia di environment ini. Jadwalkan manual di Supabase Cloud: select cron.schedule(''siagakita_ensure_audit_partitions'', ''0 2 25 * *'', ''select enterprise_blueprint.ensure_upcoming_audit_log_partitions(3);'');';
  end if;
end
$$;

-- 5d. Jalankan sekali sekarang agar partisi ke depan langsung tersedia
--     tanpa menunggu jadwal cron pertama.
select enterprise_blueprint.ensure_upcoming_audit_log_partitions(3);

-- ---------------------------------------------------------------------
-- 6. PARTITION PRUNING: CARA VERIFIKASI
-- ---------------------------------------------------------------------
-- Partition pruning adalah kemampuan perencana (dan eksekutor) PostgreSQL
-- untuk membuang partisi yang mustahil memuat baris hasil, berdasarkan
-- predikat pada kunci partisi. Efeknya: query audit satu bulan hanya
-- membaca satu partisi, bukan seluruh riwayat nasional.
--
-- CONTOH QUERY BENAR (pruning aktif, menyentuh 1 partisi):
--   explain (analyze, buffers)
--   select id, action, target_table, created_at
--   from enterprise_blueprint.audit_logs
--   where created_at >= '2026-09-01' and created_at < '2026-10-01'
--   order by created_at desc
--   limit 50;
--
--   Output yang diharapkan: node plan hanya memuat
--   `Seq Scan`/`Index Scan on audit_logs_y2026m09`, dan baris ringkasan
--   `Subplans Removed` atau daftar partisi lain tidak muncul sama sekali.
--
-- CONTOH QUERY SALAH (pruning gagal, seluruh partisi dipindai):
--   select * from enterprise_blueprint.audit_logs
--   where to_char(created_at, 'YYYY-MM') = '2026-09';
--   -> membungkus kunci partisi dalam fungsi menghilangkan informasi
--      rentang yang dibutuhkan perencana. Plan akan menampilkan `Append`
--      dengan SEMUA partisi.
--
--   select * from enterprise_blueprint.audit_logs where id = $1;
--   -> tanpa predikat created_at, semua partisi harus diperiksa.
--      Perbaikan: sertakan rentang waktu, misalnya
--      `where id = $1 and created_at >= $2 and created_at < $3`.
--
-- ATURAN UNTUK LAPISAN APLIKASI:
--   Setiap query pada konsol audit-log WAJIB mengirim filter rentang
--   `created_at` (default: 30 hari terakhir), bukan hanya `limit`.

-- ---------------------------------------------------------------------
-- 7. RETENSI DAN ARSIP: DETACH VS DELETE
-- ---------------------------------------------------------------------
-- Menghapus audit lama dengan `delete from audit_logs where created_at < ...`
-- pada tabel non-partisi bersifat mahal:
--   - setiap baris ditandai mati (dead tuple) satu per satu;
--   - WAL membengkak sebesar volume yang dihapus;
--   - ruang disk baru kembali setelah VACUUM, dan VACUUM FULL butuh
--     ACCESS EXCLUSIVE lock;
--   - index menjadi bloat dan perlu REINDEX.
--
-- Pada tabel terpartisi, siklus retensi menjadi operasi metadata:
--
--   -- 1) Lepas partisi lama tanpa memblokir penulisan partisi lain.
--   alter table enterprise_blueprint.audit_logs
--     detach partition enterprise_blueprint.audit_logs_y2026m08 concurrently;
--
--   -- 2) Arsipkan ke object storage (pg_dump per tabel, lalu unggah).
--   --    Tabel hasil detach menjadi tabel mandiri biasa dan masih bisa
--   --    dibaca untuk keperluan audit forensik.
--
--   -- 3) Setelah arsip terverifikasi, buang tabel arsip.
--   drop table enterprise_blueprint.audit_logs_y2026m08;
--
-- `drop table` mengembalikan ruang disk seketika tanpa VACUUM dan tanpa
-- WAL sebesar isi data. Untuk kewajiban retensi audit pemerintahan
-- (misalnya simpan 5 tahun, arsip setelahnya), pola detach-and-archive
-- adalah pembeda utama dibanding delete masif.

-- =====================================================================
-- 8. RUNBOOK CUTOVER PRODUKSI (MANUAL, TIDAK DIEKSEKUSI OTOMATIS)
-- =====================================================================
-- PERINGATAN
--   Blok di bawah ini SENGAJA berupa komentar. Jangan dijalankan sebagai
--   bagian dari `supabase db push` atau `supabase db reset`. Prosedur ini
--   mengubah tabel produksi `public.audit_logs`, memerlukan jendela
--   pemeliharaan (write freeze), dan wajib didahului backup terverifikasi
--   serta uji lengkap di environment staging.
--
--   Estimasi downtime tulis: proporsional terhadap volume backfill.
--   Selama backfill, penulisan audit harus dihentikan atau dialihkan agar
--   tidak ada baris yang hilang di antara rename dan pemasangan parent.
--
-- PRASYARAT
--   [ ] Backup penuh (PITR aktif) dan restore point tercatat.
--   [ ] Runbook sudah dijalankan sukses di staging dengan volume mirip.
--   [ ] Jendela pemeliharaan disetujui pemilik layanan (BPBD).
--   [ ] Aplikasi sudah memakai filter `created_at` pada semua query audit.
--
-- LANGKAH
--   1) Bekukan penulisan audit.
--      -- Nonaktifkan job/route yang menulis audit, atau cabut hak insert:
--      -- revoke insert on public.audit_logs from authenticated;
--
--   2) Keluarkan tabel lama dari publication realtime.
--      -- alter publication supabase_realtime drop table public.audit_logs;
--
--   3) Ganti nama tabel lama menjadi legacy.
--      -- alter table public.audit_logs rename to audit_logs_legacy;
--      -- alter index public.audit_logs_target_idx rename to audit_logs_legacy_target_idx;
--      -- alter index public.audit_logs_actor_id_idx rename to audit_logs_legacy_actor_id_idx;
--
--   4) Buat tabel induk terpartisi baru bernama `public.audit_logs`
--      dengan definisi identik blueprint di bagian 1, lalu buat partisi
--      untuk SELURUH rentang bulan yang ada di data legacy plus partisi
--      default:
--      -- select public.ensure_audit_log_partition(generate_series(
--      --   date_trunc('month', (select min(created_at) from public.audit_logs_legacy))::date,
--      --   date_trunc('month', now())::date + interval '3 months',
--      --   interval '1 month'
--      -- )::date);
--
--   5) Backfill per batch bulanan agar transaksi tetap pendek dan WAL
--      terkendali. Jalankan satu bulan per transaksi:
--      -- insert into public.audit_logs
--      --   (id, actor_id, action, target_table, target_id, before_data, after_data, created_at)
--      -- select id, actor_id, action, target_table, target_id, before_data, after_data, created_at
--      -- from public.audit_logs_legacy
--      -- where created_at >= $1 and created_at < $2;
--
--   6) Pasang ulang index (bagian 3), RLS, dan policy (bagian 4) pada
--      tabel induk baru, lalu `analyze public.audit_logs;`.
--
--   7) Masukkan kembali ke publication realtime.
--      -- alter publication supabase_realtime add table public.audit_logs;
--
--   8) Verifikasi sebelum membuka penulisan.
--      [ ] Jumlah baris cocok:
--          -- select count(*) from public.audit_logs_legacy;
--          -- select count(*) from public.audit_logs;
--      [ ] Checksum per bulan cocok:
--          -- select date_trunc('month', created_at) as bulan, count(*)
--          -- from public.audit_logs group by 1 order by 1;
--      [ ] `audit_logs_default` kosong.
--      [ ] Pruning aktif: `explain` query 1 bulan hanya menyentuh 1 partisi.
--      [ ] RLS terbukti: pembacaan sebagai role `public_viewer` mengembalikan
--          0 baris; pembacaan sebagai `bpbd_operator` mengembalikan data.
--      [ ] Konsol audit-log aplikasi menampilkan data dengan benar.
--
--   9) Buka kembali penulisan audit dan pantau error rate 24 jam.
--
--  10) Setelah periode observasi aman (disarankan 7-14 hari), baru
--      arsipkan dan hapus tabel legacy:
--      -- drop table public.audit_logs_legacy;
--
-- ROLLBACK (bila verifikasi langkah 8 gagal)
--   a) Jangan buka penulisan.
--   b) -- alter publication supabase_realtime drop table public.audit_logs;
--   c) -- drop table public.audit_logs cascade;   -- membuang parent + partisi hasil backfill
--   d) -- alter table public.audit_logs_legacy rename to audit_logs;
--   e) Pulihkan nama index dan policy versi lama, lalu masukkan kembali
--      ke publication realtime.
--   f) Buka penulisan, lalu lakukan analisis akar masalah sebelum
--      percobaan berikutnya.
--   Data asli tetap utuh sepanjang langkah 10 belum dijalankan; inilah
--   alasan penghapusan legacy ditunda.
-- =====================================================================