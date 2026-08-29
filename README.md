# SiagaKita (SI-TANGGAP KRISIS)

Pusat koordinasi tanggap darurat bencana dan logistik kemanusiaan untuk **KMIPN VIII 2026**. Aplikasi menyatukan pemantauan kejadian, posko & pengungsi, kebutuhan mendesak, inventaris logistik, laporan lapangan, serta peta publik dalam satu antarmuka terintegrasi.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling & UI:** Tailwind CSS v4, shadcn/ui, Hallmark Design Tokens
- **Peta & GIS:** MapLibre GL JS & OpenFreeMap
- **Database & Auth:** Supabase PostgreSQL (Auth, Row Level Security, RPC Atomik, Realtime, Audit Trail)
- **Animasi & Transisi:** `transitions.dev` micro-transitions
- **Font:** Plus Jakarta Sans (`next/font/google`) & Inter

---

## 🚀 Menjalankan Proyek

### 1. Prasyarat
Pastikan sudah terpasang **Node.js (>= 20)** dan **pnpm**.

### 2. Instalasi Dependensi
```bash
pnpm install
```

### 3. Konfigurasi Environment
Salin file environment contoh:
```bash
cp .env.example .env.local
```
Lalu lengkapi kredensial Supabase (`NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

### 4. Menjalankan Server Development
```bash
pnpm dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser.

### 5. Validasi & Pengujian Kode
```bash
# Validasi TypeScript
npx tsc --noEmit

# Validasi Linter
pnpm lint

# Validasi Build Production
pnpm build
```

---

## 🗺️ Rute Utama Aplikasi

### 1. Antarmuka Publik
- `/peta-publik` — Peta interaktif publik, lokasi posko aman, dan sebaran bencana real-time.
- `/login` — Halaman autentikasi petugas dan operator.

### 2. Antarmuka Pusat Kendali `(console)`
- `/dashboard` — Ringkasan metrik krisis dan situasi terkini.
- `/kejadian` & `/kejadian/[id]` — Detail penanganan dan eskalasi kejadian bencana.
- `/posko` — Manajemen data posko, kapasitas pengungsi, dan kelompok rentan.
- `/logistik` — Manajemen stok gudang, alokasi bantuan, dan tracking armada distribusi.
- `/laporan` — Antrean verifikasi laporan warga dan laporan SMS Zero-Grid.
- `/audit-log` — Jejak keputusan dan log transparansi perubahan data.

---

## 📚 Dokumentasi & Standar Arsitektur

- **`DESIGN.md`** — *Single Source of Truth* untuk desain antarmuka, UX, dan identitas visual.
- **`AGENTS.md`** — Panduan eksekusi perintah Windows & anti-looping rule untuk AI coding agents.
- **`tokens.css`** — Definisi token warna, radius, dan spasi desain Hallmark.
- **`docs/database.md`** — Dokumentasi skema tabel, enum, relasi, dan kebijakan RLS Supabase.
- **`docs/integration-status.md`** — Batas dan status integrasi fitur (SMS Zero-Grid, Decision Support, Data Publik).
- **`docs/design-system/siagakita-ui-grammar.md`** — Panduan komponen operasional dan standar copy UI.
