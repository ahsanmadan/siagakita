# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

1. **Operator BPBD / Komandan Operasi (Command Center):** Mengawasi situasi krisis kebencanaan secara makro, memvalidasi laporan masuk, memantau titik posko & logistik, serta mengambil keputusan eskalasi darurat.
2. **Pengelola Posko & Petugas Lapangan:** Merekam kedatangan & kondisi pengungsi, mencatat kelompok rentan (balita, lansia, ibu hamil, disabilitas), serta menghitung dan mengajukan kebutuhan logistik mendesak.
3. **Pengelola Gudang & Tim Distribusi Logistik:** Memantau ketersediaan stok bantuan darurat, memverifikasi alokasi dari komando, dan mengatur pengiriman hingga konfirmasi penerimaan di posko.
4. **Masyarakat Umum / Warga Terdampak:** Mengakses peta publik untuk mengetahui lokasi posko evakuasi aman terdekat, status wilayah terkini, dan kontak darurat tanpa menampilkan data sensitif korban.

## Product Purpose

SiagaKita adalah sistem komando, koordinasi, dan tanggap darurat bencana terpadu di Indonesia. Sistem ini hadir untuk mempercepat siklus informasi tanggap krisis: dari laporan insiden awal di lapangan, kalkulasi kebutuhan pengungsi, hingga penyaluran bantuan logistik secara akuntabel dan transparan. Sukses berarti waktu respons bencana terpangkas drastis dan bantuan tepat sasaran diterima tanpa tumpang tindih.

## Positioning

Platform tanggap darurat berbasis spasial real-time yang dilengkapi kapabilitas **Zero-Grid Reporting** (triage laporan via SMS/jalur darurat saat jaringan seluler terputus), kalkulasi kebutuhan otomatis berbasis standar kebencanaan Indonesia, serta koordinasi multi-peran tertutup (Command Center, Posko, Logistik) yang terintegrasi langsung dengan portal keselamatan publik.

## Operating Context

- **Lingkungan Operasi:** Ruang kendali darurat (BPBD Command Center dengan layar monitor besar), posko evakuasi darurat di balai desa/tenda darurat lapangan dengan koneksi internet terbatas/fluktuatif, dan smartphone masyarakat saat situasi genting.
- **Tingkat Urgensi:** Menit-menit awal fase tanggap darurat bencana alam (banjir, gempa, longsor, cuaca ekstrem). Keputusan harus cepat, data harus terverifikasi, dan antarmuka harus minim distorsi visual.
- **Keluaran Dokumen:** Situation Report (SitRep) otomatis, manifest pengiriman logistik, rekapitulasi data pengungsi dan kelompok rentan.

## Capabilities and Constraints

- **Kapabilitas Utama:**
  - Peta interaktif krisis & monitoring spasial terpadu (MapLibre / Mapbox).
  - Triage dan validasi laporan kebencanaan (termasuk Zero-Grid SMS parser).
  - Manajemen posko pengungsian & agregasi kelompok rentan.
  - Inventarisasi logistik, alokasi bantuan, dan tracking pengiriman.
  - Audit trail komprehensif untuk akuntabilitas operasional.
  - Peta publik teragregasi untuk warga (tanpa mengekspos data pribadi korban).
- **Batasan Teknis:**
  - Aplikasi web berbasis Next.js App Router & TypeScript.
  - Harus responsif dan tetap terbaca jelas dalam pencahayaan lapangan tinggi maupun malam hari (dukungan dark mode & light mode).
  - Tidak menggunakan animasi berlebih (bounce/overshoot) atau ornamen grafis yang memperlambat respons operator.

## Brand Commitments

- **Identitas:** SiagaKita — bagian dari inisiatif SI-TANGGAP KRISIS untuk kompetisi KMIPN VIII.
- **Tone & Voice:** Formal, tanggap, berwibawa, terpercaya, dan humanis. Menghindari nada santai, playful, atau bergaya aplikasi e-commerce/donasi komersial.
- **Aset Resmi:** Logo resmi SiagaKita (`/brand/logo-siagakita.png`), tipografi modern yang jelas dan mudah dipindai (Geist / Inter / Outfit).

## Evidence on Hand

- Dokumen arsitektur dan pedoman desain lengkap di [DESIGN.md](file:///d:/03_Data/Mine/Kuliah/Tugas/Semester%204/Manajemen%20Proyek/KMIPN/siagakita/DESIGN.md).
- Komponen operasional dan peta publik yang telah berjalan di [src/components/public-map-shell.tsx](file:///d:/03_Data/Mine/Kuliah/Tugas/Semester%204/Manajemen%20Proyek/KMIPN/siagakita/src/components/public-map-shell.tsx) dan [src/components/crisis-map.tsx](file:///d:/03_Data/Mine/Kuliah/Tugas/Semester%204/Manajemen%20Proyek/KMIPN/siagakita/src/components/crisis-map.tsx).
- Struktur peran dan autentikasi multi-role di [src/data/users.ts](file:///d:/03_Data/Mine/Kuliah/Tugas/Semester%204/Manajemen%20Proyek/KMIPN/siagakita/src/data/users.ts).

## Product Principles

1. **Kejelasan Operasional di Atas Estetika Dekoratif:** Antarmuka harus mengutamakan pemindaian cepat (scanability), status warna tegas (status kebencanaan), dan hirarki data yang kuat tanpa elemen visual buatan AI yang tidak perlu.
2. **Pusat Kendali Berbasis Spasial (Map-Centric):** Peta adalah sumber kebenaran taktis utama; informasi kontekstual mengorbit di sekitar peta melalui panel detail dan ringkasan ringkas.
3. **Ketahanan Zero-Grid & Minim Jaringan:** Selalu sediakan jalur penanganan data ketika infrastruktur komunikasi rusak atau tidak stabil.
4. **Privasi & Keamanan Data Warga:** Data identitas detail korban dan pengungsi dilindungi ketat di konsol internal; hanya data agregat keselamatan yang ditampilkan di sisi publik.

## Accessibility & Inclusion

- Kontras warna tinggi memenuhi standar WCAG AA, khususnya untuk badge status bahaya (merah), siaga (oranye), waspada (kuning), dan aman (hijau).
- Status bahaya tidak boleh hanya mengandalkan warna semata (wajib didampingi ikon/teks status eksplisit).
- Target sentuh minimal 44x44px untuk kemudahan navigasi di tablet dan perangkat lapangan.
