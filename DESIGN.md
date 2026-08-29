# DESIGN.md

## 1. Purpose

Dokumen ini adalah **single source of truth** untuk desain UI/UX aplikasi **SiagaKita** dalam proyek **SI-TANGGAP KRISIS**.

File ini ditujukan untuk dibaca oleh manusia dan agen AI agar:

- desain antarmuka konsisten,
- implementasi UI tetap selaras dengan konteks KMIPN,
- prototipe tidak melenceng dari karakter sistem tanggap bencana,
- keputusan desain tidak perlu diulang di setiap prompt.

## 2. Product Summary

**SiagaKita** adalah nama aplikasi digital dari proyek **SI-TANGGAP KRISIS**, yaitu sistem E-Government untuk koordinasi penanganan bencana, terutama pada fase tanggap darurat dan distribusi bantuan.

Fokus produk:

- pelaporan bencana,
- verifikasi dan pembukaan kejadian,
- pengelolaan posko,
- pendataan pengungsi dan kelompok rentan,
- manajemen kebutuhan dan stok logistik,
- rekomendasi prioritas bantuan,
- distribusi dan monitoring bantuan,
- Zero-Grid Reporting melalui SMS,
- dashboard pusat kendali krisis,
- audit log dan transparansi publik terbatas.

### Naming rule

- **Nama aplikasi / brand UI:** `SiagaKita`
- **Nama proyek / konsep formal:** `SI-TANGGAP KRISIS`
- Pada layar aplikasi, login, navbar, heading utama, dan elemen branding, gunakan nama **SiagaKita**.
- Pada proposal, dokumen formal, dan deskripsi konsep sistem, tetap gunakan **SI-TANGGAP KRISIS** bila konteksnya konseptual atau akademik.

## 3. Product Form

### Primary platform

- Produk utama adalah **web application**.
- Prototipe utama dikembangkan sebagai **web dashboard berbasis Next.js**.
- Mobile native adalah pengembangan lanjutan.
- Akses mobile untuk tahap awal diakomodasi melalui layout web responsif.

### Why web-first

- Aktor utama sistem adalah operator BPBD, pengelola gudang, pengelola posko, dan petugas lapangan.
- Sistem sangat bergantung pada dashboard, peta, tabel, validasi, dan monitoring lintas data.
- Struktur command center lebih kuat secara visual dan operasional dalam bentuk web.

## 4. Core Users And Roles

- **Masyarakat / Korban**
  - kirim laporan,
  - lihat status laporan,
  - lihat posko dan peta publik,
  - lihat informasi bantuan yang aman untuk publik.
- **Petugas Lapangan**
  - verifikasi laporan,
  - input kondisi lapangan,
  - input data pengungsi dan kelompok rentan,
  - update kebutuhan posko.
- **Pengelola Posko**
  - kelola data posko,
  - update jumlah pengungsi,
  - update kebutuhan dan stok,
  - konfirmasi penerimaan bantuan.
- **Operator BPBD / Pusat Kendali**
  - buka kejadian,
  - tetapkan level kejadian,
  - lihat rekomendasi prioritas,
  - setujui alokasi bantuan,
  - monitor seluruh wilayah terdampak.
- **Pengelola Gudang**
  - lihat permintaan bantuan,
  - kelola stok,
  - siapkan pengiriman,
  - update status distribusi.
- **Lembaga Mitra / Relawan / NGO**
  - input bantuan pihak ketiga,
  - menerima assignment tertentu,
  - melihat data sesuai izin.
- **Administrator Sistem**
  - kelola role,
  - kelola hak akses,
  - audit,
  - konfigurasi sistem.

## 5. Main Operational Flows

UI harus mendukung 4 alur MVP berikut.

### 5.1 Laporan dan Intake

- laporan web,
- laporan mobile web,
- laporan SMS Zero-Grid,
- deduplikasi laporan,
- status awal laporan.

### 5.2 Verifikasi, Pembukaan, dan Eskalasi Kejadian

- verifikasi laporan,
- pembukaan kejadian resmi,
- penetapan level kejadian,
- eskalasi otoritas jika kapasitas lokal tidak cukup.

### 5.3 Posko, Pengungsi, Kelompok Rentan, dan Kebutuhan

