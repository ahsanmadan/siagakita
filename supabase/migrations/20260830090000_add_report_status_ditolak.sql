-- Tambah status laporan "ditolak" untuk aksi cepat tolak/duplikat pada antrean triase.
-- Aditif: nilai enum baru tidak mengubah data yang sudah ada.
alter type public.report_status add value if not exists 'ditolak';
