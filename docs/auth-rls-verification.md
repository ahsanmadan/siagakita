# Auth & RLS Verification

Tanggal verifikasi: 9 Agustus 2026

## Akun Role Pengembangan

Semua akun di bawah sudah terdaftar di Supabase Auth dan tersambung ke tabel `profiles`.

| Email | Role | Institusi |
| --- | --- | --- |
| `operator@siagakita.local` | `bpbd_operator` | BPBD Sumatera Barat |
| `lapangan@siagakita.local` | `field_officer` | TNI Kodim 0304 |
| `posko@siagakita.local` | `shelter_manager` | PMI Kabupaten Agam |
| `gudang@siagakita.local` | `warehouse_manager` | Dinas Sosial |

Password pengembangan saat ini: `SiagaKitaDemo2026!`

## Hasil Uji Auth

Uji dilakukan lewat Supabase Auth REST password grant menggunakan anon key dari `.env.local`.

| Akun | Status |
| --- | --- |
| `operator@siagakita.local` | Login OK, role `bpbd_operator` terbaca dari `app_metadata` |
| `lapangan@siagakita.local` | Login OK, role `field_officer` terbaca dari `app_metadata` |
| `posko@siagakita.local` | Login OK, role `shelter_manager` terbaca dari `app_metadata` |
| `gudang@siagakita.local` | Login OK, role `warehouse_manager` terbaca dari `app_metadata` |

Catatan perbaikan: kolom token Auth untuk akun pengembangan dinormalisasi ke string kosong agar Supabase Auth tidak gagal dengan error 500 saat login.

## Hasil Uji RLS

| Skenario | Hasil |
| --- | --- |
| Anonymous membaca `public_event_summary` | OK, status 200 |
| Anonymous membaca `select *` tabel dasar `shelters` | Diblokir, status 401 |
| Anonymous membaca kolom aman `shelters` | OK, hanya kolom publik aman |
| Anonymous membaca `select *` tabel dasar `disaster_events` | Diblokir, status 401 |
| Operator membaca profil sendiri | OK, status 200 |
| Shelter manager membaca data posko tugasnya | OK, hanya posko institusi terkait yang tampil |
| Shelter manager mencoba update `inventory_items` | Diblokir oleh RLS, response `[]` |
| Warehouse manager membaca stok gudang tugasnya | OK, hanya stok gudang terkait yang tampil |
| Warehouse manager mencoba update `shelters` | Diblokir oleh RLS, response `[]` |

## Catatan Keamanan

- Role aplikasi disimpan di `raw_app_meta_data.app_role` dan tabel `profiles`, bukan di `raw_user_meta_data`.
- Public map menggunakan view `public_event_summary` dan `public_shelter_summary` dengan `security_invoker=true`.
- Role `anon` hanya diberi column-level grant untuk kolom publik aman yang dibutuhkan view, bukan akses `select *` ke tabel dasar.
- View publik hanya berisi kolom aman: tidak ada identitas korban, detail kelompok rentan, stok rinci, rute internal, atau audit internal.

## Sisa Hardening

- Supabase security advisor masih memberi warning untuk function `allocate_distribution_atomic` karena memakai `SECURITY DEFINER`. Function ini sudah mengecek role `admin`, `bpbd_operator`, dan `warehouse_manager` di dalam body, tetapi hardening berikutnya perlu menguji apakah function bisa dipindah ke `SECURITY INVOKER` tanpa mematahkan alokasi stok atomik.
- Supabase Auth leaked password protection masih disabled di level project. Ini perlu diaktifkan dari dashboard Supabase Auth sebelum production publik.