- registrasi posko,
- input jumlah pengungsi,
- input kelompok rentan,
- input kondisi akses,
- input kebutuhan mendesak,
- hitung kebutuhan berbasis data dasar.

### 5.4 Distribusi, Bantuan Masuk, dan Monitoring

- stok gudang,
- alokasi bantuan,
- tracking distribusi,
- konfirmasi penerimaan,
- pencatatan bantuan pihak ketiga,
- dashboard publik vs dashboard internal.

## 6. Supporting Flows

Walau bukan fokus MVP pertama, UI harus siap diperluas untuk:

- penutupan kejadian,
- transisi ke pemulihan/rehabilitasi,
- assignment tugas antar-lembaga,
- audit log keputusan,
- transparansi distribusi publik,
- monitoring performa penanganan.

## 7. Information Architecture

### Recommended main pages

1. `Login`
2. `Dashboard Pusat Kendali`
3. `Kejadian Bencana`
4. `Detail Kejadian / Map Monitoring`
5. `Posko, Pengungsi, dan Kebutuhan`
6. `Logistik dan Distribusi`
7. `Laporan dan Zero-Grid`
8. `Bantuan Pihak Ketiga`
9. `Audit Log`
10. `Peta Publik`

### MVP page priority

Jika prototipe dipersempit, prioritaskan:

1. `Login`
2. `Dashboard Pusat Kendali`
3. `Detail Kejadian / Map Monitoring`
4. `Posko, Pengungsi, dan Kebutuhan`
5. `Logistik dan Distribusi`
6. `Laporan dan Zero-Grid`

## 8. Visual Direction

### Design reference adaptation

Referensi visual yang dibahas memiliki kualitas berikut:

- map-centric dashboard,
- glassmorphism ringan,
- panel mengambang,
- filter berbentuk pill,
- KPI strip,
- tabel operasional,
- nuansa modern enterprise.

### Important adaptation for SI-TANGGAP KRISIS

Jangan menyalin referensi secara mentah.

Gunakan struktur visualnya, tetapi ubah karakter UI agar:

- lebih tegas,
- lebih formal,
- lebih operasional,
- lebih cocok untuk command center pemerintah,
- tetap modern dan rapi,
- tidak terasa seperti dashboard supply chain premium generik.

### Brand feeling

Gunakan arah rasa:

- **resmi dan tegas** sebagai fondasi,
- ditambah **cepat tanggap** sebagai aksen status,
- hindari nuansa terlalu pastel atau terlalu dekoratif.

## 9. Design Tokens

### 9.1 Color tokens

#### Core neutrals

- `--bg-app: #ECF2EE`
- `--bg-surface: rgba(255, 255, 255, 0.72)`
- `--bg-surface-strong: rgba(255, 255, 255, 0.88)`
- `--bg-surface-solid: #F8FBF8`
- `--line-soft: rgba(33, 52, 46, 0.10)`
- `--line-medium: rgba(33, 52, 46, 0.16)`
- `--text-primary: #1F2B27`
- `--text-secondary: #52635E`
- `--text-muted: #7A8A85`

#### Brand and map colors

- `--brand-primary: #184E77`
- `--brand-secondary: #2A9D8F`
- `--brand-accent: #7CC6D9`
- `--map-water: #8FC8D8`
- `--map-land: #A7B48F`

#### Status colors

- `--status-safe: #3FCF8E`
- `--status-info: #2F80ED`
- `--status-warning: #E5B93C`
- `--status-major: #F39B31`
- `--status-critical: #D9534F`
- `--status-danger-deep: #9F2D2A`

### 9.6 Status behavior tokens

- `critical`
  - gunakan `--status-critical` atau `--status-danger-deep`
  - harus paling menonjol secara visual
  - tampil di area atas, map layer utama, atau panel prioritas
  - harus selalu disertai label teks
- `major`
  - gunakan `--status-major`
  - tampil jelas tetapi di bawah critical
  - cocok untuk risiko tinggi yang masih bisa ditangani
- `warning`
  - gunakan `--status-warning`
  - dipakai untuk kebutuhan waspada atau stok menipis
- `info`
  - gunakan `--status-info`
  - dipakai untuk status netral, progress, atau informasi umum
- `safe`
  - gunakan `--status-safe`
  - dipakai untuk status aman atau selesai
  - tidak boleh lebih dominan daripada status critical atau major

#### Public transparency colors

