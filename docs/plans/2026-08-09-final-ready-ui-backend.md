# SiagaKita Final-Ready UI/UX + Backend Pass

## Fokus

SiagaKita diarahkan menjadi command center tanggap darurat yang mudah dijelaskan ke juri dan cukup serius secara backend. UI tetap memakai identitas Poppins, navy-teal-red, shadcn/ui, dan gaya technical utilitarian sesuai `design.md`.

## Alur Demo Utama

1. Operator login ke console internal.
2. Operator membuka `/dashboard` untuk melihat prioritas kejadian, posko, distribusi, dan rekomendasi rule-based.
3. Petugas memproses `/laporan`: buat laporan, verifikasi, lalu buka kejadian dari laporan valid.
4. Operator membuka `/kejadian/[id]` untuk melihat peta, eskalasi, timeline, lembaga, dan rekomendasi.
5. Pengelola memperbarui `/posko`: populasi, kelompok rentan, dan kebutuhan.
6. Manajer gudang mengelola `/logistik`: alokasi stok, distribusi berjalan, dan konfirmasi diterima.
7. Masyarakat melihat `/peta-publik` dengan data yang sudah disaring.

## Keputusan UI/UX

- Setiap halaman operasional memakai `WorkflowNarrative`: tujuan halaman, data masuk, aksi user, dan hasil sistem.
- Notifikasi dummy di shell dinetralkan agar tidak mengklaim angka palsu.
- Motion tetap ringan dan berbasis `motion/react`, dengan fallback `useReducedMotion`.
- Tabel tetap ada di desktop, tetapi halaman penting tetap punya pola kartu pada layar sempit.
- Copy diarahkan ke bahasa operasional: data tersimpan, audit, rekomendasi rule-based, dan Supabase lokal.

## Keputusan Backend

- Server actions dibuat eksplisit untuk flow final: `createFieldReport`, `verifyFieldReport`, `openEventFromReport`, `updateShelterPopulation`, `createNeedRequest`, `allocateDistribution`, `confirmDistributionReceived`, dan `reviewRecommendation`.
- Mutasi penting menulis `audit_logs` melalui `writeAuditLog`.
- Migration hardening baru dibuat tanpa mengedit migration awal.
- RLS diperketat dengan helper role dan akses lembaga, posko, serta gudang.
- Repository domain disiapkan untuk tahap berikutnya: `events`, `reports`, `shelters`, `logistics`, `public-map`, dan `recommendations`.

## Verifikasi Saat Ini

- `pnpm lint`: lulus.
- `pnpm exec tsc --noEmit`: lulus.
- `pnpm build`: lulus.
- `supabase start`: belum bisa dijalankan karena Docker daemon `dockerDesktopLinuxEngine` belum aktif.

## Catatan Demo

Jika Supabase lokal bermasalah saat demo, jalankan Docker Desktop terlebih dahulu, lalu ulangi `npx supabase start` dan `npx supabase db reset`. Jangan klaim SMS gateway atau AI eksternal sudah terhubung; gunakan istilah adapter/stub dan rule-based decision support.
