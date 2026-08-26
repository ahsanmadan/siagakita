# Backend Local Supabase

SiagaKita sekarang memakai Supabase lokal sebagai backend MVP real untuk Auth, PostgreSQL, RLS, seed data, dan audit log.

## Menjalankan Backend

1. Pastikan Docker Desktop berjalan dengan Linux engine aktif.
2. Jalankan dari folder `siagakita`:

```bash
npx supabase start
```

3. Salin nilai `API URL` dan `anon key` dari output CLI ke `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-dari-supabase-start>
```

4. Reset database dan seed ulang bila perlu:

```bash
npx supabase db reset
```

## Akun Pengembangan

Semua akun memakai kata sandi `siagakita123`.

| Email | Role |
| --- | --- |
| `operator@siagakita.local` | Operator BPBD |
| `lapangan@siagakita.local` | Petugas Lapangan |
| `posko@siagakita.local` | Pengelola Posko |
| `gudang@siagakita.local` | Pengelola Gudang |

## Catatan Integrasi

- SMS Zero-Grid saat ini adalah adapter manual yang mencatat input ke tabel `field_reports`; SMS gateway eksternal belum terhubung.
- Rekomendasi saat ini adalah decision support berbasis aturan dari data posko, stok, kebutuhan, kelompok rentan, dan akses lokasi. AI eksternal belum menjadi dasar keputusan operasional.
- Peta publik membaca view aman `public_event_summary` dan `public_shelter_summary`.
- Data identitas korban, stok rinci, rute internal, dan audit log tidak ditampilkan di peta publik.