- `--glass-white: rgba(255, 255, 255, 0.64)`
- `--glass-highlight: rgba(255, 255, 255, 0.46)`
- `--glass-border: rgba(255, 255, 255, 0.35)`

### 9.2 Typography tokens

- `--font-sans: "Plus Jakarta Sans", "Inter", "Segoe UI", sans-serif`
- `--font-mono: "JetBrains Mono", "Consolas", monospace`

- `--text-display: 40px`
- `--text-h1: 32px`
- `--text-h2: 24px`
- `--text-h3: 20px`
- `--text-h4: 18px`
- `--text-body-lg: 16px`
- `--text-body: 14px`
- `--text-sm: 12px`
- `--text-xs: 11px`

- `--weight-regular: 400`
- `--weight-medium: 500`
- `--weight-semibold: 600`
- `--weight-bold: 700`

- `--leading-tight: 1.2`
- `--leading-normal: 1.5`
- `--leading-relaxed: 1.65`

### 9.3 Spacing tokens

- `--space-1: 4px`
- `--space-2: 8px`
- `--space-3: 12px`
- `--space-4: 16px`
- `--space-5: 20px`
- `--space-6: 24px`
- `--space-8: 32px`
- `--space-10: 40px`
- `--space-12: 48px`

### 9.4 Radius tokens

- `--radius-sm: 10px`
- `--radius-md: 16px`
- `--radius-lg: 22px`
- `--radius-xl: 28px`
- `--radius-pill: 999px`

### 9.5 Shadow and blur tokens

- `--shadow-soft: 0 10px 30px rgba(23, 43, 37, 0.08)`
- `--shadow-card: 0 14px 40px rgba(23, 43, 37, 0.10)`
- `--shadow-floating: 0 18px 44px rgba(23, 43, 37, 0.14)`
- `--blur-glass: 16px`

## 10. Typography Rules

- Gunakan sans-serif modern yang mudah dibaca.
- Prioritaskan **Plus Jakarta Sans** sebagai font utama seluruh UI.
- Judul dashboard harus tegas dan jelas, bukan dekoratif.
- KPI angka harus dominan, bersih, dan sangat mudah dipindai.
- Teks tabel dan label status harus mengutamakan keterbacaan.
- Jangan memakai font bergaya futuristik, condensed ekstrem, atau display eksperimental.

### Hierarchy

- `Page title`: ukuran `--text-h1` atau `--text-h2`, bobot `--weight-semibold`
- `Section title`: ukuran `--text-h3`, bobot `--weight-semibold`
- `KPI value`: ukuran besar sesuai konteks, bobot `--weight-semibold`; pakai `--weight-bold` hanya untuk angka prioritas tinggi.
- `Card label`: ukuran `--text-sm`, bobot `--weight-medium`
- `Body`: ukuran `--text-body`, bobot `--weight-regular`
- `Micro label`: ukuran `--text-xs`, bobot `--weight-medium`
- `Primary CTA`: bobot `--weight-bold`

## 11. Layout Rules

### Global layout

- Gunakan layout dashboard lebar dengan struktur modular.
- Halaman internal desktop adalah prioritas pertama.
- Komposisi utama:
  - top navigation,
  - filter bar,
  - map or primary monitoring area,
  - KPI cards,
  - operational table,
  - side summary or action panel.

### Map-first dashboard

- Map adalah elemen utama pada halaman pusat kendali dan detail kejadian.
- Panel detail boleh mengambang di atas map.
- Ringkasan numerik ditempatkan tepat di bawah atau di samping map.
- Marker harus dapat dibedakan jelas berdasarkan status.

### Responsive behavior

- Desktop: map luas + panel samping + ringkasan horizontal.
- Tablet: map tetap dominan, panel diringkas.
- Mobile: susun vertikal, map ringkas, tabel diganti list card.

## 12. Component Design Rules

### 12.1 Cards

Karakter card:

- rounded besar,
- semi-transparan,
- blur ringan,
- border tipis,
- shadow halus,
- isi lega dan terstruktur.

Gunakan untuk:

- KPI,
- status kejadian,
- detail posko,
- panel bantuan,
- summary statistik.

### 12.2 Buttons

Jenis tombol utama:

- `Primary CTA`
- `Secondary`
- `Ghost`
- `Icon button`
- `Filter pill`

