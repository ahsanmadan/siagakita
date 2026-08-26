insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'operator@siagakita.local', crypt('siagakita123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"app_role":"bpbd_operator"}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lapangan@siagakita.local', crypt('siagakita123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"app_role":"field_officer"}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'posko@siagakita.local', crypt('siagakita123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"app_role":"shelter_manager"}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gudang@siagakita.local', crypt('siagakita123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"app_role":"warehouse_manager"}', '{}', now(), now())
on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  raw_app_meta_data = excluded.raw_app_meta_data,
  updated_at = now();

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'operator@siagakita.local', '{"sub":"00000000-0000-4000-8000-000000000001","email":"operator@siagakita.local"}', 'email', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'lapangan@siagakita.local', '{"sub":"00000000-0000-4000-8000-000000000002","email":"lapangan@siagakita.local"}', 'email', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 'posko@siagakita.local', '{"sub":"00000000-0000-4000-8000-000000000003","email":"posko@siagakita.local"}', 'email', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004', 'gudang@siagakita.local', '{"sub":"00000000-0000-4000-8000-000000000004","email":"gudang@siagakita.local"}', 'email', now(), now(), now())
on conflict (provider_id, provider) do update set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  updated_at = now();

insert into public.profiles (id, full_name, email, app_role) values
  ('00000000-0000-4000-8000-000000000001', 'Operator BPBD', 'operator@siagakita.local', 'bpbd_operator'),
  ('00000000-0000-4000-8000-000000000002', 'Petugas Lapangan', 'lapangan@siagakita.local', 'field_officer'),
  ('00000000-0000-4000-8000-000000000003', 'Pengelola Posko', 'posko@siagakita.local', 'shelter_manager'),
  ('00000000-0000-4000-8000-000000000004', 'Pengelola Gudang', 'gudang@siagakita.local', 'warehouse_manager')
on conflict (id) do update set full_name = excluded.full_name, app_role = excluded.app_role;

insert into public.institutions (id, name, role, contact_status) values
  ('20000000-0000-4000-8000-000000000001', 'BPBD Sumatera Barat', 'Komando dan koordinasi', 'aktif'),
  ('20000000-0000-4000-8000-000000000002', 'TNI Kodim 0304', 'Akses dan distribusi', 'aktif'),
  ('20000000-0000-4000-8000-000000000003', 'PMI Kabupaten Agam', 'Kesehatan dan relawan', 'aktif'),
  ('20000000-0000-4000-8000-000000000004', 'Dinas Sosial', 'Logistik pengungsian', 'menunggu')
on conflict (id) do update set name = excluded.name, role = excluded.role, contact_status = excluded.contact_status;

insert into public.user_institutions (user_id, institution_id) values
  ('00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004')
on conflict do nothing;

insert into public.disaster_events (id, code, name, disaster_type, location, province, status, state, escalation_level, latitude, longitude, affected_people, active_shelters, summary, created_by, updated_at) values
  ('30000000-0000-4000-8000-000000000001', 'evt-sumbar-001', 'Banjir Bandang Agam', 'Banjir bandang', 'Kabupaten Agam', 'Sumatera Barat', 'critical', 'active', 'Provinsi', -0.3034, 100.3692, 2840, 7, 'Akses dua nagari terputus dan kebutuhan air bersih meningkat cepat.', '00000000-0000-4000-8000-000000000001', now() - interval '10 minutes'),
  ('30000000-0000-4000-8000-000000000002', 'evt-jateng-002', 'Banjir Pesisir Demak', 'Banjir rob', 'Kabupaten Demak', 'Jawa Tengah', 'major', 'active', 'Kabupaten', -6.8948, 110.6384, 1730, 5, 'Genangan meluas pada permukiman pesisir dan jalur distribusi melambat.', '00000000-0000-4000-8000-000000000001', now() - interval '24 minutes'),
  ('30000000-0000-4000-8000-000000000003', 'evt-ntt-003', 'Kekeringan Timor Tengah', 'Kekeringan', 'Timor Tengah Selatan', 'Nusa Tenggara Timur', 'warning', 'active', 'Kabupaten', -9.7763, 124.4198, 920, 2, 'Pasokan air bersih terbatas pada empat desa terdampak.', '00000000-0000-4000-8000-000000000001', now() - interval '1 hour')
on conflict (code) do update set status = excluded.status, state = excluded.state, affected_people = excluded.affected_people, active_shelters = excluded.active_shelters, updated_at = excluded.updated_at;

insert into public.event_status_history (event_id, next_status, next_escalation, note, created_by, created_at) values
  ('30000000-0000-4000-8000-000000000001', 'critical', 'Provinsi', 'Status awal pengembangan untuk kejadian prioritas.', '00000000-0000-4000-8000-000000000001', now() - interval '2 hours')
on conflict do nothing;

