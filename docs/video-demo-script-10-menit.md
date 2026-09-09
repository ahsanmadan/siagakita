# Naskah Video Presentasi SiagaKita 10 Menit

## Catatan Rekaman

- Target durasi: 9 menit 30 detik sampai 10 menit.
- Upload YouTube sebagai `Unlisted`, bukan `Private`.
- Gunakan screen recording dengan suara jelas.
- Jangan terlalu lama diam di satu halaman. Tiap halaman cukup jelaskan fungsi dan bukti integrasinya.
- Siapkan akun demo sebelum mulai: `admin@siagakita.local`, `operator@siagakita.local`, `lapangan@siagakita.local`, `posko@siagakita.local`, `gudang@siagakita.local`.
- Password demo lokal: `siagakita123`.

## 0:00 - 0:30 Opening

Assalamu'alaikum warahmatullahi wabarakatuh.

Perkenalkan, ini adalah SiagaKita, sebuah platform koordinasi tanggap darurat bencana berbasis web. SiagaKita dirancang untuk membantu BPBD, petugas lapangan, pengelola posko, pengelola gudang, dan masyarakat agar bisa bekerja dalam satu alur data yang sama.

Fokus utama aplikasi ini adalah mempercepat proses dari laporan awal bencana, verifikasi oleh operator, pembukaan kejadian resmi, pengelolaan posko, pencatatan kebutuhan, sampai distribusi bantuan dari gudang.

## 0:30 - 1:30 Latar Belakang Masalah

Dalam situasi bencana, masalah yang sering terjadi bukan hanya kurangnya bantuan, tetapi juga tidak sinkronnya informasi. Laporan dari warga atau petugas lapangan bisa masuk dari banyak kanal. Di sisi lain, operator harus menentukan laporan mana yang valid, posko harus memperbarui jumlah pengungsi, dan gudang harus tahu bantuan apa yang paling dibutuhkan.

Jika semua proses ini berjalan terpisah, maka keputusan bisa terlambat. Data posko bisa tidak sesuai kondisi lapangan. Stok gudang bisa tidak cocok dengan kebutuhan pengungsi. Masyarakat juga bisa kesulitan mencari informasi aman mengenai lokasi kejadian dan posko bantuan.

Karena itu, SiagaKita dibuat sebagai ruang kerja terpadu untuk tanggap darurat. Setiap pengguna memiliki peran berbeda, tetapi semua bekerja pada data yang sama.

## 1:30 - 2:15 Solusi SiagaKita

SiagaKita menyatukan beberapa bagian penting dalam penanganan bencana.

Pertama, ada dashboard operasi untuk melihat ringkasan situasi. Kedua, ada antrean laporan untuk menampung laporan dari warga maupun petugas lapangan. Ketiga, ada modul kejadian bencana untuk laporan yang sudah diverifikasi. Keempat, ada modul posko dan pengungsi untuk memantau kondisi tempat evakuasi. Kelima, ada modul logistik untuk mengatur stok dan distribusi bantuan. Terakhir, ada peta publik yang bisa diakses masyarakat untuk melihat informasi aman secara ringkas.

Selain itu, setiap aktivitas penting dicatat dalam audit log. Jadi sistem ini tidak hanya membantu koordinasi, tetapi juga menjaga akuntabilitas keputusan.

## 2:15 - 3:00 Pengguna dan Hak Akses

SiagaKita tidak dipakai oleh satu orang saja. Sistem ini menggunakan role-based access control, sehingga setiap akun hanya mendapat akses sesuai tugasnya.

Admin BPBD bertugas menyiapkan akun dan mengawasi sistem. Operator BPBD bertugas memverifikasi laporan, membuka kejadian bencana, dan mengoordinasikan respons. Petugas lapangan bertugas membuat laporan dari lokasi bencana. Pengelola posko bertugas memperbarui data pengungsi dan kebutuhan. Pengelola gudang bertugas mengelola stok serta distribusi bantuan. Sedangkan publik dapat melihat informasi aman melalui peta publik.

Untuk demo ini, akun sudah disiapkan oleh admin agar alur penggunaan bisa diperlihatkan dengan cepat.

## 3:00 - 3:45 Demo Akun Admin

Sekarang kita masuk sebagai admin.

Di halaman Akun Demo, terlihat daftar akun operasional yang digunakan dalam simulasi. Ada akun operator BPBD, petugas lapangan, pengelola posko, dan pengelola gudang. Ini menunjukkan bahwa SiagaKita memang dirancang sebagai sistem multi-user.

Admin memiliki akses untuk melihat seluruh modul, termasuk audit log. Dalam penerapan nyata, admin BPBD dapat mengatur siapa saja yang berhak masuk ke sistem, sehingga data operasional tidak dibuka untuk sembarang orang.

## 3:45 - 4:45 Demo Petugas Lapangan Membuat Laporan

Selanjutnya kita masuk sebagai petugas lapangan.

Petugas lapangan menggunakan modul laporan untuk mencatat kejadian dari lokasi bencana. Misalnya ada laporan longsor di sebuah nagari. Petugas mengisi lokasi, nama pelapor, tingkat kedaruratan, dan ringkasan kondisi lapangan.

Setelah dikirim, laporan masuk ke antrean laporan dengan status baru. Pada tahap ini, laporan belum otomatis menjadi kejadian resmi. Ini penting karena setiap laporan tetap perlu diverifikasi oleh operator BPBD agar tidak terjadi duplikasi atau informasi yang salah.

