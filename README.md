# SiagaKita

Pusat koordinasi tanggap darurat untuk KMIPN VIII 2026. Aplikasi menyatukan pemantauan kejadian, posko dan pengungsi, kebutuhan, logistik, laporan lapangan, serta peta publik dalam satu antarmuka berbasis Supabase lokal.

## Stack

- Next.js 16 App Router, React 19, dan TypeScript
- Tailwind CSS v4 dan shadcn/ui
- MapLibre GL JS dengan style Stadia Maps
- Local Supabase PostgreSQL, Auth, RLS, seed data, dan audit log
- Poppins melalui `next/font/google`
- Hallmark project-scoped di `.codex/skills/hallmark`

## Menjalankan Proyek

1. Salin `.env.example` menjadi `.env.local`.
2. Isi `NEXT_PUBLIC_STADIA_MAPS_API_KEY` untuk mengaktifkan peta.
3. Jalankan `npx supabase start`, lalu salin `anon key` ke `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Jalankan `pnpm install`.
5. Jalankan `pnpm dev` dan buka `http://localhost:3000`.

Validasi produksi:

```bash
pnpm lint
pnpm build
```

## Route Utama

- `/login`
- `/dashboard`
- `/kejadian/evt-sumbar-001`
- `/posko`
- `/logistik`
- `/laporan`
- `/peta-publik`

Data pengembangan tersimpan di Supabase lokal melalui migration dan seed. SMS Zero-Grid dan rekomendasi AI masih berupa adapter/decision support pengembangan, bukan integrasi layanan eksternal.

## Sistem Desain dan Artefak

- `design.md` adalah sumber aturan visual utama.
- `tokens.css` berisi token desain Hallmark.
- `.hallmark/` menyimpan preflight dan log struktur desain.
- `docs/backend-local-supabase.md` berisi panduan backend lokal, akun pengembangan, dan status integrasi.

## Backend

Backend MVP memakai Supabase PostgreSQL lokal dengan Auth, Row Level Security, public-safe views, repository data, server actions, dan audit log. Lihat `docs/backend-local-supabase.md`.

Untuk deployment publik, rotasi API key Stadia yang dipakai saat pengembangan dan gunakan domain-based authentication.