insert into public.shelters (id, code, event_id, institution_id, name, location, status, latitude, longitude, capacity, population_total, children, elderly, pregnant, disability, last_update) values
  ('40000000-0000-4000-8000-000000000001', 'psk-001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'Posko SDN 04 Sungai Pua', 'Sungai Pua, Agam', 'critical', -0.3639, 100.4008, 650, 612, 142, 83, 21, 17, now() - interval '8 minutes'),
  ('40000000-0000-4000-8000-000000000002', 'psk-002', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'Posko Balai Nagari Bukik Batabuah', 'Canduang, Agam', 'major', -0.3280, 100.4170, 500, 438, 96, 54, 14, 9, now() - interval '17 minutes'),
  ('40000000-0000-4000-8000-000000000003', 'psk-003', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000004', 'Posko GOR Demak', 'Demak Kota', 'warning', -6.8920, 110.6370, 900, 680, 151, 72, 19, 12, now() - interval '31 minutes')
on conflict (code) do update set status = excluded.status, population_total = excluded.population_total, last_update = excluded.last_update;

insert into public.needs (id, shelter_id, item, category, requested, available, unit, urgency) values
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Air minum', 'Pangan', 1800, 420, 'liter', 'critical'),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'Selimut', 'Sandang', 300, 190, 'unit', 'major'),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', 'Makanan siap saji', 'Pangan', 1300, 760, 'porsi', 'major'),
  ('50000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000002', 'Obat umum', 'Kesehatan', 120, 90, 'paket', 'warning'),
  ('50000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000003', 'Paket kebersihan', 'Higiene', 500, 340, 'paket', 'warning')
on conflict (id) do update set requested = excluded.requested, available = excluded.available, urgency = excluded.urgency;

insert into public.warehouses (id, institution_id, name, level, location) values
  ('60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Gudang BPBD Agam', 'Kabupaten', 'Agam'),
  ('60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Gudang BPBD Sumbar', 'Provinsi', 'Padang'),
  ('60000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004', 'Gudang Dinkes Sumbar', 'Provinsi', 'Padang'),
  ('60000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'Gudang BPBD Demak', 'Kabupaten', 'Demak')
on conflict (id) do update set name = excluded.name, level = excluded.level;

insert into public.inventory_items (id, warehouse_id, item, category, stock, reserved, unit, status) values
  ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'Air minum', 'Pangan', 3200, 2500, 'liter', 'critical'),
  ('70000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', 'Makanan siap saji', 'Pangan', 6800, 2100, 'porsi', 'safe'),
  ('70000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000001', 'Selimut', 'Sandang', 740, 410, 'unit', 'warning'),
  ('70000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000003', 'Obat umum', 'Kesehatan', 460, 190, 'paket', 'safe')
on conflict (id) do update set stock = excluded.stock, reserved = excluded.reserved, status = excluded.status;

insert into public.distributions (id, code, destination_shelter_id, origin_warehouse_id, cargo_summary, eta, progress, status, institution, created_by) values
  ('80000000-0000-4000-8000-000000000001', 'DST-2401', '40000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', 'Air 1.200 L, makanan 900 porsi', '32 menit', 68, 'dalam-perjalanan', 'BPBD + TNI', '00000000-0000-4000-8000-000000000001'),
  ('80000000-0000-4000-8000-000000000002', 'DST-2398', '40000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', 'Selimut 180 unit', 'Menunggu akses', 22, 'disiapkan', 'BPBD Agam', '00000000-0000-4000-8000-000000000001'),
  ('80000000-0000-4000-8000-000000000003', 'DST-2389', '40000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000004', 'Paket higiene 240 unit', 'Diterima 09.42', 100, 'diterima', 'BPBD + PMI', '00000000-0000-4000-8000-000000000001')
on conflict (code) do update set progress = excluded.progress, status = excluded.status, eta = excluded.eta;

insert into public.field_reports (id, code, channel, location, reporter, received_at, summary, status, severity, created_by) values
  ('90000000-0000-4000-8000-000000000001', 'LPR-1048', 'SMS Zero-Grid', 'Nagari Aia Angek', 'Warga terverifikasi', now() - interval '18 minutes', 'Jembatan penghubung terputus, 34 keluarga belum mendapat air.', 'baru', 'critical', null),
  ('90000000-0000-4000-8000-000000000002', 'LPR-1047', 'Petugas', 'Sungai Pua', 'Tim Reaksi Cepat 02', now() - interval '34 minutes', 'Akses kendaraan ringan dibuka satu arah.', 'diverifikasi', 'warning', '00000000-0000-4000-8000-000000000002'),
  ('90000000-0000-4000-8000-000000000003', 'LPR-1043', 'Web', 'Canduang', 'Pengelola posko', now() - interval '1 hour', 'Tambahan 61 pengungsi tiba di balai nagari.', 'ditindaklanjuti', 'major', '00000000-0000-4000-8000-000000000003')
on conflict (code) do update set status = excluded.status, severity = excluded.severity, updated_at = now();

insert into public.third_party_aids (source_name, cargo, quantity, unit, status, warehouse_id, created_by) values
  ('PT Nusantara Sehat', 'Paket kesehatan', 300, 'paket', 'menunggu-pencocokan', '60000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004'),
  ('Relawan Ranah Minang', 'Air minum', 1500, 'liter', 'diterima-gudang', '60000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000004'),
  ('Forum UMKM Agam', 'Makanan siap saji', 800, 'porsi', 'dialokasikan', '60000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004');

insert into public.ai_recommendations (id, event_id, shelter_id, title, rationale, confidence, priority, action, factors, source) values
  ('a0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Prioritaskan air bersih ke Sungai Pua', 'Stok hanya memenuhi sekitar seperempat kebutuhan dan terdapat 225 orang kelompok rentan.', 88, 'critical', 'Alokasikan 1.200 liter dari gudang provinsi', array['Kekurangan stok', 'Kelompok rentan', 'Akses terbatas'], 'rule-based'),
  ('a0000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', null, 'Naikkan eskalasi stok selimut', 'Cadangan kabupaten mendekati batas minimum setelah dua pengiriman aktif.', 81, 'major', 'Ajukan dukungan gudang provinsi', array['Batas minimum', 'Permintaan aktif'], 'rule-based')
on conflict (id) do update set rationale = excluded.rationale, confidence = excluded.confidence;

insert into public.audit_logs (actor_id, action, target_table, target_id, after_data) values
  ('00000000-0000-4000-8000-000000000001', 'seed.initialized', 'system', null, '{"source":"local-development"}');
