import Link from "next/link";
import {
  Ban,
  Check,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  PhoneCall,
  RadioTower,
  ShieldCheck,
  X,
} from "lucide-react";
import { ConfirmMutationAction } from "@/components/confirm-mutation-action";
import { MutationAction } from "@/components/mutation-action";
import { StatusBadge } from "@/components/status-badge";
import { ZeroGridSimulator } from "@/components/zero-grid-simulator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createFieldReport,
  openEventFromReport,
  rejectFieldReport,
  triageReportWithAIAction,
  verifyFieldReport,
} from "@/lib/actions/operations";
import { requireRole } from "@/lib/auth";
import { roleCapabilities } from "@/lib/role-ui";
import { getOperationsData } from "@/lib/repositories/operations";
import type { FieldReport, ReportStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const reportStatusLabel: Record<ReportStatus, string> = {
  baru: "Perlu Verifikasi",
  diverifikasi: "Diverifikasi",
  ditindaklanjuti: "Ditindaklanjuti",
  ditolak: "Ditolak / Duplikat",
};

const reportStatusStyle: Record<ReportStatus, string> = {
  baru: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
  diverifikasi:
    "border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200",
  ditindaklanjuti:
    "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
  ditolak:
    "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200",
};

const queueFilters = ["semua", "perlu-verifikasi", "terverifikasi", "zero-grid"] as const;
type QueueFilter = (typeof queueFilters)[number];

const filterLabel: Record<QueueFilter, string> = {
  semua: "Semua Laporan",
  "perlu-verifikasi": "Perlu Verifikasi",
  terverifikasi: "Terverifikasi",
  "zero-grid": "SMS Zero-Grid",
};

function matchesFilter(report: FieldReport, filter: QueueFilter) {
  if (filter === "perlu-verifikasi") return report.status === "baru";
  if (filter === "terverifikasi") {
    return report.status === "diverifikasi" || report.status === "ditindaklanjuti";
  }
  if (filter === "zero-grid") return report.channel === "SMS Zero-Grid";
  return true;
}

function parseFilter(value: string | string[] | undefined): QueueFilter {
  const candidate = Array.isArray(value) ? value[0] : value;
  return queueFilters.includes(candidate as QueueFilter) ? (candidate as QueueFilter) : "semua";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ antrean?: string | string[] }>;
}) {
  const [profile, { fieldReports }, resolvedSearchParams] = await Promise.all([
    requireRole(["admin", "bpbd_operator", "field_officer"], "/dashboard"),
    getOperationsData(),
    searchParams,
  ]);
  const capabilities = roleCapabilities(profile.role);
  const activeFilter = parseFilter(resolvedSearchParams.antrean);
  const visibleReports = fieldReports.filter((report) => matchesFilter(report, activeFilter));

  const reportStages = [
    {
      label: "Laporan Baru",
      detail: "Menunggu verifikasi data lapangan",
      count: fieldReports.filter((report) => report.status === "baru").length,
      tone: "critical",
    },
    {
      label: "Diverifikasi",
      detail: "Data valid & siap ditautkan ke kejadian",
      count: fieldReports.filter((report) => report.status === "diverifikasi").length,
      tone: "warning",
    },
    {
      label: "Ditindaklanjuti",
      detail: "Sudah masuk respon armada & posko",
      count: fieldReports.filter((report) => report.status === "ditindaklanjuti").length,
      tone: "teal",
    },
    {
      label: "Ditolak / Duplikat",
      detail: "Disaring petugas triase, tidak masuk operasi",
      count: fieldReports.filter((report) => report.status === "ditolak").length,
      tone: "muted",
    },
  ];

  const smsReportsCount = fieldReports.filter(
    (report) => report.channel === "SMS Zero-Grid",
  ).length;

  const filterCounts: Record<QueueFilter, number> = {
    semua: fieldReports.length,
    "perlu-verifikasi": reportStages[0].count,
    terverifikasi: reportStages[1].count + reportStages[2].count,
    "zero-grid": smsReportsCount,
  };

  return (
    <div className="@container/main flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Laporan Situasi & SMS Zero-Grid
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pusat triase laporan bencana dari warga, SMS offline darurat, dan tim lapangan.
          </p>
        </div>
        {capabilities.canCreateReport && (
          <MutationAction
            action={createFieldReport}
            label="Buat Laporan Baru"
            fields={{
              location: "Posko Lapangan",
              reporter: profile.fullName,
              summary: "Laporan darurat lapangan memerlukan verifikasi segera.",
              channel: profile.role === "field_officer" ? "Petugas" : "Web",
              severity: "warning",
            }}
          />
        )}
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/50">
                <Clock3 className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Menunggu Verifikasi</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
                {reportStages[0].count} Laporan
              </div>
              {reportStages[0].count > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  Prioritas
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">Perlu validasi lokasi & keparahan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900/50">
                <MessageSquareText className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>SMS Zero-Grid (Offline)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {smsReportsCount} Pesan
            </div>
            <p className="text-muted-foreground text-sm">Diterima tanpa koneksi internet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/50">
                <ShieldCheck className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Laporan Terverifikasi</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {reportStages[1].count} Laporan
            </div>
            <p className="text-muted-foreground text-sm">Siap dieskalasi jadi kejadian resmi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/50">
                <CheckCircle2 className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Telah Ditindaklanjuti</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {reportStages[2].count} Selesai
            </div>
            <p className="text-muted-foreground text-sm">Masuk alur evakuasi & logistik</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Queue Table & Simulator */}
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,0.6fr)]">
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="gap-3 py-4">
            <div>
              <CardTitle className="text-base">Antrean Triase Laporan Masuk</CardTitle>
              <CardDescription>
                Daftar laporan warga dan SMS Zero-Grid yang memerlukan tindakan petugas.
              </CardDescription>
            </div>
            <div
              role="group"
              aria-label="Filter cepat antrean laporan"
              className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-muted/40 p-1.5"
            >
              {queueFilters.map((filter) => {
                const isActive = filter === activeFilter;
                return (
                  <Button
                    key={filter}
                    asChild
                    size="sm"
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors duration-200",
                      isActive
                        ? "shadow-xs"
                        : "text-muted-foreground hover:bg-background hover:text-foreground dark:hover:bg-input/40",
                    )}
                  >
                    <Link
                      href={filter === "semua" ? "/laporan" : `/laporan?antrean=${filter}`}
                      aria-current={isActive ? "true" : undefined}
                      scroll={false}
                    >
                      {filterLabel[filter]}
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                          isActive ? "bg-primary-foreground/15" : "bg-muted-foreground/10",
                        )}
                      >
                        {filterCounts[filter]}
                      </span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-xs">ID & Lokasi</TableHead>
                  <TableHead className="text-xs">Saluran</TableHead>
                  <TableHead className="text-xs">Ringkasan & Tingkat Keparahan</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  {(capabilities.canVerifyReport || capabilities.canOpenIncident) && (
                    <TableHead className="text-xs text-right whitespace-nowrap w-[1%]">Aksi Operasi</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleReports.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={capabilities.canVerifyReport || capabilities.canOpenIncident ? 5 : 4}
                      className="py-10 text-center text-xs text-muted-foreground"
                    >
                      Tidak ada laporan pada filter “{filterLabel[activeFilter]}”.
                    </TableCell>
                  </TableRow>
                )}
                {visibleReports.map((report) => {
                  const needsTriage = report.status === "baru";
                  return (
                    <TableRow
                      key={report.id}
                      className={cn(
                        "group text-xs transition-colors duration-200 hover:bg-muted/60",
                        needsTriage &&
                          "bg-amber-50/60 hover:bg-amber-100/70 dark:bg-amber-500/[0.06] dark:hover:bg-amber-500/[0.12]",
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="font-semibold text-foreground font-mono">{report.id}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {report.location} · {report.receivedAt}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            report.channel === "SMS Zero-Grid"
                              ? "border-purple-300 bg-purple-100 text-purple-900 dark:border-purple-500/40 dark:bg-purple-500/15 dark:text-purple-200"
                              : ""
                          }
                        >
                          {report.channel}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-64 max-w-sm">
                        <p className="line-clamp-2 text-xs leading-relaxed">{report.summary}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={report.severity} className="w-fit" />
                          {report.summary.includes("EVAKUASI JIWA") && (
                            <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-tight">
                              🚨 Disposisi SAR
                            </Badge>
                          )}
                          {report.summary.includes("TINGGI") && (
                            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                              🟢 Akurasi Tinggi
                            </Badge>
                          )}
                          {report.summary.includes("SEDANG") && (
                            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
                              🟡 Perlu Call
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1 text-[11px] font-semibold",
                            reportStatusStyle[report.status],
                          )}
                        >
                          {report.status === "baru" && <Clock3 aria-hidden="true" />}
                          {report.status === "diverifikasi" && <ShieldCheck aria-hidden="true" />}
                          {report.status === "ditindaklanjuti" && (
                            <CheckCircle2 aria-hidden="true" />
                          )}
                          {report.status === "ditolak" && <Ban aria-hidden="true" />}
                          {reportStatusLabel[report.status]}
                        </Badge>
                      </TableCell>
                      {(capabilities.canVerifyReport || capabilities.canOpenIncident) && (
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                            {(() => {
                              const phoneMatch = report.summary.match(/\[KONTAK:\s*([0-9+\s-]+)\]/);
                              const parsedPhone = phoneMatch ? phoneMatch[1].trim() : null;
                              if (!parsedPhone) return null;
                              return (
                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  title={`Panggilan cepat telepon pelapor: ${parsedPhone}`}
                                >
                                  <a href={`tel:${parsedPhone}`}>
                                    <PhoneCall className="size-3.5" />
                                    <span>Call {parsedPhone}</span>
                                  </a>
                                </Button>
                              );
                            })()}
                            {capabilities.canVerifyReport && needsTriage && (
                              <>
                                <MutationAction
                                  action={triageReportWithAIAction}
                                  label="Triase AI"
                                  pendingLabel="Menganalisis..."
                                  fields={{ code: report.id }}
                                  size="sm"
                                  variant="outline"
                                  showMessage={false}
                                />
                                <MutationAction
                                  action={verifyFieldReport}
                                  label="Verifikasi"
                                  pendingLabel="Memverifikasi..."
                                  fields={{ code: report.id }}
                                  size="sm"
                                  variant="default"
                                  icon={<Check className="size-3.5" aria-hidden="true" />}
                                  showMessage={false}
                                />
                                {capabilities.canRejectReport && (
                                  <ConfirmMutationAction
                                    action={rejectFieldReport}
                                    label="Tolak / Duplikat"
                                    title={`Tolak laporan ${report.id}?`}
                                    description={`Laporan di ${report.location} akan ditandai ditolak atau duplikat dan keluar dari antrean triase.`}
                                    consequence="Status laporan menjadi ditolak, catatan verifikasi tersimpan, dan keputusan tercatat di audit log."
                                    fields={{
                                      code: report.id,
                                      reason: `Laporan ${report.id} ditandai duplikat atau tidak valid saat triase.`,
                                    }}
                                    variant="outline"
                                    size="sm"
                                    icon={<X className="size-3.5" aria-hidden="true" />}
                                  />
                                )}
                              </>
                            )}
                            {capabilities.canVerifyReport &&
                              report.status === "diverifikasi" && (
                                <MutationAction
                                  action={verifyFieldReport}
                                  label="Tindak Lanjut"
                                  pendingLabel="Memproses..."
                                  fields={{ code: report.id }}
                                  variant="secondary"
                                  size="sm"
                                  showMessage={false}
                                  buttonClassName="h-8"
                                />
                              )}
                            {capabilities.canOpenIncident &&
                              report.status !== "baru" &&
                              report.status !== "ditolak" && (
                                <ConfirmMutationAction
                                  action={openEventFromReport}
                                  label="Buka Kejadian"
                                  title={`Buka Ruang Kejadian dari ${report.id}?`}
                                  description={`Laporan di ${report.location} akan dijadikan status kejadian bencana aktif.`}
                                  consequence="Kejadian baru akan muncul di dashboard komando dan live map."
                                  fields={{
                                    code: report.id,
                                    name: `Kejadian ${report.location}`,
                                  }}
                                  size="sm"
                                  triggerClassName="h-8"
                                />
                              )}
                            {report.status === "ditolak" && (
                              <span className="text-[11px] text-muted-foreground">
                                Tidak ada aksi lanjutan
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <ZeroGridSimulator />
      </div>

      {/* Verification Stages Overview */}
      <Card className="shadow-xs">
        <CardHeader className="py-4">
          <div className="flex items-center gap-2">
            <RadioTower className="size-5 text-primary" />
            <div>
              <CardTitle className="text-base">Alur Pipeline Verifikasi</CardTitle>
              <CardDescription>
                Progres laporan dari penerimaan awal hingga aksi tanggap darurat resmi.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pb-5 md:grid-cols-2 xl:grid-cols-4">
          {reportStages.map((stage) => {
            const percentage = fieldReports.length
              ? Math.max(8, Math.round((stage.count / fieldReports.length) * 100))
              : 0;
            return (
              <div
                key={stage.label}
                className="relative rounded-lg border bg-muted/20 p-4 space-y-3 transition-colors duration-200 hover:border-primary/30 hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {stage.count} Laporan
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{stage.detail}</p>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
