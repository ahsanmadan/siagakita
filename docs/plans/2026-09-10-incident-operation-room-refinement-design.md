# Penyempurnaan Ruang Operasi Kejadian

## Arah

Pertahankan komposisi besar halaman detail kejadian dan rapikan hierarki melalui konsolidasi semantik. Halaman harus terbaca sebagai ruang kerja operator, bukan kumpulan kartu status yang berulang.

## Hierarki Atas

1. Gunakan `Ruang Operasi Kejadian` sebagai konteks halaman dan nama kejadian sebagai identitas utama.
2. Tampilkan status kejadian, level eskalasi, dan respons aktif sekali pada area atas.
3. Jadikan `Naikkan eskalasi` sebagai primary action; ekspor SitRep dan peta publik menjadi secondary.
4. Ganti kartu ringkasan berulang dengan warga terdampak, posko aktif, posko kritis, dan lembaga aktif.

## Rekomendasi Operasional

1. Gunakan Bahasa Indonesia untuk judul, status, alasan, faktor, dan aksi.
2. Jika rekomendasi belum tersedia, jelaskan data yang belum memadai.
3. Berikan tautan nyata ke pengelolaan posko dan input kebutuhan sebagai langkah berikutnya.
4. Tegaskan bahwa keputusan akhir tetap berada pada operator.

## Peta

1. Terjemahkan legenda mode operasional ke Bahasa Indonesia.
2. Pisahkan area legenda, kontrol peta, attribution, dan action overlay agar tidak bertabrakan.
3. Pertahankan perilaku marker, koordinat, kamera, dan mode peta publik.

## Tabs dan Linimasa

1. Gunakan label `Linimasa Operasional`, `Koordinasi Lembaga`, dan `Posko Terdampak`.
2. Gunakan active state yang jelas melalui kontras surface dan indikator aktif.
3. Setiap item linimasa memiliki status `Selesai`, `Berjalan`, atau `Perlu tindak lanjut` berdasarkan data yang tersedia.
4. Teks tindak lanjut harus menjelaskan keputusan atau aksi operator berikutnya.

## Tipografi

1. Plus Jakarta Sans untuk judul halaman dan heading bagian.
2. Inter untuk subtitle, body, metadata, badge, kontrol, dan teks kecil.
3. Hierarki dibentuk melalui ukuran, bobot, dan jarak, bukan font tambahan.

## Verifikasi

```bash
npx tsc --noEmit
npx eslint "src/app/(console)/kejadian/[id]/page.tsx" "src/components/timeline.tsx" "src/components/crisis-map.tsx"
npm run build
git diff --check
```
