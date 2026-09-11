"use client";

import { useEffect, useRef, useState } from "react";
import {
  Crosshair,
  FilePlus,
  Loader2,
  MapPin,
  Minus,
  Plus,
} from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createFieldReport } from "@/lib/actions/operations";
import { cn } from "@/lib/utils";

interface Coords {
  lat: number;
  lon: number;
}

// Web Mercator Slippy Map Math (Pure 2D - No WebGL context dependency)
function project(lat: number, lon: number, zoom: number) {
  const siny = Math.sin((lat * Math.PI) / 180);
  const clampedSiny = Math.min(Math.max(siny, -0.9999), 0.9999);
  const scale = 256 * Math.pow(2, zoom);
  const x = scale * (0.5 + lon / 360);
  const y = scale * (0.5 - Math.log((1 + clampedSiny) / (1 - clampedSiny)) / (4 * Math.PI));
  return { x, y };
}

function unproject(x: number, y: number, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const lon = (x / scale - 0.5) * 360;
  const y2 = 0.5 - y / scale;
  const lat = 90 - (360 * Math.atan(Math.exp(-y2 * (2 * Math.PI)))) / Math.PI;
  return { lat, lon };
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`,
      {
        headers: { "Accept-Language": "id-ID, id, en" },
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("Geocoding network error");
    const data = await res.json();
    const addr = data.address;
    if (addr) {
      const parts = [
        addr.village || addr.suburb || addr.neighbourhood || addr.quarter || addr.town || addr.city_district,
        addr.city || addr.county || addr.regency,
        addr.state,
      ].filter(Boolean);
      if (parts.length > 0) {
        return `${parts.join(", ")} (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
      }
    }
    if (data.display_name) {
      const shortName = data.display_name.split(",").slice(0, 3).join(",").trim();
      return `${shortName} (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
    }
  } catch {
    // Fallback if network or timeout
  }
  return `Titik Lokasi (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
}

// Lightweight 2D Raster Map Picker (Prevents WebGL context loss errors)
function RasterMapPicker({
  selectedCoords,
  onSelectCoords,
}: {
  selectedCoords: Coords | null;
  onSelectCoords: (coords: Coords) => void;
}) {
  const defaultCenter = selectedCoords ?? { lat: -6.8123, lon: 107.1345 };
  const [mapCenter, setMapCenter] = useState<Coords>(defaultCenter);
  const [zoom, setZoom] = useState(selectedCoords ? 13 : 11);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 440, height: 210 });

  const isPointerDownRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const centerStartRef = useRef(mapCenter);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setDimensions({
            width: Math.round(entry.contentRect.width),
            height: Math.round(entry.contentRect.height),
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (selectedCoords) {
      setMapCenter(selectedCoords);
    }
  }, [selectedCoords]);

  const { width, height } = dimensions;
  const centerWorld = project(mapCenter.lat, mapCenter.lon, zoom);
  const topLeftWorld = {
    x: centerWorld.x - width / 2,
    y: centerWorld.y - height / 2,
  };

  const numTiles = Math.pow(2, zoom);
  const minTileX = Math.floor(topLeftWorld.x / 256);
  const maxTileX = Math.floor((topLeftWorld.x + width) / 256);
  const minTileY = Math.max(0, Math.floor(topLeftWorld.y / 256));
  const maxTileY = Math.min(numTiles - 1, Math.floor((topLeftWorld.y + height) / 256));

  const tiles: { key: string; url: string; left: number; top: number }[] = [];
  for (let tx = minTileX; tx <= maxTileX; tx++) {
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      const wrappedTx = ((tx % numTiles) + numTiles) % numTiles;
      tiles.push({
        key: `${zoom}-${wrappedTx}-${ty}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedTx}/${ty}.png`,
        left: Math.round(tx * 256 - topLeftWorld.x),
        top: Math.round(ty * 256 - topLeftWorld.y),
      });
    }
  }

  const markerWorld = selectedCoords ? project(selectedCoords.lat, selectedCoords.lon, zoom) : null;
  const markerScreen = markerWorld
    ? {
        x: Math.round(markerWorld.x - topLeftWorld.x),
        y: Math.round(markerWorld.y - topLeftWorld.y),
      }
    : null;

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    isPointerDownRef.current = true;
    isDraggingRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    centerStartRef.current = mapCenter;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isPointerDownRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      isDraggingRef.current = true;
    }

    const startWorld = project(centerStartRef.current.lat, centerStartRef.current.lon, zoom);
    const newCenterWorld = { x: startWorld.x - dx, y: startWorld.y - dy };
    const newCenter = unproject(newCenterWorld.x, newCenterWorld.y, zoom);
    setMapCenter(newCenter);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    isPointerDownRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (isDraggingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const worldX = topLeftWorld.x + clickX;
    const worldY = topLeftWorld.y + clickY;
    const clickedCoords = unproject(worldX, worldY, zoom);
    onSelectCoords(clickedCoords);
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(18, z + 1));
    } else if (e.deltaY > 0) {
      setZoom((z) => Math.max(4, z - 1));
    }
  }

  return (
    <div className="space-y-1.5 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-muted-foreground px-0.5">
        <span className="flex items-center gap-1 font-medium text-foreground">
          <MapPin className="size-3 text-red-500 shrink-0" />
          Klik pada peta untuk menandai lokasi kejadian
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Preset:</span>
          <button
            type="button"
            onClick={() => {
              const c = { lat: -6.8123, lon: 107.1345 };
              setMapCenter(c);
              setZoom(13);
              onSelectCoords(c);
            }}
            className="px-1.5 py-0.5 rounded text-[10px] border border-border/70 hover:bg-muted"
          >
            Cianjur
          </button>
          <button
            type="button"
            onClick={() => {
              const c = { lat: -0.3167, lon: 100.3833 };
              setMapCenter(c);
              setZoom(13);
              onSelectCoords(c);
            }}
            className="px-1.5 py-0.5 rounded text-[10px] border border-border/70 hover:bg-muted"
          >
            Agam
          </button>
          <button
            type="button"
            onClick={() => {
              const c = { lat: -6.8944, lon: 110.6386 };
              setMapCenter(c);
              setZoom(13);
              onSelectCoords(c);
            }}
            className="px-1.5 py-0.5 rounded text-[10px] border border-border/70 hover:bg-muted"
          >
            Demak
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        onWheel={handleWheel}
        className="w-full h-52 rounded-lg border border-border/80 bg-muted/40 relative overflow-hidden select-none cursor-crosshair touch-none"
      >
        {/* Render raster tiles */}
        <div className="absolute inset-0 pointer-events-none">
          {tiles.map((tile) => (
            <img
              key={tile.key}
              src={tile.url}
              alt=""
              loading="lazy"
              draggable={false}
              className="absolute w-64 h-64 select-none pointer-events-none transition-opacity duration-150"
              style={{
                left: `${tile.left}px`,
                top: `${tile.top}px`,
              }}
            />
          ))}
        </div>

        {/* Selected Pin Marker */}
        {markerScreen && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full pointer-events-none transition-transform duration-100 ease-out z-10"
            style={{
              left: `${markerScreen.x}px`,
              top: `${markerScreen.y}px`,
            }}
          >
            <div className="flex flex-col items-center">
              <div className="size-6 text-red-600 drop-shadow-md animate-bounce">
                <MapPin className="size-6 fill-red-600 text-white" />
              </div>
              <div className="size-1.5 rounded-full bg-red-600 shadow-xs mt-[-2px]" />
            </div>
          </div>
        )}

        {/* Zoom Controls */}
        <div className="absolute right-2 bottom-2 flex flex-col gap-1 z-20 shadow-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => Math.min(18, z + 1));
            }}
            className="size-7 rounded bg-background/95 hover:bg-background border border-border/80 flex items-center justify-center text-foreground cursor-pointer shadow-xs transition-colors"
            title="Perbesar Peta"
          >
            <Plus className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => Math.max(4, z - 1));
            }}
            className="size-7 rounded bg-background/95 hover:bg-background border border-border/80 flex items-center justify-center text-foreground cursor-pointer shadow-xs transition-colors"
            title="Perkecil Peta"
          >
            <Minus className="size-3.5" />
          </button>
        </div>

        {/* Coordinates Badge */}
        {selectedCoords && (
          <div className="absolute left-2 bottom-2 z-20 pointer-events-none">
            <Badge variant="secondary" className="bg-background/90 text-foreground border border-border/80 text-[10px] font-mono shadow-xs backdrop-blur-xs">
              📍 {selectedCoords.lat.toFixed(5)}, {selectedCoords.lon.toFixed(5)}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

export function CreateReportDialog({ defaultReporter }: { defaultReporter?: string }) {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState("");
  const [reporter, setReporter] = useState(defaultReporter ?? "");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<"Petugas" | "Web">("Petugas");
  const [severity, setSeverity] = useState<"critical" | "major" | "warning">("warning");
  const [notes, setNotes] = useState("");

  // Map & GPS State
  const [showMap, setShowMap] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Computed summary with GPS & Contact
  const gpsTag = coords ? `[GPS: ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}]` : "";
  const contactTag = phone.trim() ? `[KONTAK: ${phone.trim()}]` : "";
  const extraTags = [gpsTag, contactTag].filter(Boolean).join(" ");
  const summaryWithMetadata = extraTags ? `${notes.trim()} ${extraTags}` : notes.trim();

  function resetForm() {
    setLocation("");
    setPhone("");
    setNotes("");
    setSeverity("warning");
    setShowMap(false);
    setCoords(null);
  }

  async function handleSelectMapCoords(newCoords: Coords) {
    setCoords(newCoords);
    setIsGeocoding(true);
    const locName = await reverseGeocode(newCoords.lat, newCoords.lon);
    setLocation(locName);
    setIsGeocoding(false);
  }

  function handleGetLiveGps() {
    if (!navigator.geolocation) {
      alert("Perangkat atau browser Anda tidak mendukung GPS.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const newCoords = { lat, lon };
        setCoords(newCoords);
        setIsLocating(false);
        setShowMap(true);

        setIsGeocoding(true);
        const locName = await reverseGeocode(lat, lon);
        setLocation(locName);
        setIsGeocoding(false);
      },
      (err) => {
        setIsLocating(false);
        alert(`Gagal membaca sinyal GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 font-sans text-xs font-medium shadow-xs">
          <Plus className="size-4" />
          Buat Laporan Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
            <FilePlus className="size-4 text-primary" />
            Catat Laporan Masuk Manual
          </DialogTitle>
          <DialogDescription className="font-sans text-xs text-muted-foreground leading-relaxed">
            Gunakan formulir ini untuk mencatat laporan darurat yang diterima langsung melalui telepon hotline, radio komunikasi (HT), atau laporan langsung petugas lapangan.
          </DialogDescription>
        </DialogHeader>

        <ActionForm
          action={createFieldReport}
          className="space-y-3.5 py-1 font-sans"
          onSuccess={() => {
            setOpen(false);
            resetForm();
          }}
        >
          <input type="hidden" name="summary" value={summaryWithMetadata} />
          <input type="hidden" name="channel" value={channel} />
          <input type="hidden" name="severity" value={severity} />

          {/* Lokasi Kejadian with Map & GPS Pickers */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="report-location" className="text-xs font-medium text-foreground">
                Lokasi Kejadian <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowMap((prev) => !prev)}
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded border transition-colors cursor-pointer",
                    showMap
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 hover:bg-muted text-foreground border-border/80",
                  )}
                >
                  <MapPin className="size-3" />
                  <span>{showMap ? "Tutup Peta" : "Pilih dari Peta"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleGetLiveGps}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded border border-border/80 bg-muted/50 hover:bg-muted text-foreground transition-colors cursor-pointer disabled:opacity-50"
                  title="Deteksi posisi GPS perangkat saat ini"
                >
                  {isLocating ? <Loader2 className="size-3 animate-spin" /> : <Crosshair className="size-3" />}
                  <span>{isLocating ? "Mencari..." : "GPS Saya"}</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <Input
                id="report-location"
                name="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Contoh: Desa Gasol RT 03/02, Kec. Cugenang"
                required
                minLength={3}
                className="h-9 text-xs pr-8"
              />
              {isGeocoding && (
                <div className="absolute right-2.5 top-2.5">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Interactive 2D Map Picker */}
            {showMap && (
              <div className="rounded-lg border border-border/80 p-2 bg-muted/20">
                <RasterMapPicker
                  selectedCoords={coords}
                  onSelectCoords={handleSelectMapCoords}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="report-reporter" className="text-xs font-medium text-foreground">
                Nama Pelapor / Sumber <span className="text-destructive">*</span>
              </Label>
              <Input
                id="report-reporter"
                name="reporter"
                value={reporter}
                onChange={(e) => setReporter(e.target.value)}
                placeholder="Nama pelapor / unit"
                required
                minLength={3}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report-phone" className="text-xs font-medium text-foreground">
                No. Telepon / Kontak
              </Label>
              <Input
                id="report-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812xxxx (opsional)"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="report-channel" className="text-xs font-medium text-foreground">
                Saluran Penerimaan
              </Label>
              <Select value={channel} onValueChange={(val: "Petugas" | "Web") => setChannel(val)}>
                <SelectTrigger id="report-channel" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Petugas">Petugas Lapangan / Radio HT</SelectItem>
                  <SelectItem value="Web">Hotline Telepon / Call Center</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="report-severity" className="text-xs font-medium text-foreground">
                Tingkat Keparahan
              </Label>
              <Select value={severity} onValueChange={(val: "critical" | "major" | "warning") => setSeverity(val)}>
                <SelectTrigger id="report-severity" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">🚨 Kritis (Ancaman Jiwa / SAR)</SelectItem>
                  <SelectItem value="major">⚠️ Mendesak (Kerusakan Berat)</SelectItem>
                  <SelectItem value="warning">🟡 Waspada (Pantauan Awal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="report-notes" className="text-xs font-medium text-foreground">
              Ringkasan Laporan Lapangan <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="report-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jelaskan kondisi bencana, dampak kerusakan, kebutuhan mendesak, atau jumlah korban terdampak..."
              required
              minLength={10}
              className="min-h-20 text-xs leading-relaxed"
            />
            <span className="text-[11px] text-muted-foreground">Minimal 10 karakter untuk verifikasi petugas.</span>
          </div>

          <SubmitButton pendingLabel="Menyimpan laporan..." className="w-full text-xs font-medium h-9">
            Simpan ke Antrean Triase
          </SubmitButton>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
