"use client";

import { useId, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Crosshair,
  Loader2,
  PhoneCall,
  RotateCcw,
  ShieldAlert,
  Users,
  Waypoints,
} from "lucide-react";
import { submitCitizenReportAction, type CitizenReportInput } from "@/lib/actions/citizen-report";
import { PublicMapStatus } from "@/components/public-map-status";

type Step = "category" | "form" | "success";

export function CitizenReportDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("category");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultCode, setResultCode] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Accessible Form IDs
  const locationInputId = useId();
  const nameInputId = useId();
  const phoneInputId = useId();
  const notesInputId = useId();
  const reportFormId = useId();

  // Form State
  const [category, setCategory] = useState<CitizenReportInput["category"]>("sar_evakuasi");
  const [reporterName, setReporterName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [hasPhoto, setHasPhoto] = useState(false);

  // GPS State
  const [gpsStatus, setGpsStatus] = useState<"detecting" | "locked" | "error">("detecting");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const requestGps = () => {
    setGpsStatus("detecting");
    setGpsError(null);
    setFormError(null);

    if (!navigator.geolocation) {
      setGpsStatus("error");
      setGpsError("Perangkat tidak mendukung sensor GPS.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setAccuracy(pos.coords.accuracy);
        setGpsStatus("locked");
      },
      (err) => {
        setGpsStatus("error");
        if (err.code === 1) {
          setGpsError("Izin lokasi belum diberikan pada browser.");
        } else {
          setGpsError("Sinyal GPS belum terkunci.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      requestGps();
    } else {
      setStep("category");
      setResultCode(null);
      setFormError(null);
    }
  };

  const handleSelectCategory = (cat: CitizenReportInput["category"]) => {
    setCategory(cat);
    setFormError(null);
    setStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!coords && locationDescription.trim().length < 3) {
      setFormError("Isi lokasi kejadian bila GPS belum terkunci.");
      return;
    }

    if (!phoneNumber || phoneNumber.length < 9) {
      setFormError("Nomor telepon atau WhatsApp aktif wajib diisi untuk verifikasi petugas.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitCitizenReportAction({
        category,
        reporterName: reporterName.trim() || "Warga Terdampak",
        phoneNumber: phoneNumber.trim(),
        locationDescription: locationDescription.trim() || "Area GPS Pelapor",
        coordinates: coords,
        gpsAccuracyMeters: accuracy ?? undefined,
        notes: notes.trim(),
        hasPhoto,
      });

      if (res.success && res.trackingCode) {
        setResultCode(res.trackingCode);
        setStep("success");
      } else {
        setFormError(res.message);
      }
    } catch {
      setFormError("Terjadi gangguan jaringan saat mengirim laporan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="destructive"
            size="sm"
            className="h-9 gap-1.5 rounded-full px-3.5 text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <ShieldAlert className="size-3.5" />
            <span>Lapor Darurat</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        {/* Header Bersih Standar shadcn */}
        <DialogHeader>
          <DialogTitle>Lapor Situasi Darurat</DialogTitle>
          <DialogDescription>
            Laporan warga langsung terhubung ke Pusat Komando BPBD & Tim Reaksi Cepat.
          </DialogDescription>
        </DialogHeader>

        {/* Direct Call Hotline Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <PhoneCall className="size-3.5 text-destructive" />
            <span>Panggilan Darurat Langsung Bebas Pulsa:</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button asChild size="sm" variant="destructive" className="h-7 text-xs px-2.5 font-bold shadow-none">
              <a href="tel:112">Panggil 112</a>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-xs px-2.5 font-bold border-destructive/30 text-destructive hover:bg-destructive/10">
              <a href="tel:115">SAR 115</a>
            </Button>
          </div>
        </div>

        {/* GPS Satellite Strip */}
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <Crosshair className="size-3.5 text-foreground" />
            <span>Satelit GPS:</span>
          </div>

          {gpsStatus === "detecting" && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Mengunci koordinat...
            </span>
          )}

          {gpsStatus === "locked" && coords && (
            <Badge variant="outline" className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="size-3" /> Terkunci (±{Math.round(accuracy || 0)}m)
            </Badge>
          )}

          {gpsStatus === "error" && (
            <button
              type="button"
              onClick={requestGps}
              className="inline-flex items-center gap-1 text-destructive hover:underline font-medium"
            >
              <RotateCcw className="size-3" />
              <span>{gpsError || "GPS Belum Aktif"} (Coba Lagi)</span>
            </button>
          )}
        </div>

        {formError && (
          <PublicMapStatus
            compact
            tone="critical"
            title="Laporan belum dapat dikirim"
            description={`${formError} Data yang sudah diisi tetap tersimpan di formulir.`}
            actionLabel={step === "form" ? "Coba kirim lagi" : undefined}
            onAction={step === "form" ? () => (document.getElementById(reportFormId) as HTMLFormElement | null)?.requestSubmit() : undefined}
            loading={isSubmitting}
          />
        )}

        {/* STEP 1: CATEGORY SELECTION */}
        {step === "category" && (
          <div className="space-y-2.5 pt-1">
            <p className="text-xs font-medium text-muted-foreground">
              Pilih jenis kedaruratan yang dialami:
            </p>

            {/* Category 1: SAR Evakuasi */}
            <button
              type="button"
              onClick={() => handleSelectCategory("sar_evakuasi")}
              className="w-full text-left p-3.5 rounded-lg border bg-card hover:bg-muted/40 hover:border-foreground/25 transition-colors flex items-start gap-3 cursor-pointer"
            >
              <div className="size-9 rounded-md bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm text-foreground">
                    Evakuasi Jiwa / Korban Tertimbun
                  </p>
                  <Badge variant="destructive" className="text-[10px]">
                    Prioritas SAR
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Warga tertimbun reruntuhan, terseret banjir, atau butuh evakuasi segera.
                </p>
              </div>
            </button>

            {/* Category 2: Jalan Rusak */}
            <button
              type="button"
              onClick={() => handleSelectCategory("jalan_jembatan")}
              className="w-full text-left p-3.5 rounded-lg border bg-card hover:bg-muted/40 hover:border-foreground/25 transition-colors flex items-start gap-3 cursor-pointer"
            >
              <div className="size-9 rounded-md bg-muted text-foreground flex items-center justify-center shrink-0 mt-0.5">
                <Waypoints className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm text-foreground">
                    Akses Jalan / Jembatan Terputus
                  </p>
                  <Badge variant="outline" className="text-[10px]">
                    Infrastruktur
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Jalan tertutup tanah longsor, jembatan roboh, atau jalur logistik terhambat.
                </p>
              </div>
            </button>

            {/* Category 3: Posko Logistik */}
            <button
              type="button"
              onClick={() => handleSelectCategory("posko_logistik")}
              className="w-full text-left p-3.5 rounded-lg border bg-card hover:bg-muted/40 hover:border-foreground/25 transition-colors flex items-start gap-3 cursor-pointer"
            >
              <div className="size-9 rounded-md bg-muted text-foreground flex items-center justify-center shrink-0 mt-0.5">
                <Users className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm text-foreground">
                    Posko Pengungsian / Butuh Logistik
                  </p>
                  <Badge variant="outline" className="text-[10px]">
                    Logistik
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Kekurangan air bersih, tenda keluarga, makanan bayi, atau obat-obatan.
                </p>
              </div>
            </button>
          </div>
        )}

        {/* STEP 2: DETAIL FORM */}
        {step === "form" && (
          <form id={reportFormId} onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="flex items-center justify-between pb-2 border-b">
              <Badge variant="secondary" className="gap-1 text-xs">
                {category === "sar_evakuasi" && "Evakuasi Jiwa / Tertimbun"}
                {category === "jalan_jembatan" && "Akses Jalan / Jembatan"}
                {category === "posko_logistik" && "Posko & Logistik"}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep("category")}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Ganti Kategori
              </Button>
            </div>

            {/* Lokasi Patokan */}
            <div className="space-y-1.5">
              <label htmlFor={locationInputId} className="text-xs font-medium text-foreground">
                Patokan / Alamat Lokasi (Opsional bila GPS Terkunci)
              </label>
              <Input
                id={locationInputId}
                placeholder="Otomatis gunakan koordinat GPS jika dikosongkan"
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>

            {/* Kontak Warga */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor={nameInputId} className="text-xs font-medium text-foreground">
                  Nama Pelapor
                </label>
                <Input
                  id={nameInputId}
                  placeholder="Nama Lengkap"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={phoneInputId} className="text-xs font-medium text-foreground">
                  No. HP / WhatsApp *
                </label>
                <Input
                  id={phoneInputId}
                  required
                  type="tel"
                  placeholder="0812xxxxxxx"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Keterangan */}
            <div className="space-y-1.5">
              <label htmlFor={notesInputId} className="text-xs font-medium text-foreground">
                Rincian Situasi & Jumlah Korban (Bila Tahu)
              </label>
              <Textarea
                id={notesInputId}
                rows={3}
                placeholder="Tuliskan kebutuhan mendesak atau kondisi korban..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs sm:text-sm resize-none"
              />
            </div>

            {/* Lampiran Foto Kamera */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Camera className="size-4 text-foreground" />
                <span>Foto Lokasi Kamera Langsung:</span>
              </div>
              <label className="cursor-pointer">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-7 text-xs font-medium"
                >
                  <span>{hasPhoto ? "✓ Foto Terlampir" : "Ambil Foto"}</span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setHasPhoto(Boolean(e.target.files?.length))}
                />
              </label>
            </div>

            {/* Legal Notice Bersih Konsisten */}
            <div className="rounded-lg border bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground">Ketertiban Pelaporan Darurat:</p>
              <p className="mt-0.5">
                Laporan palsu saat bencana diancam <strong>Pasal 220 KUHP</strong>. GPS membantu prioritas, tetapi lokasi manual tetap dapat diverifikasi petugas.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting || (!coords && locationDescription.trim().length < 3)}
                className="w-full sm:w-auto font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Mengirim Laporan...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="size-3.5" />
                    <span>Kirim Laporan Darurat</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === "success" && (
          <div className="text-center py-4 space-y-4">
            <div className="size-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 grid place-items-center mx-auto">
              <CheckCircle2 className="size-6" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-foreground">Laporan Berhasil Diterima</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Pusat Komando BPBD dan tim terdekat telah menerima laporan Anda.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border bg-muted/50 text-center space-y-1">
              <p className="text-[11px] text-muted-foreground uppercase font-medium">Kode Lacak Laporan</p>
              <p className="text-xl font-mono font-bold text-foreground tracking-wider">{resultCode}</p>
              <p className="text-[11px] text-muted-foreground">
                Petugas akan menghubungi nomor telepon yang Anda daftarkan.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full"
              >
                Tutup
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
