# Status Integrasi SiagaKita

Tanggal pembaruan: 9 Agustus 2026

Dokumen ini menjelaskan batas integrasi SiagaKita pada tahap production-lite. Tujuannya agar UI, demo, dan penjelasan ke juri tetap jujur: fitur yang sudah aktif disebut aktif, fitur yang masih adapter tidak diklaim sebagai integrasi eksternal.

## 1. SMS Zero-Grid

Status saat ini: adapter manual, belum terhubung SMS gateway.

Cara kerja saat ini:

- Operator memasukkan format pesan SMS ke form Zero-Grid.
- Sistem menyimpan input tersebut ke antrean `field_reports`.
- Laporan tetap harus diverifikasi sebelum bisa dibuka menjadi kejadian.
- Tidak ada pengiriman atau penerimaan SMS dari operator seluler.

Copy UI yang wajib dipakai:

- `Belum terhubung gateway`
- `Adapter manual; gateway SMS belum terhubung.`
- `Pesan dimasukkan manual oleh operator; SMS gateway eksternal belum dihubungkan.`

Yang tidak boleh diklaim:

- Sistem sudah menerima SMS otomatis dari jaringan seluler.
- Sistem sudah terhubung ke provider SMS.
- Sistem bisa berjalan penuh saat semua jaringan komunikasi mati.

Narasi ke juri:

SiagaKita sudah menyiapkan struktur data dan alur verifikasi untuk kanal Zero-Grid, tetapi pada tahap awal tanpa dana, input SMS masih dicatat manual oleh operator. Pendekatan ini menjaga alur operasional tetap realistis sambil membuka ruang integrasi gateway SMS pada tahap berikutnya.

## 2. Decision Support Rule-Based

Status saat ini: rule-based decision support, belum memakai AI eksternal dalam alur utama.

Sumber rekomendasi:

- Data posko dan jumlah pengungsi.
- Kelompok rentan secara agregat.
- Kebutuhan posko.
- Stok dan cadangan gudang.
- Status akses lokasi dan distribusi.

Cara kerja saat ini:

- Sistem menyimpan rekomendasi di `ai_recommendations`.
- Rekomendasi dipilih sesuai konteks halaman: dashboard, kejadian, posko, atau logistik.
- Rekomendasi hanya membantu prioritas, bukan mengambil keputusan final.
- Petugas berwenang tetap harus meninjau dan menandai rekomendasi sebagai sudah ditinjau.

Copy UI yang wajib dipakai:

- `Decision support`
- `Rule-based dari data posko, stok, dan kebutuhan.`
- `Belum memakai AI eksternal dan tidak menjalankan aksi otomatis.`
- `Keputusan akhir tetap berada pada petugas berwenang.`

Yang tidak boleh diklaim:

- Sistem memakai model AI eksternal untuk keputusan operasional.
- Sistem otomatis menentukan penerima bantuan tanpa validasi petugas.
- Rekomendasi memiliki akurasi prediktif yang sudah tervalidasi di lapangan.

Narasi ke juri:

Rekomendasi SiagaKita pada tahap production-lite bersifat rule-based agar transparan, mudah diaudit, dan aman untuk domain kebencanaan. Sistem membantu menyusun prioritas dari data posko, stok, kebutuhan, dan akses lokasi, tetapi keputusan akhir tetap berada pada BPBD atau petugas yang berwenang.

## 3. Groq / AI Eksternal

Status saat ini: konfigurasi environment tersedia untuk pengembangan berikutnya, tetapi belum dipakai sebagai alur utama production-lite.

Ketentuan sebelum AI eksternal diaktifkan:

- Prompt harus dibatasi agar model hanya memakai data yang diberikan sistem.
- Output harus dianggap saran, bukan keputusan otomatis.
- Setiap rekomendasi eksternal harus menyimpan alasan, sumber data input, waktu dibuat, dan status peninjauan.
- Harus ada fallback rule-based jika API gagal, lambat, atau kuota habis.
- Tidak boleh mengirim data pribadi korban atau informasi sensitif ke model eksternal.

Tahap implementasi yang aman:

