# Hallmark Final Audit

Tanggal: 2026-07-17

Pre-emit critique: Philosophy 5, Hierarchy 5, Execution 4, Specificity 5, Restraint 5, Variety 4.

## Pemeriksaan Universal

- Hierarki memakai token `design.md` dan `tokens.css`; tidak ada warna atau font improvisasi pada komponen aplikasi.
- Semua angka operasional dinyatakan sebagai data simulasi dan bukan klaim kondisi aktual.
- Tidak ada fake browser, phone, IDE, atau terminal chrome.
- Tidak ada heading italic atau dekorasi tanpa fungsi.
- Fokus keyboard, reduced motion, target sentuh, loading, success, error, dan fallback tersedia.
- Root dan body tidak mengalami horizontal scroll pada 320, 375, 414, atau 768 piksel.
- MapLibre memakai attribution resmi, popup, marker, auto-fit bounds, dan fallback ketika tile gagal.

## Audit Halaman

| Halaman | Struktur | Hierarki | Responsif | Interaksi | Hasil |
| --- | --- | --- | --- | --- | --- |
| Login | Split Studio | Fokus tunggal ke autentikasi | Lulus | Loading dan navigasi | Lulus |
| Dashboard | Map / Diagram | Prioritas situasi dan bantuan | Lulus | Filter, toast, map | Lulus |
| Detail Kejadian | Map-dominant operations | Eskalasi dan kondisi | Lulus | Tabs, marker, popup | Lulus |
| Posko | Operational table | Kelompok rentan dan kebutuhan | Lulus | Dialog dan filter | Lulus |
| Logistik | Distribution board | Status distribusi | Lulus | Tabs dan status lokal | Lulus |
| Laporan | Verification queue | Urgensi laporan | Lulus | SMS simulation dan toast | Lulus |
| Peta Publik | Public map utility | Informasi aman dan privasi | Lulus | Marker dan popup | Lulus |

Tabel operasional menggunakan scroll internal pada layar sempit; tidak mendorong lebar dokumen. Marker yang berbagi koordinat bertumpuk secara visual, tetapi marker lapisan atas tetap dapat dipilih dan membuka popup.

## Spacing Audit 2026-07-17

Pre-emit critique: Philosophy 5, Hierarchy 5, Execution 5, Specificity 5, Restraint 5, Variety 4.

- Skala spacing tetap berbasis kelipatan 4px sesuai `design.md` dan Hallmark.
- Pasangan judul dan deskripsi memakai 8px; kontrol internal memakai 12-16px.
- Padding standar kartu menjadi 20px tanpa gap bawaan tambahan antara header dan content.
- Sel tabel memakai 12px vertikal dan 16px horizontal, dengan 20px pada tepi pertama dan terakhir.
- Header berfilter berubah ke satu baris pada desktop dan bertumpuk dengan jarak 16px pada mobile.
- Tabel mobile menggulir secara internal; kartu dan halaman tidak ikut melebar.
- Pemeriksaan geometris pada 7 halaman di 320, 375, 414, dan 768 piksel: 28/28 lulus tanpa root overflow atau kartu terpotong.
