"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  Copy,
  Flame,
  Paperclip,
  PhoneCall,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { ConfirmMutationAction } from "@/components/confirm-mutation-action";
import { MutationAction } from "@/components/mutation-action";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  markFieldReportDuplicate,
  markFieldReportNeedsVerification,
  openEventFromReport,
  rejectFieldReport,
  triageReportWithAIAction,
  verifyFieldReport,
} from "@/lib/actions/operations";
import type { FieldReport, ReportStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const reportStatusLabel: Record<ReportStatus, string> = {
  baru: "Baru",
  perlu_verifikasi: "Perlu Verifikasi",
  diverifikasi: "Diverifikasi",
  duplikat: "Duplikat",
  ditolak: "Ditolak",
  ditindaklanjuti: "Ditindaklanjuti",
  dibuka_jadi_kejadian: "Dibuka Jadi Kejadian",
};

const reportStatusStyle: Record<ReportStatus, string> = {
  baru: "border-purple-300 bg-purple-50 text-purple-900 dark:border-purple-500/40 dark:bg-purple-500/15 dark:text-purple-200",
  perlu_verifikasi:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
  diverifikasi:
    "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200",
  duplikat:
    "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300",
  ditolak:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300",
  ditindaklanjuti:
    "border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-500/40 dark:bg-teal-500/15 dark:text-teal-200",
  dibuka_jadi_kejadian:
    "border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
};

const queueFilters = ["semua", "perlu-verifikasi", "terverifikasi", "zero-grid"] as const;
export type QueueFilter = (typeof queueFilters)[number];

const filterLabel: Record<QueueFilter, string> = {
  semua: "Semua Laporan",
  "perlu-verifikasi": "Perlu Verifikasi",
  terverifikasi: "Terverifikasi",
  "zero-grid": "SMS Zero-Grid",
};

function matchesFilter(report: FieldReport, filter: QueueFilter) {
  if (filter === "perlu-verifikasi") {
    return report.status === "baru" || report.status === "perlu_verifikasi";
  }
  if (filter === "terverifikasi") {
    return (
      report.status === "diverifikasi" ||
      report.status === "ditindaklanjuti" ||
      report.status === "dibuka_jadi_kejadian"
    );
  }
  if (filter === "zero-grid") return report.channel === "SMS Zero-Grid";
  return true;
}

export function ReportQueueTable({
  reports,
  initialFilter = "semua",
  canVerifyReport,
  canOpenIncident,
  canRejectReport,
}: {
  reports: FieldReport[];
  initialFilter?: QueueFilter;
  canVerifyReport: boolean;
  canOpenIncident: boolean;
  canRejectReport: boolean;
}) {
  const [activeFilter, setActiveFilter] = React.useState<QueueFilter>(initialFilter);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  // Filter tab click handler -> resets to page 1
  const handleFilterChange = (filter: QueueFilter) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  // Search input handler -> resets to page 1
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  // Filter counts across the master dataset
  const filterCounts = React.useMemo(() => {
    return {
      semua: reports.length,
      "perlu-verifikasi": reports.filter(
        (r) => r.status === "baru" || r.status === "perlu_verifikasi",
      ).length,
      terverifikasi: reports.filter(
        (r) =>
          r.status === "diverifikasi" ||
          r.status === "ditindaklanjuti" ||
          r.status === "dibuka_jadi_kejadian",
      ).length,
      "zero-grid": reports.filter((r) => r.channel === "SMS Zero-Grid").length,
    };
  }, [reports]);

  // Filtered reports by active category & search query
  const filteredReports = React.useMemo(() => {
    return reports.filter((report) => {
      // Category match
      if (!matchesFilter(report, activeFilter)) return false;

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          report.location.toLowerCase().includes(q) ||
          report.id.toLowerCase().includes(q) ||
          report.summary.toLowerCase().includes(q) ||
          report.reporter.toLowerCase().includes(q) ||
          report.channel.toLowerCase().includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [reports, activeFilter, searchQuery]);

  // Pagination calculation
  const totalRecords = filteredReports.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col">
      {/* ── Table Toolbar: Category Tabs & Search ── */}
      <div className="flex flex-col gap-2.5 border-b border-border/60 bg-muted/20 px-4 py-2.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Category Tabs */}
        <div
          role="group"
          aria-label="Filter cepat antrean laporan"
          className="flex flex-wrap items-center gap-1"
        >
          {queueFilters.map((filter) => {
            const isActive = filter === activeFilter;
            return (
              <Button
                key={filter}
                type="button"
                size="sm"
                variant={isActive ? "default" : "ghost"}
                onClick={() => handleFilterChange(filter)}
                className={cn(
                  "h-7 gap-1.5 rounded-md px-2.5 font-sans text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-2xs hover:bg-primary/95"
                    : "text-muted-foreground hover:bg-background hover:text-foreground dark:hover:bg-input/30",
                )}
              >
                <span>{filterLabel[filter]}</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.2 text-[10px] tabular-nums font-mono",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {filterCounts[filter]}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Search Input Box */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari lokasi, kode, isi..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-7.5 pl-8 pr-7 text-xs font-sans placeholder:text-muted-foreground/70"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Hapus pencarian"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table with Sticky Header ── */}
      <div className="relative overflow-x-auto max-h-[620px] [scrollbar-width:thin]">
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-card/98 backdrop-blur-md shadow-2xs border-b border-border/70">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-sans text-xs font-semibold text-muted-foreground w-44 md:w-48 bg-card/98">
                Lokasi &amp; Sumber
              </TableHead>
              <TableHead className="font-sans text-xs font-semibold text-muted-foreground min-w-56 bg-card/98">
                Ringkasan Situasi
              </TableHead>
              <TableHead className="font-sans text-xs font-semibold text-muted-foreground w-36 bg-card/98">
                Status Triase
              </TableHead>
              {(canVerifyReport || canOpenIncident) && (
                <TableHead className="font-sans text-xs font-semibold text-muted-foreground text-right w-44 whitespace-nowrap bg-card/98">
                  Aksi Operasi
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedReports.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={canVerifyReport || canOpenIncident ? 4 : 3}
                  className="py-12 text-center font-sans text-xs text-muted-foreground"
                >
                  {searchQuery
                    ? `Tidak ditemukan laporan untuk pencarian "${searchQuery}".`
                    : `Tidak ada laporan pada filter “${filterLabel[activeFilter]}”.`}
                </TableCell>
              </TableRow>
            ) : (
              paginatedReports.map((report) => {
                const needsTriage = report.status === "baru" || report.status === "perlu_verifikasi";
                const phoneMatch = report.summary.match(/\[KONTAK:\s*([0-9+\s-]+)\]/);
                const parsedPhone = phoneMatch ? phoneMatch[1].trim() : null;

                return (
                  <TableRow
                    key={report.id}
                    className={cn(
                      "group transition-colors duration-150 hover:bg-muted/50",
                      needsTriage &&
                        "bg-amber-50/40 hover:bg-amber-100/50 dark:bg-amber-500/[0.04] dark:hover:bg-amber-500/[0.08]",
                    )}
                  >
                    {/* 1. Lokasi & Sumber */}
                    <TableCell className="font-sans align-top py-3">
                      <div className="font-semibold text-foreground text-xs leading-snug">
                        {report.location}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="font-mono text-foreground/75">{report.id}</span>
                        <span>·</span>
                        <span>{report.receivedAt}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-sans font-medium px-1.5 py-0 h-4.5 w-fit",
                            report.channel === "SMS Zero-Grid"
                              ? "border-purple-300 bg-purple-100/70 text-purple-900 dark:border-purple-500/40 dark:bg-purple-500/15 dark:text-purple-200"
                              : "text-muted-foreground",
                          )}
                        >
                          {report.channel}
                        </Badge>
                        {parsedPhone && (
                          <a
                            href={`tel:${parsedPhone}`}
                            className="inline-flex items-center gap-1 text-[11px] font-sans text-primary hover:underline"
                            title={`Hubungi pelapor: ${parsedPhone}`}
                          >
                            <PhoneCall className="size-3" />
                            <span>{parsedPhone}</span>
                          </a>
                        )}
                      </div>
                    </TableCell>

                    {/* 2. Ringkasan Situasi & Keparahan */}
                    <TableCell className="font-sans align-top py-3">
                      <p className="line-clamp-2 text-xs leading-relaxed text-foreground/90 font-sans">
                        {report.summary}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={report.severity} className="w-fit text-[11px]" />
                        {report.summary.includes("EVAKUASI JIWA") && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] font-sans uppercase font-bold tracking-tight px-1.5 py-0 h-4.5"
                          >
                            🚨 Disposisi SAR
                          </Badge>
                        )}
                        {report.summary.includes("TINGGI") && (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-sans font-medium px-1.5 py-0 h-4.5"
                          >
                            Akurasi Tinggi
                          </Badge>
                        )}
                        {report.summary.includes("SEDANG") && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-sans font-medium px-1.5 py-0 h-4.5"
                          >
                            Perlu Konfirmasi
                          </Badge>
                        )}
                        {report.attachments && report.attachments.length > 0 && (
                          <Badge
                            variant="outline"
                            className="border-blue-400/50 bg-blue-50 text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-sans font-medium px-1.5 py-0 h-4.5 gap-1"
                            title={`${report.attachments.length} berkas bukti terlampir`}
                          >
                            <Paperclip className="size-2.5 text-blue-600 dark:text-blue-400" />
                            <span>{report.attachments.length} Bukti</span>
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* 3. Status Triase */}
                    <TableCell className="font-sans align-top py-3 whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1 text-[11px] font-sans font-medium px-2 py-0.5",
                          reportStatusStyle[report.status],
                        )}
                      >
                        {report.status === "baru" && (
                          <Sparkles className="size-3 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                        )}
                        {report.status === "perlu_verifikasi" && (
                          <Clock3 className="size-3 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        )}
                        {report.status === "diverifikasi" && (
                          <ShieldCheck className="size-3 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                        )}
                        {report.status === "ditindaklanjuti" && (
                          <CheckCircle2 className="size-3 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                        )}
                        {report.status === "dibuka_jadi_kejadian" && (
                          <Flame className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        )}
                        {report.status === "duplikat" && (
                          <Copy className="size-3 text-slate-500" aria-hidden="true" />
                        )}
                        {report.status === "ditolak" && (
                          <Ban className="size-3 text-red-500" aria-hidden="true" />
                        )}
                        {reportStatusLabel[report.status]}
                      </Badge>
                    </TableCell>

                    {/* 4. Aksi Operasi (Only for actionable reports) */}
                    {(canVerifyReport || canOpenIncident || canRejectReport) && (
                      <TableCell className="text-right align-top py-3 whitespace-nowrap font-sans">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {/* Case 1: Laporan Baru -> Verifikasi, Perlu Cek, AI, Duplikat, Tolak */}
                          {report.status === "baru" && (
                            <>
                              {canVerifyReport && (
                                <>
                                  <MutationAction
                                    action={verifyFieldReport}
                                    label="Verifikasi"
                                    pendingLabel="Verifikasi..."
                                    fields={{ code: report.id }}
                                    size="sm"
                                    variant="default"
                                    icon={<Check className="size-3.5" aria-hidden="true" />}
                                    showMessage={false}
                                    buttonClassName="h-7 text-xs px-2.5 font-sans font-medium shadow-2xs"
                                  />
                                  <MutationAction
                                    action={markFieldReportNeedsVerification}
                                    label="Perlu Cek"
                                    pendingLabel="..."
                                    fields={{ code: report.id }}
                                    size="sm"
                                    variant="outline"
                                    icon={<Clock3 className="size-3 text-amber-600" aria-hidden="true" />}
                                    showMessage={false}
                                    buttonClassName="h-7 text-xs px-2 font-sans text-muted-foreground hover:text-foreground font-medium"
                                  />
                                  <MutationAction
                                    action={triageReportWithAIAction}
                                    label="AI"
                                    pendingLabel="..."
                                    fields={{ code: report.id }}
                                    size="sm"
                                    variant="outline"
                                    icon={<Sparkles className="size-3 text-primary" aria-hidden="true" />}
                                    showMessage={false}
                                    buttonClassName="h-7 text-xs px-2 font-sans text-muted-foreground hover:text-foreground font-medium"
                                  />
                                </>
                              )}
                              {canRejectReport && (
                                <>
                                  <ConfirmMutationAction
                                    action={markFieldReportDuplicate}
                                    label="Duplikat"
                                    title={`Tandai laporan ${report.id} sebagai duplikat?`}
                                    description={`Laporan di ${report.location} akan diklasifikasikan sebagai duplikasi dari kejadian yang sudah ada.`}
                                    consequence="Status laporan menjadi Duplikat dan dicatat terpisah dari laporan ditolak."
                                    fields={{
                                      code: report.id,
                                      reason: `Laporan ${report.id} diidentifikasi sebagai duplikat kejadian serupa.`,
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    icon={<Copy className="size-3 text-muted-foreground" aria-hidden="true" />}
                                    triggerClassName="h-7 text-xs px-2 font-sans text-muted-foreground hover:text-foreground hover:bg-muted"
                                  />
                                  <ConfirmMutationAction
                                    action={rejectFieldReport}
                                    label="Tolak"
                                    title={`Tolak laporan ${report.id}?`}
                                    description={`Laporan di ${report.location} akan ditandai ditolak karena fiktif atau tidak valid.`}
                                    consequence="Status laporan menjadi Ditolak dan tidak masuk respon operasional."
                                    fields={{
                                      code: report.id,
                                      reason: `Laporan ${report.id} dinyatakan tidak valid atau fiktif saat triase.`,
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    icon={<X className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                                    triggerClassName="h-7 text-xs px-2 font-sans text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  />
                                </>
                              )}
                            </>
                          )}

                          {/* Case 2: Laporan Perlu Verifikasi -> Verifikasi, AI, Duplikat, Tolak */}
                          {report.status === "perlu_verifikasi" && (
                            <>
                              {canVerifyReport && (
                                <>
                                  <MutationAction
                                    action={verifyFieldReport}
                                    label="Verifikasi"
                                    pendingLabel="Verifikasi..."
                                    fields={{ code: report.id }}
                                    size="sm"
                                    variant="default"
                                    icon={<Check className="size-3.5" aria-hidden="true" />}
                                    showMessage={false}
                                    buttonClassName="h-7 text-xs px-2.5 font-sans font-medium shadow-2xs"
                                  />
                                  <MutationAction
                                    action={triageReportWithAIAction}
                                    label="AI"
                                    pendingLabel="..."
                                    fields={{ code: report.id }}
                                    size="sm"
                                    variant="outline"
                                    icon={<Sparkles className="size-3 text-primary" aria-hidden="true" />}
                                    showMessage={false}
                                    buttonClassName="h-7 text-xs px-2 font-sans text-muted-foreground hover:text-foreground font-medium"
                                  />
                                </>
                              )}
                              {canRejectReport && (
                                <>
                                  <ConfirmMutationAction
                                    action={markFieldReportDuplicate}
                                    label="Duplikat"
                                    title={`Tandai laporan ${report.id} sebagai duplikat?`}
                                    description={`Laporan di ${report.location} akan diklasifikasikan sebagai duplikasi dari laporan lain.`}
                                    consequence="Status laporan menjadi Duplikat dan dicatat di audit log."
                                    fields={{
                                      code: report.id,
                                      reason: `Laporan ${report.id} diidentifikasi sebagai duplikat saat verifikasi lanjutan.`,
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    icon={<Copy className="size-3 text-muted-foreground" aria-hidden="true" />}
                                    triggerClassName="h-7 text-xs px-2 font-sans text-muted-foreground hover:text-foreground hover:bg-muted"
                                  />
                                  <ConfirmMutationAction
                                    action={rejectFieldReport}
                                    label="Tolak"
                                    title={`Tolak laporan ${report.id}?`}
                                    description={`Laporan di ${report.location} akan ditandai ditolak karena tidak valid.`}
                                    consequence="Status laporan menjadi Ditolak dan dikeluarkan dari antrean."
                                    fields={{
                                      code: report.id,
                                      reason: `Laporan ${report.id} dinyatakan tidak valid setelah verifikasi lanjutan.`,
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    icon={<X className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                                    triggerClassName="h-7 text-xs px-2 font-sans text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  />
                                </>
                              )}
                            </>
                          )}

                          {/* Case 3: Laporan Diverifikasi -> Buka Kejadian & Tindak Lanjut */}
                          {report.status === "diverifikasi" && (
                            <>
                              {canOpenIncident && (
                                <ConfirmMutationAction
                                  action={openEventFromReport}
                                  label="Buka Kejadian"
                                  title={`Buka Ruang Kejadian dari ${report.id}?`}
                                  description={`Laporan di ${report.location} akan dijadikan status kejadian bencana aktif.`}
                                  consequence="Status laporan menjadi Dibuka Jadi Kejadian dan kejadian baru muncul di dashboard komando."
                                  fields={{
                                    code: report.id,
                                    name: `Kejadian ${report.location}`,
                                  }}
                                  size="sm"
                                  variant="default"
                                  triggerClassName="h-7 text-xs px-2.5 font-sans font-medium shadow-2xs"
                                />
                              )}
                              {canVerifyReport && (
                                <MutationAction
                                  action={verifyFieldReport}
                                  label="Tindak Lanjut"
                                  pendingLabel="Proses..."
                                  fields={{ code: report.id }}
                                  size="sm"
                                  variant="outline"
                                  showMessage={false}
                                  buttonClassName="h-7 text-xs px-2.5 font-sans text-muted-foreground hover:text-foreground font-medium"
                                />
                              )}
                            </>
                          )}

                          {/* Case 4: Laporan Ditindaklanjuti -> Buka Kejadian jika belum berelasi */}
                          {report.status === "ditindaklanjuti" && canOpenIncident && (
                            <ConfirmMutationAction
                              action={openEventFromReport}
                              label="Buka Kejadian"
                              title={`Buka Ruang Kejadian dari ${report.id}?`}
                              description={`Laporan di ${report.location} akan ditingkatkan menjadi kejadian bencana aktif.`}
                              consequence="Kejadian baru akan dibuat dan laporan ditautkan ke kejadian tersebut."
                              fields={{
                                code: report.id,
                                name: `Kejadian ${report.location}`,
                              }}
                              size="sm"
                              variant="outline"
                              triggerClassName="h-7 text-xs px-2.5 font-sans font-medium"
                            />
                          )}

                          {/* Case 5: Final states: Ditindaklanjuti (tanpa canOpenIncident), Dibuka Jadi Kejadian, Duplikat, Ditolak */}
                          {(report.status === "dibuka_jadi_kejadian" ||
                            report.status === "duplikat" ||
                            report.status === "ditolak" ||
                            (report.status === "ditindaklanjuti" && !canOpenIncident)) && (
                            <span className="font-mono text-xs text-muted-foreground/40 pr-2 select-none">
                              —
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Built-in Pagination Controls ── */}
      {totalRecords > 0 && (
        <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/15 px-4 py-3 font-sans sm:flex-row sm:items-center sm:justify-between sm:px-5">
          {/* Rows per page & Range text */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Baris per halaman:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-[68px] text-xs font-sans">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="tabular-nums">
              Menampilkan <strong className="font-semibold text-foreground">{startIndex + 1}</strong>–
              <strong className="font-semibold text-foreground">{endIndex}</strong> dari{" "}
              <strong className="font-semibold text-foreground">{totalRecords}</strong> laporan
            </span>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {/* First Page */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="size-7 p-0"
              aria-label="Halaman pertama"
            >
              <ChevronsLeft className="size-3.5" />
            </Button>

            {/* Previous Page */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 gap-1 px-2 text-xs font-sans"
            >
              <ChevronLeft className="size-3.5" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </Button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  return p === 1 || p === totalPages || Math.abs(p - validPage) <= 1;
                })
                .map((p, index, array) => {
                  const prev = array[index - 1];
                  const hasGap = prev && p - prev > 1;

                  return (
                    <React.Fragment key={p}>
                      {hasGap && <span className="px-1 text-xs text-muted-foreground">...</span>}
                      <Button
                        type="button"
                        size="sm"
                        variant={validPage === p ? "default" : "ghost"}
                        onClick={() => setCurrentPage(p)}
                        className={cn(
                          "size-7 p-0 font-sans text-xs font-medium tabular-nums",
                          validPage === p
                            ? "bg-primary text-primary-foreground shadow-2xs"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {p}
                      </Button>
                    </React.Fragment>
                  );
                })}
            </div>

            {/* Next Page */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 gap-1 px-2 text-xs font-sans"
            >
              <span className="hidden sm:inline">Berikutnya</span>
              <ChevronRight className="size-3.5" />
            </Button>

            {/* Last Page */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="size-7 p-0"
              aria-label="Halaman terakhir"
            >
              <ChevronsRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
