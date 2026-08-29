# Status Integrasi SiagaKita

Tanggal pembaruan: 29 Agustus 2026

Dokumen ini menjelaskan batas integrasi SiagaKita pada tahap production-lite. Tujuannya agar UI, demo, dan penjelasan ke juri tetap jujur: fitur yang sudah aktif disebut aktif, fitur yang masih adapter tidak diklaim sebagai integrasi eksternal.

---

## 1. SMS Zero-Grid

**Status saat ini:** Adapter manual, antrean verifikasi aktif (belum terhubung SMS gateway telco).

**Cara kerja saat ini:**
- Operator memasukkan format pesan SMS ke form Zero-Grid.
- Sistem menyimpan input tersebut ke antrean `field_reports`.
- Laporan tetap harus diverifikasi sebelum bisa dibuka menjadi kejadian.
- Tidak ada pengiriman atau penerimaan SMS otomatis dari operator seluler.

**Copy UI yang wajib dipakai:**
- `Belum terhubung gateway`
- `Adapter manual; gateway SMS belum terhubung.`
- `Pesan dimasukkan manual oleh operator; SMS gateway eksternal belum dihubungkan.`

**Yang tidak boleh diklaim:**
- Sistem sudah menerima SMS otomatis dari jaringan seluler.
- Sistem sudah terhubung ke provider SMS berbayar.
- Sistem bisa berjalan penuh saat semua jaringan komunikasi mati total.

**Narasi ke juri:**
> *SiagaKita sudah menyiapkan struktur data dan alur verifikasi untuk kanal Zero-Grid, tetapi pada tahap awal prototype kompetisi, input SMS masih dicatat manual oleh operator. Pendekatan ini menjaga alur operasional tetap realistis sambil membuka ruang integrasi gateway SMS pada tahap berikutnya.*

---

## 2. Decision Support Rule-Based

**Status saat ini:** Rule-based decision support, deterministik dan aman diaudit.

**Sumber rekomendasi:**
- Data posko dan jumlah pengungsi.
- Kelompok rentan secara agregat (balita, lansia, disabilitas, ibu hamil).
- Kebutuhan mendesak posko.
- Stok dan cadangan gudang.
- Status akses lokasi dan armada distribusi.

**Cara kerja saat ini:**
- Sistem menyimpan rekomendasi di tabel `ai_recommendations`.
- Rekomendasi dipilih sesuai konteks halaman: dashboard, kejadian, posko, atau logistik.
- Rekomendasi hanya membantu prioritas, bukan mengambil keputusan final.
- Petugas berwenang tetap harus meninjau dan menandai rekomendasi sebagai sudah ditinjau.

**Copy UI yang wajib dipakai:**
- `Decision support`
- `Rule-based dari data posko, stok, dan kebutuhan.`
- `Keputusan akhir tetap berada pada petugas berwenang.`

---

## 3. Data Publik Real-Time / Near Real-Time

**Status saat ini:** Integrasi data publik eksternal aktif pada peta publik.

**Sumber aktif:**
- **BMKG Data Gempabumi Terbuka:** Untuk marker gempa bumi terkini (M >= 5.0 atau gempa dirasakan).
- **Open-Meteo API:** Untuk cuaca ringkas (suhu, cuaca, kecepatan angin) di sekitar titik bencana yang dipilih.
- **RainViewer:** Untuk overlay visual radar hujan saat layer diaktifkan.

**Aturan penggunaan:**
- BMKG adalah sumber resmi Indonesia untuk informasi gempa dan disebut sebagai sumber utama.
- Open-Meteo dan RainViewer adalah data pendukung visual/kontekstual.
- Jika API eksternal gagal, peta publik tetap menampilkan data internal SiagaKita melalui database views yang aman.

---

## 4. Antarmuka Mobile Responsif & Micro-Transitions

**Status saat ini:** Aktif dan dioptimalkan untuk mobile & desktop.

**Fitur yang aktif:**
- **Mobile Bottom Sheet:** Panel hasil pencarian posko dan titik bencana yang dapat di-drag dari bawah dengan gesture snapping.
- **Floating Controls:** Input pencarian dan filter status melayang di atas peta mobile dengan standard token `--radius-md` dan `--color-rule`.
- **Transitions.dev:** Animasi transisi state, accordion, tab sliding, dan morph dropdown yang halus tanpa membebani performa browser.

---

## 5. Audit Log & Akuntabilitas Data

**Status saat ini:** Halaman `/audit-log` aktif untuk Admin dan Operator BPBD.

**Cakupan Audit:**
- Aktor yang melakukan perubahan (email / user id).
- Jenis mutasi data (CREATE, UPDATE, DELETE, ESCALATE).
- Target tabel dan ID entitas terkait.
- Ringkasan data sebelum dan sesudah mutasi.
- Timestamp kejadian yang presisi.

---

## 6. Prinsip Demo untuk KMIPN

1. **Kejujuran Arsitektur:** Jelaskan bahwa backend, Auth, RLS, audit log, public map, dan mutasi data adalah sistem nyata (bukan hardcoded dummy visual).
2. **Kesiapan Fase:** Jelaskan bahwa batasan SMS Gateway dan AI eksternal sengaja diatur dalam mode aman (production-lite) untuk mematuhi regulasi privasi data kebencanaan dan meminimalkan biaya operasional awal.
