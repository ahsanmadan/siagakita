"use client";

import { useState } from "react";
import { Cross2Icon, FileTextIcon, LockClosedIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "motion/react";

export function LegalModal() {
  const [activeModal, setActiveModal] = useState<"terms" | "privacy" | null>(null);

  return (
    <>
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => setActiveModal("terms")}
          className="hover:text-foreground underline underline-offset-4 transition-colors"
        >
          Ketentuan Layanan
        </button>
        <button
          type="button"
          onClick={() => setActiveModal("privacy")}
          className="hover:text-foreground underline underline-offset-4 transition-colors"
        >
          Kebijakan Privasi
        </button>
      </div>

      <AnimatePresence>
        {activeModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-text">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setActiveModal(null)}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl text-foreground flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/80 p-5 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    {activeModal === "terms" ? <FileTextIcon className="size-4" /> : <LockClosedIcon className="size-4" />}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold leading-none">
                      {activeModal === "terms" ? "Ketentuan Layanan" : "Kebijakan Privasi"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      SiagaKita — Sistem Komando & Tanggap Darurat Bencana
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Tutup"
                >
                  <Cross2Icon className="size-4" />
                </button>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 min-h-0 p-5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {activeModal === "terms" ? (
                  <div className="space-y-4">
                    <p className="text-foreground font-medium">
                      Dengan mengakses portal petugas SiagaKita, Anda menyatakan tunduk pada ketentuan operasional berikut:
                    </p>

                    <div className="space-y-1.5">
                      <h4 className="font-semibold text-foreground">1. Hak & Tanggung Jawab Akses</h4>
                      <p>
                        Akun diberikan khusus kepada personel terverifikasi (BPBD, Koordinator Lapangan, Petugas Posko, dan Pengelola Logistik). Kredensial tidak boleh dipindahtangankan kepada pihak yang tidak berwenang.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-semibold text-foreground">2. Integritas & Validasi Data</h4>
                      <p>
                        Setiap pembaruan status korban, kebutuhan mendesak posko, dan pergerakan logistik wajib diverifikasi secara faktual dari lapangan demi mencegah misinformasi publik.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-semibold text-foreground">3. Keputusan Operasional</h4>
                      <p>
                        Rekomendasi sistem berbasis AI berfungsi sebagai pendukung keputusan (decision support). Keputusan alokasi dan evakuasi akhir tetap berada di bawah wewenang komandan operasi resmi.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-semibold text-foreground">4. Keamanan & Audit</h4>
                      <p>
                        Seluruh riwayat aksi penanganan dan penyaluran bantuan terekam dalam log audit forensik untuk menjamin akuntabilitas penyaluran bantuan kemanusiaan.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-foreground font-medium">
                      SiagaKita berkomitmen melindungi data sensitif warga dan kerahasiaan operasi tanggap darurat:
                    </p>

                    <div className="space-y-1.5">
                      <h4 className="font-semibold text-foreground">1. Pengumpulan Data Darurat</h4>
                      <p>
                        Informasi yang dikumpulkan terbatas pada data esensial keselamatan: titik koordinat kejadian, estimasi populasi terdampak, kapasitas posko, dan daftar logistik bantuan.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-semibold text-foreground">2. Perlindungan Privasi Pengungsi</h4>
                      <p>
                        Data pribadi warga rentan (NIK, rekam medis darurat, kelompok lansia/anak) dienkripsi ketat dan hanya dapat diakses oleh petugas medis dan posko berwenang.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-semibold text-foreground">3. Transparansi Data Publik</h4>
                      <p>
                        Informasi yang dipublikasikan pada Peta Publik disajikan secara agregat (ringkasan wilayah dan ketersediaan posko) tanpa mengekspos identitas individu korban.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-semibold text-foreground">4. Keamanan Infrastruktur</h4>
                      <p>
                        Infrastruktur data dilindungi dengan enkripsi end-to-end, isolasi hak akses berbasis peran (RBAC), serta pencadangan berkala di tingkat server pemerintah.
                      </p>
                    </div>
                  </div>
                )}
              </ScrollArea>

              {/* Footer */}
              <div className="border-t border-border/80 p-4 flex justify-end bg-muted/20">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveModal(null)}
                  className="rounded-lg text-xs"
                >
                  Saya Mengerti
                </Button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
