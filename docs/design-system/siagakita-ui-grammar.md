# SiagaKita UI Grammar

SiagaKita harus terasa seperti pusat kendali bencana yang siap dipakai saat demo: jelas, tenang, cepat dibaca, dan tidak ramai oleh fitur yang tidak membantu keputusan.

---

## 1. Prinsip Utama

1. **Satu halaman, satu tugas utama.**
2. **Copy pendek, tegas, dan operasional.**
3. **Data kritis selalu muncul sebelum daftar panjang.**
4. **Status harus terbaca dari 3 lapis:** teks, warna token, dan posisi hierarki.
5. **Peta adalah konteks keputusan**, bukan sekadar elemen dekorasi latar.
6. **Empty state menjelaskan tindakan berikutnya**, bukan menyalahkan data kosong.

---

## 2. Anatomi Antarmuka

### A. Halaman Console / Internal Operator `(console)`
1. **Status strip:** Kondisi operasi paling penting (kejadian aktif, kebutuhan kritis, distribusi berjalan).
2. **Page header:** Breadcrumb, judul, deskripsi singkat, dan aksi utama.
3. **KPI row:** 3 sampai 4 `MetricCard` yang langsung membantu peran pengguna.
4. **Decision section:** Antrean yang butuh tindakan segera, rekomendasi sistem, atau status workflow.
5. **Data surface:** Tabel atau card list. Hindari mencampur terlalu banyak bentuk secara acak.
6. **Map/context panel:** Digunakan ketika lokasi spasial membantu keputusan.

### B. Halaman Peta Publik (`/peta-publik`)
1. **Peta Fullscreen:** MapLibre GL JS sebagai kanvas utama.
2. **Floating Controls (Mobile):** Search dan filter melayang di bagian atas dengan token `--radius-md` dan `--color-rule`.
3. **Bottom Sheet (Mobile):** Panel informasi posko & kejadian yang dapat di-drag dari bawah dengan rounded top `--radius-lg` dan gesture snap (*peek, compact, expanded*).
4. **Left Sidebar Panel (Desktop):** Panel pencarian, filter, dan list posko di sisi kiri dengan transisi collapse halus.
5. **Detail Sub-sidebar:** Panel detail posko/bencana yang muncul menyamping di desktop.

---

## 3. Komponen Inti

- **`OperationalCard`**: Panel kerja utama. Gunakan `emphasis="critical"` hanya untuk antrean tindakan darurat atau risiko tinggi.
- **`MetricCard`**: Angka indikator cepat. Label maksimal 3 kata, catatan tren maksimal 1 baris.
- **`CommandStrip`**: Satu baris aksi cepat untuk operasi aktif.
- **`SectionHeader`**: Header section kartu kecil yang konsisten.
- **`StatusStrip`**: Ringkasan status padat sebelum tabel/list data.
- **`FilterChipGroup`**: Filter status atau kategori (gunakan ini jika opsi $\le 5$).
- **`EmptyStatePanel`**: Ditampilkan saat data kosong dengan CTA tindakan berikutnya.
- **`Timeline`**: Jejak audit, verifikasi laporan, dan distribusi logistik.

---

## 4. Standar Visual & Tokens

- **Radius:** Gunakan `--radius-lg` (`1.125rem`) untuk container/panel utama; gunakan `--radius-md` (`0.75rem`) untuk card/tombol/search bar; gunakan `--radius-sm` (`0.5rem`) untuk badge/chip kecil.
- **Border & Rule:** Gunakan token `1px solid var(--color-rule)` (`oklch(0.91 0.008 252)`). **Dilarang memakai raw OKLCH hardcoded tanpa token.**
- **Shadow:** Gunakan shadow halus bertingkat (misal: `box-shadow: 0 8px 22px rgb(15 23 42 / 10%)` untuk floating controls dan `0 -4px 12px rgb(15 23 42 / 5%)` untuk bottom sheet).
- **Status Warna Semantik:**
  - `critical`: Merah (`--color-critical`) $\rightarrow$ butuh tindakan segera.
  - `major`: Oranye/Coral (`--color-major`) $\rightarrow$ dampak besar, terkendali.
  - `warning`: Amber (`--color-warning`) $\rightarrow$ perlu dipantau / stok menipis.
  - `safe`: Hijau (`--color-safe`) $\rightarrow$ aman, normal, atau selesai terkirim.
  - `info`: Biru (`--color-info`) $\rightarrow$ informasi kontekstual umum.

---

## 5. Standar Copywriting Operasional

Gunakan kata yang terdengar seperti operator lapangan:
* ✅ *Pusat Kendali*
* ✅ *Perlu tindakan*
* ✅ *Status lapangan*
* ✅ *Kebutuhan kritis*
* ✅ *Distribusi berjalan*
* ✅ *Jejak keputusan*
* ✅ *Antrean verifikasi*
* ✅ *Alokasi bantuan*

Hindari kata-kata generik / kaku:
* ❌ *Kelola data*
* ❌ *Lihat detail data*
* ❌ *Dashboard admin generik*
* ❌ *Simulasi gagal / Dummy test*
