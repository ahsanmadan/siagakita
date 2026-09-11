-- Migration: Add Last Known Update Logistics Fleet Tracking columns
-- Supports periodic checkpoint reporting without high-frequency battery-draining GPS.

alter table public.distributions
  add column if not exists vehicle_code text default 'ARM-01',
  add column if not exists vehicle_name text default 'Truk Box Bantuan',
  add column if not exists last_location_name text default null,
  add column if not exists last_latitude numeric(9, 6) default null,
  add column if not exists last_longitude numeric(9, 6) default null,
  add column if not exists last_updated_at timestamptz default null,
  add column if not exists last_updated_by_role text default 'driver' check (last_updated_by_role in ('driver', 'officer', 'shelter', 'system')),
  add column if not exists driver_note text default null,
  add column if not exists checkpoint_history jsonb default '[]'::jsonb;

-- Populate default values for existing rows
update public.distributions
set
  vehicle_code = case
    when code = 'DST-2401' then 'ARM-01'
    when code = 'DST-2398' then 'ARM-02'
    when code = 'DST-2389' then 'ARM-03'
    else coalesce(vehicle_code, 'ARM-01')
  end,
  vehicle_name = case
    when code = 'DST-2401' then 'Truk Box Reaksi Cepat BPBD'
    when code = 'DST-2398' then 'Pickup Tanggap Darurat BPBD'
    when code = 'DST-2389' then 'Armada Logistik PMI Agam'
    else coalesce(vehicle_name, 'Truk Armada Bantuan')
  end,
  last_location_name = case
    when code = 'DST-2401' then 'Simpang Tembok, Bukittinggi'
    when code = 'DST-2398' then 'Gudang BPBD Agam (Persiapan)'
    when code = 'DST-2389' then 'Posko GOR Demak (Tiba)'
    else coalesce(last_location_name, 'Gudang Logistik')
  end,
  last_latitude = case
    when code = 'DST-2401' then -0.3120
    when code = 'DST-2398' then -0.3034
    when code = 'DST-2389' then -6.8920
    else last_latitude
  end,
  last_longitude = case
    when code = 'DST-2401' then 100.3780
    when code = 'DST-2398' then 100.3692
    when code = 'DST-2389' then 110.6370
    else last_longitude
  end,
  last_updated_at = case
    when code = 'DST-2401' then now() - interval '18 minutes'
    when code = 'DST-2398' then now() - interval '55 minutes'
    when code = 'DST-2389' then now() - interval '2 hours'
    else coalesce(last_updated_at, now() - interval '30 minutes')
  end,
  last_updated_by_role = case
    when code = 'DST-2389' then 'shelter'
    else 'driver'
  end,
  driver_note = case
    when code = 'DST-2401' then 'Lalu lintas Padang Luar - Bukittinggi padat merayap. Konvoi aman lancar.'
    when code = 'DST-2398' then 'Menunggu konfirmasi buka-tutup jalur longsor dari pos pantau.'
    when code = 'DST-2389' then 'Bantuan telah dibongkar dan diserahterimakan kepada koordinator posko.'
    else driver_note
  end,
  checkpoint_history = case
    when code = 'DST-2401' then jsonb_build_array(
      jsonb_build_object(
        'status', 'disiapkan',
        'location', 'Gudang BPBD Sumbar, Padang',
        'note', 'Muatan air bersih & pangan selesai dimuat ke armada.',
        'updated_by_role', 'officer',
        'created_at', (now() - interval '90 minutes')::text
      ),
      jsonb_build_object(
        'status', 'dalam-perjalanan',
        'location', 'Gerbang Tol Sicincin - Padang Panjang',
        'note', 'Armada bertolak menuju posko Agam via jalur Lembah Anai.',
        'updated_by_role', 'driver',
        'created_at', (now() - interval '45 minutes')::text
      ),
      jsonb_build_object(
        'status', 'dalam-perjalanan',
        'location', 'Simpang Tembok, Bukittinggi',
        'note', 'Lalu lintas Padang Luar - Bukittinggi padat merayap. Konvoi aman lancar.',
        'updated_by_role', 'driver',
        'created_at', (now() - interval '18 minutes')::text
      )
    )
    when code = 'DST-2398' then jsonb_build_array(
      jsonb_build_object(
        'status', 'disiapkan',
        'location', 'Gudang BPBD Agam',
        'note', 'Barang siap berangkat, menunggu konfirmasi akses jalan.',
        'updated_by_role', 'officer',
        'created_at', (now() - interval '55 minutes')::text
      )
    )
    when code = 'DST-2389' then jsonb_build_array(
      jsonb_build_object(
        'status', 'disiapkan',
        'location', 'Gudang BPBD Demak',
        'note', 'Paket higiene selesai dipacking.',
        'updated_by_role', 'officer',
        'created_at', (now() - interval '3 hours')::text
      ),
      jsonb_build_object(
        'status', 'dalam-perjalanan',
        'location', 'Jalur Pantura Demak',
        'note', 'Perjalanan lancar tanpa hambatan rob.',
        'updated_by_role', 'driver',
        'created_at', (now() - interval '2 hours')::text
      ),
      jsonb_build_object(
        'status', 'diterima',
        'location', 'Posko GOR Demak',
        'note', 'Bantuan diterima lengkap oleh penanggung jawab posko.',
        'updated_by_role', 'shelter',
        'created_at', (now() - interval '40 minutes')::text
      )
    )
    else coalesce(checkpoint_history, '[]'::jsonb)
  end
where code in ('DST-2401', 'DST-2398', 'DST-2389');
