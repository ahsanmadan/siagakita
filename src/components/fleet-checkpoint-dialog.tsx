"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateFleetCheckpointAction } from "@/lib/actions/operations";
import { toast } from "sonner";
import { MapPin, Navigation, Truck, Loader2 } from "lucide-react";
import type { Distribution } from "@/lib/types";

interface FleetCheckpointDialogProps {
  distribution: Distribution;
  trigger?: React.ReactNode;
}

const CHECKPOINT_SUGGESTIONS = [
  "Gudang Logistik BPBD (Persiapan)",
  "Gerbang Tol / Jalur Utama",
  "Simpang Sicincin - Padang Panjang",
  "Simpang Tembok, Bukittinggi",
  "Jalur Evakuasi Koto Baru",
  "Pekarangan Posko Pengungsian",
];

export function FleetCheckpointDialog({
  distribution,
  trigger,
}: FleetCheckpointDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [status, setStatus] = useState<string>(distribution.status || "dalam-perjalanan");
  const [checkpointName, setCheckpointName] = useState(distribution.lastLocationName || "");
  const [driverNote, setDriverNote] = useState(distribution.driverNote || "");
  const [progress, setProgress] = useState(String(distribution.progress || 60));
  const [latitude, setLatitude] = useState(distribution.lastCoordinates?.latitude ? String(distribution.lastCoordinates.latitude) : "");
  const [longitude, setLongitude] = useState(distribution.lastCoordinates?.longitude ? String(distribution.lastCoordinates.longitude) : "");
  const [updatedByRole, setUpdatedByRole] = useState<string>("driver");
  const [isLocating, setIsLocating] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolokasi tidak didukung browser ini.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setIsLocating(false);
        toast.success("Koordinat lokasi checkpoint berhasil disalin.");
      },
      (err) => {
        setIsLocating(false);
        toast.error("Gagal mendeteksi koordinat perangkat: " + err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!checkpointName.trim()) {
      toast.error("Nama lokasi / checkpoint wajib diisi.");
      return;
    }

    const formData = new FormData();
    formData.append("code", distribution.id);
    formData.append("status", status);
    formData.append("checkpointName", checkpointName.trim());
    formData.append("progress", progress);
    formData.append("updatedByRole", updatedByRole);
    if (driverNote.trim()) formData.append("driverNote", driverNote.trim());
    if (latitude) formData.append("latitude", latitude);
    if (longitude) formData.append("longitude", longitude);

    startTransition(async () => {
      const res = await updateFleetCheckpointAction(formData);
      if (res.ok) {
        toast.success(res.message);
        setOpen(false);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
            <Truck className="size-3.5" />
            <span>Update Checkpoint</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="rounded bg-sky-500/15 px-2 py-0.5 font-sans text-xs font-semibold text-sky-700 dark:text-sky-300">
              {distribution.vehicleCode || distribution.id}
            </span>
            <span className="text-xs text-muted-foreground font-sans">Lokasi Terakhir Diperbarui</span>
          </div>
          <DialogTitle className="font-heading text-lg font-bold">
            Pembaruan Posisi Armada Logistik
          </DialogTitle>
          <DialogDescription className="font-sans text-xs text-muted-foreground">
            Perbarui titik singgah perjalanan armada menuju {distribution.destination}. Sistem mencatat model lokasi terakhir diperbarui secara berkala.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 font-sans">
          {/* Status Tahap */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Status Tahap Perjalanan</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disiapkan" className="text-xs">1. Disiapkan di Gudang</SelectItem>
                <SelectItem value="berangkat" className="text-xs">2. Armada Berangkat</SelectItem>
                <SelectItem value="dalam_perjalanan" className="text-xs">3. Dalam Perjalanan (Menuju Posko)</SelectItem>
                <SelectItem value="tertunda" className="text-xs">4. Perjalanan Tertunda (Kendala/Macet)</SelectItem>
                <SelectItem value="tiba_di_posko" className="text-xs">5. Tiba di Pekarangan Posko</SelectItem>
                <SelectItem value="diterima_posko" className="text-xs">6. Bantuan Diterima Posko</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lokasi Checkpoint */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Nama Lokasi Checkpoint</Label>
              <span className="text-[10.5px] text-muted-foreground">Titik Singgah Terakhir</span>
            </div>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={checkpointName}
                onChange={(e) => setCheckpointName(e.target.value)}
                placeholder="Contoh: Simpang Tembok, Bukittinggi"
                className="pl-8 h-9 text-xs"
                required
              />
            </div>
            {/* Quick Fill Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {CHECKPOINT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setCheckpointName(suggestion)}
                  className="rounded border border-border/70 bg-muted/40 px-2 py-0.5 text-[10.5px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Koordinat GPS (Opsional) */}
          <div className="space-y-1.5 rounded-lg border border-border/80 bg-muted/20 p-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Koordinat Titik Simpul (Opsional)</Label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline"
              >
                {isLocating ? <Loader2 className="size-3 animate-spin" /> : <Navigation className="size-3" />}
                <span>Salin GPS Saya</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase">Latitude</span>
                <Input
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="-0.3120"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase">Longitude</span>
                <Input
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="100.3780"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Progress & Pelapor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Progress (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Sumber Update</Label>
              <Select value={updatedByRole} onValueChange={setUpdatedByRole}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Sumber" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="driver" className="text-xs">Supir Armada</SelectItem>
                  <SelectItem value="officer" className="text-xs">Petugas Lapangan</SelectItem>
                  <SelectItem value="shelter" className="text-xs">Pengelola Posko</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Catatan Lapangan Supir */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Catatan Kondisi Jalan / Kendala</Label>
            <Textarea
              value={driverNote}
              onChange={(e) => setDriverNote(e.target.value)}
              placeholder="Contoh: Arus lalu lintas padat merayap. Hujan gerimis, konvoi aman."
              className="text-xs min-h-[60px] resize-none"
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2 pt-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-9 text-xs bg-sky-600 hover:bg-sky-700 text-white font-medium"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                "Kirim Update Checkpoint"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
