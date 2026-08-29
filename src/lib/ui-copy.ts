export const uiCopy = {
  product: {
    commandCenter: "Pusat Kendali",
    publicMap: "Peta Informasi Bencana",
    safePublicInfo: "Info aman untuk warga",
  },
  operations: {
    actionRequired: "Perlu tindakan",
    fieldStatus: "Status lapangan",
    criticalNeeds: "Kebutuhan kritis",
    activeDistribution: "Distribusi berjalan",
    decisionTrail: "Jejak keputusan",
    verificationQueue: "Antrean verifikasi",
    shelterUpdate: "Update posko",
    reliefAllocation: "Alokasi bantuan",
  },
  actions: {
    verifyReport: "Verifikasi laporan",
    openIncident: "Buka kejadian",
    prioritizeNeeds: "Prioritaskan kebutuhan",
    coordinateDistribution: "Koordinasi distribusi",
    submitFieldReport: "Buat laporan",
    updateShelter: "Update kondisi",
    requestRelief: "Ajukan kebutuhan",
    allocateSupplies: "Alokasikan bantuan",
    confirmDelivery: "Konfirmasi pengiriman",
    reviewAudit: "Tinjau audit",
  },
  empty: {
    reports: "Belum ada laporan lapangan. Buat laporan pertama agar BPBD memahami kondisi lokasi.",
    needs: "Belum ada kebutuhan aktif. Ajukan kebutuhan saat kondisi posko berubah.",
    distributions: "Belum ada distribusi berjalan. Alokasi akan muncul setelah gudang memproses permintaan.",
    audit: "Belum ada aktivitas terbaru. Jejak keputusan akan muncul setelah ada perubahan penting.",
  },
} as const;

export type UiCopy = typeof uiCopy;