#### Primary CTA

- solid atau semi-solid,
- kontras tinggi,
- digunakan untuk aksi penting seperti `Verifikasi`, `Setujui`, `Kirim`, `Konfirmasi`.

#### Secondary

- lebih ringan,
- tetap jelas,
- untuk aksi pendukung.

#### Ghost / Tertiary

- dipakai untuk aksi minor,
- jangan terlalu dominan.

#### Icon button

- bentuk lingkaran atau rounded-square,
- ukuran konsisten,
- dipakai untuk zoom map, share, detail, export, filter quick action.

#### Filter pill

- bentuk `radius-pill`,
- background glass atau surface terang,
- border tipis,
- teks singkat dan jelas.

### 12.3 Tables

- Tabel harus rapi, ringan, dan operasional.
- Gunakan header jelas.
- Gunakan status badge berwarna.
- Di mobile, tabel boleh ditransformasikan jadi stacked card.

### 12.4 Status badges

Status badge harus menggunakan warna sistem:

- `Safe`
- `Info`
- `Warning`
- `Major`
- `Critical`

Badge harus:

- kecil,
- rounded-pill,
- sangat mudah dibedakan,
- tidak mengandalkan warna saja; tetap beri label teks.

### 12.5 Map markers

Marker map harus mewakili:

- kejadian,
- posko,
- gudang,
- bantuan dalam perjalanan,
- wilayah kritis,
- kebutuhan mendesak.

Gunakan bentuk dan warna berbeda untuk tiap jenis, bukan hanya ikon yang berbeda.

## 13. Data Visualization Rules

- Grafik harus sederhana dan bisa dipahami cepat.
- Jangan gunakan chart dekoratif yang tidak membantu keputusan.
- KPI wajib menonjolkan:
  - jumlah kejadian aktif,
  - jumlah posko,
  - jumlah pengungsi,
  - posko kritis,
  - stok menipis,
  - distribusi berjalan,
  - laporan belum diverifikasi.

### Public map

Masyarakat boleh melihat map versi publik yang berisi:

- lokasi posko,
- status umum wilayah,
- titik layanan,
- status bantuan agregat,
- informasi aman untuk publik.

### Internal map

Internal map boleh menampilkan:

- kebutuhan detail,
- stok,
- assignment distribusi,
- kelompok rentan,
- status verifikasi,
- rute bantuan,
- masalah per lokasi.

## 14. UX Priorities

### Primary UX goals

- cepat dipindai,
- jelas saat kondisi kritis,
- dapat dipakai oleh operator non-desainer,
- mudah dipahami dalam demo kompetisi,
- mudah diterjemahkan ke poster dan presentasi.

### Design principles

- tampilkan status penting secepat mungkin,
- utamakan keterbacaan di atas dekorasi,
- gunakan visual hierarchy yang kuat,
- tampilkan data penting dekat dengan aksinya,
- minimalkan klik untuk tugas operasional utama.

## 15. Page-Specific Guidance

### 15.1 Login

- gunakan layout **split-screen**
- sisi kiri berisi **foto dokumenter atau foto lapangan bencana nyata** sebagai hero image penuh tinggi
- sisi kanan berisi **panel login putih bersih** dengan form minimalis
- branding utama gunakan nama **SiagaKita**
- nuansa harus humanis, formal, bersih, dan dapat dipercaya
- tampilkan identitas akses terbatas untuk operator BPBD, petugas lapangan, dan admin
- gunakan gaya visual minimal, jangan terlalu banyak ornamen
- bila memakai foto besar, hindari ilustrasi tambahan yang tidak perlu

### 15.2 Dashboard Pusat Kendali

- map-centric,
- KPI dominan,
- summary kejadian aktif,
- daftar posko kritis,
- distribusi terbaru,
- shortcut tindakan penting.

### 15.3 Detail Kejadian / Map Monitoring

- map dominan,
- panel detail lokasi,
- filter status,
- legenda,
- marker berdasarkan urgensi dan jenis.

### 15.4 Posko, Pengungsi, dan Kebutuhan

- tampilkan data ringkas posko,
- kartu kelompok rentan,
- tabel kebutuhan,
- estimasi kebutuhan dasar,
- form update yang ringkas.

### 15.5 Logistik dan Distribusi

