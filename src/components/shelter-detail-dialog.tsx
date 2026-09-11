"use client";

import { useState } from "react";
import { Eye, MapPin, Users, Baby, PersonStanding, HeartPulse, AlertTriangle, ShieldCheck, Paperclip } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/status-badge";
import type { Shelter } from "@/lib/types";

interface ShelterDetailDialogProps {
  shelter: Shelter;
  onSelectForEdit?: (shelterId: string) => void;
}

export function ShelterDetailDialog({ shelter, onSelectForEdit }: ShelterDetailDialogProps) {
  const [open, setOpen] = useState(false);
  const occupancyRatio = Math.round((shelter.population.total / (shelter.capacity || 1)) * 100);
  const isOverCapacity = shelter.population.total > shelter.capacity;

  const handleEditClick = () => {
    setOpen(false);
    if (onSelectForEdit) {
      onSelectForEdit(shelter.id);
    }
    const el = document.getElementById("shelter-quick-forms-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground">
          <Eye className="size-3.5 mr-1" />
          Detail
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <StatusBadge status={shelter.status} />
            {isOverCapacity && (
              <Badge variant="destructive" className="text-[10px] h-5">
                Melebihi Kapasitas
              </Badge>
            )}
          </div>
          <DialogTitle className="font-heading text-lg font-bold text-foreground">
            {shelter.name}
          </DialogTitle>
          <DialogDescription className="font-sans text-xs flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="size-3.5 shrink-0 text-primary" />
            {shelter.location} · Terakhir diperbarui: {shelter.lastUpdate}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 font-sans">
          {/* Capacity Progress Box */}
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Daya Tampung Posko</span>
              <span className="font-semibold tabular-nums text-foreground">
                {occupancyRatio}% ({shelter.population.total.toLocaleString("id-ID")} / {shelter.capacity.toLocaleString("id-ID")} Jiwa)
              </span>
            </div>
            <Progress
              value={Math.min(100, occupancyRatio)}
              className={isOverCapacity ? "[&_[data-slot=progress-indicator]]:bg-red-600" : ""}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Status: {isOverCapacity ? "Kritis (Penuh)" : "Tersedia"}</span>
              <span>
                {isOverCapacity
                  ? `Defisit kapasitas ${shelter.population.total - shelter.capacity} jiwa`
                  : `Sisa kuota ${shelter.capacity - shelter.population.total} jiwa`}
              </span>
            </div>
          </div>

          {/* Breakdown Kelompok Rentan */}
          <div className="space-y-2">
            <h4 className="font-heading text-xs font-bold text-foreground flex items-center gap-1.5">
              <Users className="size-3.5 text-primary" />
              Rincian Demografi Pengungsi
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg border border-border/60 bg-card p-2.5 space-y-0.5">
                <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  <Baby className="size-3" /> Anak/Balita
                </div>
                <div className="text-base font-bold tabular-nums">
                  {shelter.population.children.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-2.5 space-y-0.5">
                <div className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                  <PersonStanding className="size-3" /> Lansia
                </div>
                <div className="text-base font-bold tabular-nums">
                  {shelter.population.elderly.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-2.5 space-y-0.5">
                <div className="flex items-center gap-1 text-[11px] text-pink-600 dark:text-pink-400 font-medium">
                  <HeartPulse className="size-3" /> Ibu Hamil
                </div>
                <div className="text-base font-bold tabular-nums">
                  {shelter.population.pregnant.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-2.5 space-y-0.5">
                <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                  <ShieldCheck className="size-3" /> Disabilitas
                </div>
                <div className="text-base font-bold tabular-nums">
                  {shelter.population.disability.toLocaleString("id-ID")}
                </div>
              </div>
            </div>
          </div>

          {/* Kebutuhan Tercatat di Posko */}
          <div className="space-y-2">
            <h4 className="font-heading text-xs font-bold text-foreground">
              Kebutuhan Aktif di Posko Ini ({shelter.needs.length})
            </h4>
            {shelter.needs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1">Belum ada pengajuan kebutuhan khusus tercatat.</p>
            ) : (
              <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card max-h-40 overflow-y-auto">
                {shelter.needs.map((need) => (
                  <div key={need.id} className="flex items-center justify-between p-2.5 text-xs">
                    <div>
                      <p className="font-semibold text-foreground">{need.item}</p>
                      <p className="text-[11px] text-muted-foreground">{need.category} · Butuh: {need.requested} {need.unit}</p>
                    </div>
                    <StatusBadge status={need.urgency} className="text-[10px]" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dokumen Bukti & Lampiran Posko */}
          {shelter.attachments && shelter.attachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-heading text-xs font-bold text-foreground flex items-center gap-1.5">
                <Paperclip className="size-3.5 text-primary" />
                Dokumentasi &amp; Berkas Bukti ({shelter.attachments.length})
              </h4>
              <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card max-h-36 overflow-y-auto">
                {shelter.attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between p-2.5 text-xs">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <span className="truncate font-medium text-foreground">{att.originalFileName || att.filePath}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 uppercase font-mono">
                        {att.visibility}
                      </Badge>
                    </div>
                    {att.fileSize && (
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {Math.round(att.fileSize / 1024)} KB
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              size="sm"
              onClick={handleEditClick}
              className="font-sans text-xs"
            >
              Kelola di Form Pembaruan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