## 4:45 - 5:45 Demo Operator BPBD Verifikasi dan Buka Kejadian

Sekarang kita masuk sebagai operator BPBD.

Operator membuka antrean laporan dan melihat laporan yang baru masuk. Di sini operator dapat membaca lokasi, pelapor, ringkasan, kanal laporan, dan tingkat urgensi.

Jika laporan valid, operator melakukan verifikasi. Setelah diverifikasi, operator dapat membuka laporan tersebut menjadi kejadian bencana aktif. Pada proses ini, sistem menghubungkan laporan awal dengan data kejadian resmi.

Setelah kejadian dibuka, data tersebut masuk ke dashboard operasi dan juga dapat tampil pada peta publik sesuai informasi yang aman ditampilkan. Dengan alur ini, laporan mentah dari lapangan tidak langsung diumumkan, tetapi melewati proses validasi terlebih dahulu.

## 5:45 - 6:40 Demo Posko dan Pengungsi

Setelah ada kejadian aktif, BPBD dapat mendaftarkan posko bantuan atau posko pengungsian yang terkait dengan kejadian tersebut.

Sekarang kita masuk sebagai pengelola posko. Pengelola posko dapat memperbarui jumlah pengungsi, kapasitas posko, jumlah anak-anak, lansia, ibu hamil, penyandang disabilitas, serta kebutuhan mendesak di posko.

Data ini penting karena kondisi posko bisa berubah dengan cepat. Misalnya jumlah pengungsi bertambah, atau kebutuhan logistik seperti air bersih, makanan, obat-obatan, dan selimut mulai menipis. Dengan pembaruan dari pengelola posko, BPBD dan gudang bisa mengambil keputusan berdasarkan kondisi terbaru.

## 6:40 - 7:35 Demo Gudang dan Distribusi Bantuan

Berikutnya kita masuk sebagai pengelola gudang.

Di modul logistik, pengelola gudang dapat melihat stok yang tersedia dan kebutuhan yang diajukan oleh posko. Dari sini, gudang dapat mengalokasikan bantuan ke posko tujuan.

Distribusi memiliki status, mulai dari disiapkan, dalam perjalanan, hingga diterima. Dengan begitu, BPBD dapat memantau apakah bantuan sudah bergerak atau masih tertahan di gudang.

Alur ini membantu mengurangi risiko bantuan tidak tepat sasaran, karena kebutuhan posko, stok gudang, dan distribusi tercatat dalam satu sistem.

## 7:35 - 8:25 Peta Publik

Sekarang kita lihat peta publik.

Peta publik menampilkan informasi yang aman dan mudah dipahami masyarakat. Di sini masyarakat dapat melihat titik kejadian, posko, serta informasi pendukung seperti gempa atau aktivitas gunung api jika tersedia.

Tampilan peta publik dibuat ringkas agar masyarakat tidak bingung saat kondisi darurat. Tujuannya bukan menampilkan semua data internal BPBD, tetapi hanya informasi penting yang membantu masyarakat mengambil keputusan aman.

## 8:25 - 9:05 Audit Log dan Integrasi Data

Salah satu bagian penting di SiagaKita adalah audit log.

Setiap aktivitas penting tercatat, seperti laporan dibuat, laporan diverifikasi, kejadian dibuka, posko diperbarui, kebutuhan diajukan, dan distribusi dialokasikan. Catatan ini berisi siapa yang melakukan aksi, kapan dilakukan, dan data apa yang berubah.

Ini membuktikan bahwa SiagaKita bukan hanya aplikasi input data, tetapi sistem koordinasi yang dapat dipertanggungjawabkan.

Semua modul terhubung ke database yang sama. Laporan, kejadian, posko, kebutuhan, stok gudang, distribusi, dan audit log saling berkaitan. Jadi ketika satu role memperbarui data, role lain bisa melihat dampaknya dalam alur operasi.

## 9:05 - 9:40 Teknologi yang Digunakan

Secara teknis, SiagaKita dibangun menggunakan Next.js sebagai framework web modern. Supabase digunakan untuk database, autentikasi, dan realtime data. Sistem menggunakan role-based access control agar setiap pengguna hanya mengakses modul yang sesuai dengan perannya.

SiagaKita juga mendukung integrasi informasi eksternal seperti data gempa BMKG dan aktivitas gunung api PVMBG sebagai informasi pendukung untuk memperkuat situasi operasional.

## 9:40 - 10:00 Closing

Kesimpulannya, SiagaKita membantu proses tanggap darurat dari awal sampai akhir. Mulai dari laporan lapangan, verifikasi BPBD, pembukaan kejadian, pengelolaan posko, pengajuan kebutuhan, distribusi bantuan, sampai informasi publik dan audit log.

Dengan SiagaKita, setiap pihak bekerja dalam satu sistem yang terintegrasi, sehingga respons bencana bisa lebih cepat, lebih terarah, dan lebih transparan.

Terima kasih. Wassalamu'alaikum warahmatullahi wabarakatuh.

## Checklist Sebelum Upload

1. Pastikan video berdurasi maksimal 10 menit.
2. Pastikan suara jelas dan layar terbaca.
3. Pastikan data demo bersih dari data uji coba.
4. Upload ke YouTube dengan visibilitas `Unlisted`.
5. Gunakan judul: `Presentasi Karya SiagaKita - KMIPN`.
6. Isi deskripsi dengan nama tim, nama aplikasi, dan ringkasan fitur.