- tampilkan stok gudang,
- daftar permintaan bantuan,
- prioritas distribusi,
- status pengiriman,
- konfirmasi penerimaan.

### 15.6 Laporan dan Zero-Grid

- tampilkan incoming reports,
- status verifikasi,
- SMS parsing result,
- laporan duplikat,
- quick action verifikasi.

### 15.7 Bantuan Pihak Ketiga

- input sumber bantuan,
- jenis bantuan,
- kuantitas,
- status diterima,
- status dialokasikan,
- hindari tampilan seperti sistem donasi e-commerce.

## 16. AI And Recommendation UI Rules

- AI harus tampil sebagai **decision support**, bukan pengambil keputusan final.
- Tampilkan alasan rekomendasi dengan bahasa yang bisa dijelaskan.
- Gunakan pola:
  - `rekomendasi`,
  - `alasan`,
  - `faktor penentu`,
  - `aksi operator`.

Contoh tampilan:

- `Prioritas Tinggi`
- `Alasan: 450 pengungsi, 38 bayi, stok air kurang dari 1 hari, akses distribusi terhambat`

Jangan pernah membuat UI yang memberi kesan:

- sistem memutuskan sendiri tanpa operator,
- model AI sudah pasti akurat tinggi,
- sistem telah terhubung ke data pemerintah resmi tanpa bukti.

## 17. Guardrails

### Do

- Gunakan layout modular, tegas, dan profesional.
- Gunakan map sebagai pusat visual untuk monitoring.
- Gunakan glassmorphism ringan secara fungsional.
- Gunakan status warna yang jelas dan konsisten.
- Gunakan kartu ringkasan yang mudah dipindai.
- Pertahankan hierarki data yang kuat.
- Buat UI yang realistis untuk demo KMIPN.

### Do not

- Jangan gunakan nuansa pastel lembek yang membuat sistem kehilangan rasa urgensi.
- Jangan membuat UI terlalu mirip aplikasi donasi umum.
- Jangan gunakan ilustrasi kartun lucu atau playful.
- Jangan gunakan shadow berat dan dramatis.
- Jangan gunakan neon, purple-AI look, atau cyberpunk style.
- Jangan gunakan terlalu banyak gradien dekoratif.
- Jangan menaruh terlalu banyak ornamen di atas map.
- Jangan menyembunyikan informasi kritis di balik interaksi yang berlebihan.
- Jangan tampilkan data sensitif korban di halaman publik.

## 18. Page Prompt Summary

Bagian ini disiapkan agar AI design tools dapat memahami tiap halaman secara singkat tanpa harus membaca seluruh dokumen.

### 18.1 Login

- **Goal:** memberi akses aman ke sistem berdasarkan peran
- **Primary user:** semua role internal
- **Main components:** branding SiagaKita, form login, role hint, tombol masuk, bantuan teknis, catatan akses terbatas
- **Visual mood:** split-screen, humanis, formal, bersih, tenang, tidak ramai
- **Primary CTA:** `Masuk ke Sistem`

### 18.2 Dashboard Pusat Kendali

- **Goal:** memberi gambaran situasi krisis secara cepat
- **Primary user:** operator BPBD / pusat kendali
- **Main components:** map utama, KPI cards, panel prioritas, daftar posko kritis, shortcut aksi
- **Visual mood:** command center, tegas, operasional, modern
- **Primary CTA:** `Lihat Detail Kejadian` atau `Tindak Lanjut Prioritas`

### 18.3 Detail Kejadian / Map Monitoring

- **Goal:** memantau situasi kejadian secara spasial dan taktis
- **Primary user:** operator BPBD, petugas lapangan
- **Main components:** map dominan, legenda, marker status, floating detail panel, filter status
- **Visual mood:** map-centric, tegas, informatif
- **Primary CTA:** `Verifikasi`, `Eskalasi`, `Buka Posko`, atau `Lihat Kebutuhan`

### 18.4 Posko, Pengungsi, dan Kebutuhan

- **Goal:** merekam kondisi posko dan menghitung kebutuhan dasar
- **Primary user:** pengelola posko, petugas lapangan
- **Main components:** data posko, jumlah pengungsi, kelompok rentan, kebutuhan mendesak, rekomendasi kebutuhan
- **Visual mood:** rapi, jelas, data-first
- **Primary CTA:** `Simpan Update Posko` atau `Ajukan Kebutuhan`