1. Gunakan rule-based sebagai sumber keputusan utama.
2. Pakai model eksternal hanya untuk merapikan penjelasan rekomendasi.
3. Tampilkan label `AI eksternal belum menjadi dasar keputusan final`.
4. Audit semua output sebelum dipakai di flow operasional.

## 4. Data Publik Real-Time / Near Real-Time

Status saat ini: integrasi data publik eksternal sudah aktif pada peta publik.

Sumber aktif:

- BMKG Data Gempabumi Terbuka untuk marker gempa terbaru.
- Open-Meteo untuk cuaca ringkas di sekitar titik yang dipilih.
- RainViewer untuk overlay radar hujan saat layer `Radar hujan` dinyalakan.

Aturan penggunaan:

- BMKG adalah sumber resmi Indonesia untuk informasi gempa dan harus disebut sebagai sumber utama.
- Open-Meteo dan RainViewer adalah data pendukung visual/kontekstual, bukan dasar tunggal keputusan operasional.
- Jika API eksternal gagal, peta publik tetap menampilkan data SiagaKita dari view public-safe.
- Data eksternal tidak disimpan sebagai kejadian internal sebelum diverifikasi petugas.

Copy UI yang aman:

- `Sumber resmi: BMKG`
- `Sumber pendukung: Open-Meteo`
- `Radar hujan RainViewer`
- `Keputusan operasional tetap memakai data resmi dan verifikasi petugas.`

Yang tidak boleh diklaim:

- Semua data cuaca/hujan adalah data resmi pemerintah Indonesia.
- Marker BMKG otomatis membuka kejadian internal tanpa verifikasi.
- Radar hujan tersedia dengan jaminan operasional penuh.

Narasi ke juri:

Peta publik SiagaKita sudah dapat menggabungkan data internal yang aman untuk publik dengan sumber eksternal gratis. BMKG dipakai sebagai rujukan resmi gempa, sedangkan Open-Meteo dan RainViewer dipakai sebagai pendukung situasional agar masyarakat dan petugas mendapat konteks cuaca tanpa menambah biaya operasional.

## 5. Prinsip Demo

- Jelaskan bahwa backend, Auth, RLS, audit log, public map, dan mutasi data sudah nyata.
- Jelaskan bahwa SMS gateway dan AI eksternal belum diaktifkan untuk menjaga biaya dan risiko.
- Tekankan bahwa production-lite bukan berarti pura-pura: sistem sudah menyimpan data, membatasi role, dan mencatat audit.
- Jangan menyebut data seed sebagai data bencana aktual.

## 6. Bantuan Pihak Ketiga

Status saat ini: workflow operasional dasar sudah aktif.

Alur yang tersedia:

- Catat bantuan masuk dari NGO, komunitas, perusahaan, atau individu.
- Validasi bantuan dan cocokkan ke gudang.
- Ubah status menjadi `diterima-gudang`.
- Tandai bantuan sebagai `dialokasikan` ketika sudah masuk alur distribusi.
- Setiap perubahan status menulis `audit_logs`.

Narasi ke juri:

Bantuan pihak ketiga tidak langsung dianggap siap distribusi. Sistem memisahkan tahap pencatatan, validasi gudang, dan alokasi supaya bantuan tidak menumpuk atau terduplikasi tanpa kendali.

## 7. Audit Log

Status saat ini: halaman `/audit-log` sudah tersedia untuk admin dan operator BPBD.

Isi audit:

- Actor yang melakukan perubahan.
- Jenis aksi.
- Target tabel dan target id.
- Ringkasan data sebelum dan sesudah.
- Waktu perubahan.

Pembatasan akses:

- Admin dan operator BPBD dapat melihat audit.
- Role gudang, posko, dan petugas lapangan tidak melihat isi audit internal.

Narasi ke juri:

Audit log digunakan untuk akuntabilitas keputusan. Setiap mutasi penting seperti verifikasi laporan, pembukaan kejadian, alokasi distribusi, konfirmasi penerimaan, dan perubahan bantuan pihak ketiga memiliki jejak perubahan.
