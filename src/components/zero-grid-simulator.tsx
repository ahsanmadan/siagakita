"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  MessageSquareText,
  Pencil,
  Phone,
  Radio,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  acceptSmsReportAction,
  ingestSmsMessageAction,
  markDuplicateSmsAction,
  rejectSmsAction,
} from "@/lib/actions/operations";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { parseZeroGridSms } from "@/lib/sms-parser";
import type { SmsMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ZeroGridSimulatorProps {
  smsMessages?: SmsMessage[];
  canVerify?: boolean;
}

export function ZeroGridSimulator({
  smsMessages = [],
  canVerify = false,
}: ZeroGridSimulatorProps) {
  const [activeTab, setActiveTab] = useState<"input" | "review">("input");
  const [message, setMessage] = useState("LAPOR#AGM04#AIR_BERSIH#1200#JEMBATAN_PUTUS");
  const [senderPhone, setSenderPhone] = useState("+628129990112");

  // State for Edit & Accept Dialog
  const [editMessage, setEditMessage] = useState<SmsMessage | null>(null);
  const [editLocation, setEditLocation] = useState("");
  const [editReporter, setEditReporter] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editSeverity, setEditSeverity] = useState<"critical" | "major" | "warning">("major");

  // State for Reject Dialog
  const [rejectMessage, setRejectMessage] = useState<SmsMessage | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // State for Duplicate Dialog
  const [duplicateMessage, setDuplicateMessage] = useState<SmsMessage | null>(null);
  const [duplicateReason, setDuplicateReason] = useState("");

  const liveParsed = useMemo(
    () => parseZeroGridSms(message, senderPhone),
    [message, senderPhone]
  );

  const pendingSmsCount = smsMessages.filter(
    (s) => s.status === "parsed" || s.status === "pending"
  ).length;

  const handleOpenEdit = (msg: SmsMessage) => {
    const p = msg.parseResult;
    setEditMessage(msg);
    setEditLocation(p?.location || "Lokasi Lapangan");
    setEditReporter(p?.reporterName || `Relawan SMS (${msg.senderPhone})`);
    setEditSummary(p?.needsSummary || `[SMS] ${msg.rawMessage}`);
    setEditSeverity((p?.severity as "critical" | "major" | "warning") || "major");
  };

  const formatWib = (iso: string) => {
    try {
      return (
        new Intl.DateTimeFormat("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        }).format(new Date(iso)) + " WIB"
      );
    } catch {
      return iso;
    }
  };

  return (
    <Card className="border border-border/70 bg-card shadow-xs h-fit font-sans">
      <CardHeader className="gap-2 pb-2.5 pt-4 px-4 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary font-sans">
            <MessageSquareText className="size-4 shrink-0" />
            <span>SMS Zero-Grid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50/70 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 text-[10px] font-sans font-medium px-2 py-0 h-5"
            >
              Offline LoRa / Mesh
            </Badge>
          </div>
        </div>
        <CardTitle className="font-heading text-base font-semibold tracking-tight text-foreground">
          Pusat SMS Darurat Lapangan
        </CardTitle>
        <CardDescription className="font-sans text-xs text-muted-foreground leading-relaxed">
          Penerimaan pesan teks darurat Zero-Grid, ekstraksi terstruktur otomatis, dan validasi operator.
        </CardDescription>

        {/* Tab Switcher */}
        <div className="flex rounded-md border border-border/70 bg-muted/40 p-0.5 text-xs font-medium mt-1">
          <button
            type="button"
            onClick={() => setActiveTab("input")}
            className={cn(
              "flex-1 py-1 px-2.5 rounded text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs",
              activeTab === "input"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Send className="size-3" />
            <span>Kirim SMS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={cn(
              "flex-1 py-1 px-2.5 rounded text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs",
              activeTab === "review"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Radio className="size-3" />
            <span>Antrean Review</span>
            {pendingSmsCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
                {pendingSmsCount}
              </span>
            )}
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3.5 pb-4 pt-0 px-4 sm:px-5">
        {activeTab === "input" ? (
          /* TAB 1: INPUT & SIMULATOR */
          <ActionForm action={ingestSmsMessageAction} className="space-y-3.5">
            <input type="hidden" name="gateway" value="Zero-Grid LoRa/SMS Mesh" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-1 space-y-1">
                <Label htmlFor="senderPhone" className="font-sans text-xs font-medium text-foreground">
                  Nomor Pengirim
                </Label>
                <Input
                  id="senderPhone"
                  name="senderPhone"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="h-9 font-mono text-xs"
                  placeholder="+62812..."
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="message" className="font-sans text-xs font-medium text-foreground">
                  Format Pesan SMS
                </Label>
                <Input
                  id="message"
                  name="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="h-9 font-mono text-xs"
                  placeholder="LAPOR#KODE#KEBUTUHAN#JUMLAH#KETERANGAN"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-muted-foreground font-sans block">
                Preset Skenario Lapangan:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMessage("LAPOR#AGM04#AIR_BERSIH#1200#JEMBATAN_PUTUS_KORBAN_TERISOLIR");
                    setSenderPhone("+628129990112");
                  }}
                  className="text-[11px] font-sans px-2 py-0.5 rounded border border-border/80 bg-muted/40 hover:bg-muted text-foreground transition-colors cursor-pointer"
                >
                  Agam (Air Bersih)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMessage("LAPOR#CJR02#TENDA_DARURAT#50#30_KK_TERDAMPAK_GEMPA");
                    setSenderPhone("+628131234567");
                  }}
                  className="text-[11px] font-sans px-2 py-0.5 rounded border border-border/80 bg-muted/40 hover:bg-muted text-foreground transition-colors cursor-pointer"
                >
                  Cianjur (Tenda)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMessage("LAPOR#DMK01#PERAHU_KARET#5#GENANGAN_1M_WARGA_TERJEBAK");
                    setSenderPhone("+628198765432");
                  }}
                  className="text-[11px] font-sans px-2 py-0.5 rounded border border-border/80 bg-muted/40 hover:bg-muted text-foreground transition-colors cursor-pointer"
                >
                  Demak (Perahu)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMessage("Butuh makanan dan selimut segera di balai desa, air sudah sepinggang tolong bantu");
                    setSenderPhone("+628520011223");
                  }}
                  className="text-[11px] font-sans px-2 py-0.5 rounded border border-border/80 bg-muted/40 hover:bg-muted text-amber-700 dark:text-amber-400 transition-colors cursor-pointer"
                >
                  Format Bebas (Uji Fallback)
                </button>
              </div>
            </div>

            {/* Live Parsing Preview */}
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2.5 font-sans">
              <div className="flex items-center justify-between text-xs">
                <span className="font-heading font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary shrink-0" />
                  Live Preview Ekstraksi
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-sans font-medium h-5 px-1.5",
                    liveParsed.confidenceScore >= 0.8
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  )}
                >
                  Keyakinan {Math.round(liveParsed.confidenceScore * 100)}%
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded border bg-background/80 p-2">
                  <span className="text-[10px] text-muted-foreground block">Wilayah / Posko</span>
                  <span className="font-sans font-semibold text-foreground text-xs truncate block" title={liveParsed.location || ""}>
                    {liveParsed.location || "-"}
                  </span>
                </div>
                <div className="rounded border bg-background/80 p-2">
                  <span className="text-[10px] text-muted-foreground block">Jenis Kejadian</span>
                  <span className="font-sans font-medium text-foreground text-xs truncate block">
                    {liveParsed.disasterType || "Bencana"}
                  </span>
                </div>
                <div className="rounded border bg-background/80 p-2">
                  <span className="text-[10px] text-muted-foreground block">Permintaan</span>
                  <span className="font-mono font-semibold text-foreground text-xs">
                    {liveParsed.quantity ? `${liveParsed.quantity} ${liveParsed.unit}` : "Perlu verifikasi"}
                  </span>
                </div>
                <div className="rounded border bg-background/80 p-2">
                  <span className="text-[10px] text-muted-foreground block">Keparahan</span>
                  <span className="font-sans font-semibold text-xs capitalize text-rose-600 dark:text-rose-400">
                    {liveParsed.severity}
                  </span>
                </div>
              </div>

              {liveParsed.parseError ? (
                <div className="rounded border border-amber-300/80 bg-amber-50/60 dark:bg-amber-950/20 p-2 text-xs flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-tight">{liveParsed.parseError}</span>
                </div>
              ) : null}
            </div>

            <SubmitButton pendingLabel="Mengirim & mengekstrak..." className="w-full font-sans text-xs font-medium h-9">
              Kirim SMS ke Antrean Review
            </SubmitButton>
          </ActionForm>
        ) : (
          /* TAB 2: OPERATOR REVIEW QUEUE */
          <div className="space-y-3">
            {smsMessages.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Belum ada pesan SMS darurat yang tercatat. Kirim SMS baru dari tab &ldquo;Kirim SMS&rdquo;.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-0.5">
                {smsMessages.map((msg) => {
                  const p = msg.parseResult;
                  const isPending = msg.status === "parsed" || msg.status === "pending";
                  const isAccepted = msg.status === "accepted";
                  const isRejected = msg.status === "rejected";
                  const isDuplicate = msg.status === "duplicate";

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "rounded-lg border p-3 space-y-2.5 transition-colors text-xs",
                        isPending
                          ? "border-amber-300/80 bg-amber-50/20 dark:border-amber-500/30 dark:bg-amber-950/10"
                          : isAccepted
                          ? "border-emerald-300/80 bg-emerald-50/20 dark:border-emerald-500/30 dark:bg-emerald-950/10"
                          : "border-border bg-muted/10 opacity-75"
                      )}
                    >
                      {/* Message Meta Header */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
                          <Phone className="size-3" />
                          <span>{msg.senderPhone}</span>
                          <span>•</span>
                          <span>{formatWib(msg.receivedAt)}</span>
                        </div>

                        {isPending && (
                          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] h-5">
                            Menunggu Review
                          </Badge>
                        )}
                        {isAccepted && (
                          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] h-5">
                            Diterima Jadi Laporan
                          </Badge>
                        )}
                        {isRejected && (
                          <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[10px] h-5">
                            Ditolak
                          </Badge>
                        )}
                        {isDuplicate && (
                          <Badge variant="outline" className="border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300 text-[10px] h-5">
                            Duplikat
                          </Badge>
                        )}
                      </div>

                      {/* Raw Immutable SMS */}
                      <div className="rounded border bg-muted/40 p-2 font-mono text-[11px] text-foreground break-all">
                        <span className="text-[9px] text-muted-foreground block font-sans font-medium uppercase tracking-wider mb-0.5">
                          Teks SMS Asli:
                        </span>
                        {msg.rawMessage}
                      </div>

                      {/* Parsed Preview */}
                      {p && (
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] rounded border bg-background/90 p-2">
                          <div>
                            <span className="text-[9px] text-muted-foreground block">Wilayah:</span>
                            <span className="font-semibold text-foreground truncate block" title={p.location || ""}>
                              {p.location || "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-muted-foreground block">Keyakinan AI/Parser:</span>
                            <span className="font-semibold text-foreground">
                              {Math.round(p.confidenceScore * 100)}% ({p.severity})
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[9px] text-muted-foreground block">Hasil Ekstraksi:</span>
                            <span className="text-foreground leading-snug">{p.needsSummary}</span>
                          </div>
                        </div>
                      )}

                      {/* Operator Action Buttons */}
                      {isPending && canVerify && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {/* Quick Accept */}
                          <ActionForm action={acceptSmsReportAction} className="inline">
                            <input type="hidden" name="messageId" value={msg.id} />
                            <input type="hidden" name="location" value={p?.location || "Lokasi Lapangan"} />
                            <input type="hidden" name="reporter" value={p?.reporterName || `Relawan SMS (${msg.senderPhone})`} />
                            <input type="hidden" name="summary" value={p?.needsSummary || `[SMS] ${msg.rawMessage}`} />
                            <input type="hidden" name="severity" value={p?.severity || "major"} />
                            <SubmitButton
                              pendingLabel="Menerima..."
                              className="h-7 text-[11px] font-sans font-medium px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="size-3 mr-1" />
                              Terima
                            </SubmitButton>
                          </ActionForm>

                          {/* Edit & Accept Trigger */}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(msg)}
                            className="h-7 text-[11px] font-sans font-medium px-2.5 cursor-pointer"
                          >
                            <Pencil className="size-3 mr-1" />
                            Edit &amp; Terima
                          </Button>

                          {/* Reject Trigger */}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRejectMessage(msg);
                              setRejectReason("Pesan tidak relevan atau informasi fiktif.");
                            }}
                            className="h-7 text-[11px] font-sans text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-2 cursor-pointer"
                          >
                            <XCircle className="size-3 mr-1" />
                            Tolak
                          </Button>

                          {/* Duplicate Trigger */}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDuplicateMessage(msg);
                              setDuplicateReason("Duplikat dari laporan yang sudah masuk sebelumnya.");
                            }}
                            className="h-7 text-[11px] font-sans text-muted-foreground hover:text-foreground px-2 cursor-pointer"
                          >
                            <Copy className="size-3 mr-1" />
                            Duplikat
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* DIALOG: EDIT & ACCEPT SMS */}
      <Dialog open={!!editMessage} onOpenChange={(open) => !open && setEditMessage(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-semibold">
              Edit &amp; Terima Laporan SMS
            </DialogTitle>
            <DialogDescription className="font-sans text-xs text-muted-foreground">
              Perbaiki data hasil ekstraksi otomatis sebelum pesan dimasukkan ke antrean laporan resmi.
            </DialogDescription>
          </DialogHeader>

          {editMessage && (
            <ActionForm
              action={async (formData) => {
                const res = await acceptSmsReportAction(formData);
                if (res.ok) setEditMessage(null);
                return res;
              }}
              className="space-y-3 font-sans text-xs"
            >
              <input type="hidden" name="messageId" value={editMessage.id} />
              <input type="hidden" name="isEdited" value="true" />

              <div className="rounded border bg-muted/40 p-2 font-mono text-[11px]">
                <span className="text-[9px] text-muted-foreground block font-sans uppercase mb-0.5">
                  Teks SMS Asli (Pengirim: {editMessage.senderPhone}):
                </span>
                {editMessage.rawMessage}
              </div>

              <div className="space-y-1">
                <Label htmlFor="editLocation" className="text-xs font-medium">
                  Lokasi / Sektor Wilayah
                </Label>
                <Input
                  id="editLocation"
                  name="location"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="editReporter" className="text-xs font-medium">
                    Nama Pelapor
                  </Label>
                  <Input
                    id="editReporter"
                    name="reporter"
                    value={editReporter}
                    onChange={(e) => setEditReporter(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editSeverity" className="text-xs font-medium">
                    Tingkat Keparahan
                  </Label>
                  <Select
                    name="severity"
                    value={editSeverity}
                    onValueChange={(val: "critical" | "major" | "warning") => setEditSeverity(val)}
                  >
                    <SelectTrigger id="editSeverity" className="h-8 text-xs">
                      <SelectValue placeholder="Pilih kegawatan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Kritis (Jiwa / Darurat)</SelectItem>
                      <SelectItem value="major">Tinggi (Major)</SelectItem>
                      <SelectItem value="warning">Sedang (Perlu Perhatian)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="editSummary" className="text-xs font-medium">
                  Ringkasan Kebutuhan &amp; Situasi
                </Label>
                <Textarea
                  id="editSummary"
                  name="summary"
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="text-xs min-h-[70px]"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMessage(null)}
                  className="h-8 text-xs"
                >
                  Batal
                </Button>
                <SubmitButton pendingLabel="Menyimpan..." className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                  Konfirmasi &amp; Terima
                </SubmitButton>
              </DialogFooter>
            </ActionForm>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: REJECT SMS */}
      <Dialog open={!!rejectMessage} onOpenChange={(open) => !open && setRejectMessage(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-semibold">Tolak Pesan SMS</DialogTitle>
            <DialogDescription className="font-sans text-xs text-muted-foreground">
              Tandai pesan ini sebagai ditolak karena tidak relevan atau informasi palsu.
            </DialogDescription>
          </DialogHeader>

          {rejectMessage && (
            <ActionForm
              action={async (formData) => {
                const res = await rejectSmsAction(formData);
                if (res.ok) setRejectMessage(null);
                return res;
              }}
              className="space-y-3 font-sans text-xs"
            >
              <input type="hidden" name="messageId" value={rejectMessage.id} />
              <div className="space-y-1">
                <Label htmlFor="rejectReason" className="text-xs font-medium">
                  Alasan Penolakan
                </Label>
                <Input
                  id="rejectReason"
                  name="reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Contoh: Pesan salah sambung / tidak terkait bencana"
                />
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectMessage(null)}
                  className="h-8 text-xs"
                >
                  Batal
                </Button>
                <SubmitButton pendingLabel="Menolak..." variant="destructive" className="h-8 text-xs">
                  Tolak Pesan
                </SubmitButton>
              </DialogFooter>
            </ActionForm>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: MARK DUPLICATE SMS */}
      <Dialog open={!!duplicateMessage} onOpenChange={(open) => !open && setDuplicateMessage(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-semibold">Tandai SMS Duplikat</DialogTitle>
            <DialogDescription className="font-sans text-xs text-muted-foreground">
              Tandai pesan ini sebagai duplikasi agar tidak menimbulkan pencatatan ganda.
            </DialogDescription>
          </DialogHeader>

          {duplicateMessage && (
            <ActionForm
              action={async (formData) => {
                const res = await markDuplicateSmsAction(formData);
                if (res.ok) setDuplicateMessage(null);
                return res;
              }}
              className="space-y-3 font-sans text-xs"
            >
              <input type="hidden" name="messageId" value={duplicateMessage.id} />
              <div className="space-y-1">
                <Label htmlFor="duplicateReason" className="text-xs font-medium">
                  Keterangan Duplikat
                </Label>
                <Input
                  id="duplicateReason"
                  name="reason"
                  value={duplicateReason}
                  onChange={(e) => setDuplicateReason(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Contoh: Laporan posko yang sama sudah diterima via LPR-001"
                />
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDuplicateMessage(null)}
                  className="h-8 text-xs"
                >
                  Batal
                </Button>
                <SubmitButton pendingLabel="Menandai..." className="h-8 text-xs">
                  Tandai Duplikat
                </SubmitButton>
              </DialogFooter>
            </ActionForm>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