### 18.5 Logistik dan Distribusi Bantuan

- **Goal:** mengelola stok, alokasi, dan pengiriman bantuan
- **Primary user:** operator BPBD, pengelola gudang
- **Main components:** stok gudang, permintaan bantuan, prioritas distribusi, status pengiriman, konfirmasi penerimaan
- **Visual mood:** operasional, cepat dipindai, terstruktur
- **Primary CTA:** `Setujui Alokasi`, `Siapkan Pengiriman`, atau `Konfirmasi Diterima`

### 18.6 Laporan dan Zero-Grid

- **Goal:** menerima, memeriksa, dan memvalidasi laporan masuk
- **Primary user:** operator BPBD, petugas lapangan
- **Main components:** daftar laporan, parser SMS, status verifikasi, deteksi duplikasi, quick action
- **Visual mood:** ringkas, responsif, berbasis triase
- **Primary CTA:** `Verifikasi Laporan`

### 18.7 Bantuan Pihak Ketiga

- **Goal:** mencatat bantuan NGO, perusahaan, komunitas, atau individu
- **Primary user:** operator BPBD, lembaga mitra
- **Main components:** sumber bantuan, jenis bantuan, jumlah, status diterima, status dialokasikan
- **Visual mood:** formal, akuntabel, tidak seperti e-commerce
- **Primary CTA:** `Catat Bantuan Masuk`

### 18.8 Audit Log

- **Goal:** menelusuri aktivitas dan keputusan penting sistem
- **Primary user:** administrator, operator BPBD
- **Main components:** timeline aktivitas, filter aksi, filter role, detail perubahan
- **Visual mood:** administratif, rapi, terpercaya
- **Primary CTA:** `Lihat Detail Aktivitas`

### 18.9 Peta Publik

- **Goal:** memberi informasi aman dan agregat untuk masyarakat
- **Primary user:** masyarakat umum
- **Main components:** posko, titik layanan, status wilayah umum, bantuan agregat
- **Visual mood:** humanis, informatif, bersih
- **Primary CTA:** `Cari Posko Terdekat`

## 19. Visual Borrowing From Reference Image

Hal yang **boleh diadopsi** dari referensi:

- map-centered composition,
- floating detail panel,
- KPI strip,
- glass cards,
- filter pills,
- top control bar,
- data table + stats panel layout,
- rounded modules.

Hal yang **wajib diubah** dari referensi:

- warna dibuat lebih tegas,
- alert dibuat lebih kontras,
- map difokuskan ke konteks Indonesia,
- status kritis dibuat lebih jelas,
- tone dibuat lebih formal pemerintahan,
- glass effect dikurangi agar tidak terlalu dreamy.

## 20. Accessibility

- Pastikan kontras teks cukup tinggi.
- Jangan gunakan warna sebagai satu-satunya pembeda status.
- Gunakan ukuran klik/tap yang nyaman.
- Ikon harus memiliki label atau tooltip bila perlu.
- Informasi kritis harus tetap terbaca tanpa perlu hover.

## 21. Engineering Guidance

Dokumen ini harus dijadikan dasar implementasi UI di Next.js.

### Preferred implementation mindset

- komponen reusable,
- token-driven styling,
- theme variables terpusat,
- desktop-first untuk dashboard,
- responsive refinement untuk tablet dan mobile.

### Suggested component groups

- `Shell`
- `TopBar`
- `FilterBar`
- `MapCanvas`
- `FloatingDetailCard`
- `KpiCard`
- `StatusBadge`
- `OperationalTable`
- `StatPanel`
- `TimelineCard`
- `RecommendationPanel`

## 22. Final Direction Summary

Jika ada keraguan desain, pilih arah berikut:

- **formal > playful**
- **jelas > dekoratif**
- **operasional > marketing**
- **map-centric > card-only**
- **tegas > pastel**
- **decision support > autonomous AI**
- **Indonesia disaster context > generic global dashboard**

Semua UI aplikasi **SiagaKita** dalam ekosistem **SI-TANGGAP KRISIS** harus terasa seperti:

- sistem tanggap krisis yang serius,
- modern,
- bisa dipakai operator nyata,
- layak dipresentasikan di KMIPN,
- dan cukup jelas untuk dipahami tanpa penjelasan panjang.
