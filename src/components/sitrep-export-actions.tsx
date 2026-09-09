"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, FileDown, Link2, Printer } from "lucide-react";
import { SitrepDocument, type SitrepMapPoint } from "@/components/sitrep-document";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SitrepData } from "@/lib/sitrep";

type CopyState = "idle" | "copied" | "failed";

export function SitrepExportActions({
  data,
  mapPoints,
  publicPath,
}: {
  data: SitrepData;
  mapPoints: SitrepMapPoint[];
  publicPath: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const flashCopyState = useCallback((state: CopyState) => {
    setCopyState(state);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyState("idle"), 2200);
  }, []);

  const copyPublicLink = useCallback(async () => {
    const absoluteLink = new URL(publicPath, window.location.origin).toString();

    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(absoluteLink);
      flashCopyState("copied");
    } catch {
      flashCopyState("failed");
    }
  }, [flashCopyState, publicPath]);

  const printSitrep = useCallback(() => {
    window.print();
  }, []);

  const copyLabel = copyState === "copied"
    ? "Tautan tersalin"
    : copyState === "failed"
      ? "Salin manual dari pratinjau"
      : "Salin Tautan Publik";

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="sitrep-action min-h-11 whitespace-nowrap"
            onClick={copyPublicLink}
          >
            <span className="t-icon-swap sitrep-copy-icon" data-state={copyState === "copied" ? "b" : "a"} aria-hidden="true">
              <span className="t-icon" data-icon="a"><Link2 /></span>
              <span className="t-icon" data-icon="b"><Check /></span>
            </span>
            <span aria-live="polite">{copyLabel}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {copyState === "failed"
            ? "Peramban menolak akses papan klip. Salin tautan dari pratinjau SitRep."
            : "Tautan peta publik kejadian ini, aman dibagikan ke warga."}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            className="sitrep-action min-h-11 whitespace-nowrap"
            onClick={() => setPreviewOpen(true)}
          >
            <Printer />
            Cetak SitRep / Unduh PDF
          </Button>
        </TooltipTrigger>
        <TooltipContent>Buka pratinjau laporan situasi format A4 sebelum dicetak.</TooltipContent>
      </Tooltip>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sitrep-preview-dialog flex max-h-[92dvh] w-[min(62rem,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 text-left">
            <DialogTitle className="text-base">Pratinjau Laporan Situasi Bencana</DialogTitle>
            <DialogDescription>
              {data.documentNumber} · format A4. Pada dialog cetak pilih “Save as PDF” untuk mengunduh dokumen.
            </DialogDescription>
          </DialogHeader>
          <div className="sitrep-preview-scroll min-h-0 flex-1 overflow-auto bg-muted/40 p-4 sm:p-6">
            <div className="sitrep-page">
              <SitrepDocument data={data} mapPoints={mapPoints} />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-5 py-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="min-h-11">Tutup</Button>
            </DialogClose>
            <Button type="button" className="min-h-11" onClick={printSitrep}>
              <FileDown />
              Cetak atau simpan PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
