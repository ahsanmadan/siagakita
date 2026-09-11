import {
  CheckCircle2,
  Clock3,
  MessageSquareText,
  RadioTower,
  ShieldCheck,
} from "lucide-react";
import { CreateReportDialog } from "@/components/create-report-dialog";
import { ZeroGridSimulator } from "@/components/zero-grid-simulator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getEntitiesAttachments, getOperationsData, getSmsMessagesData } from "@/lib/repositories/operations";
import { roleCapabilities } from "@/lib/role-ui";
import { ReportQueueTable, type QueueFilter } from "./_components/report-queue-table";

const queueFilters = ["semua", "perlu-verifikasi", "terverifikasi", "zero-grid"] as const;

function parseFilter(value: string | string[] | undefined): QueueFilter {
  const candidate = Array.isArray(value) ? value[0] : value;
  return queueFilters.includes(candidate as QueueFilter) ? (candidate as QueueFilter) : "semua";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ antrean?: string | string[] }>;
}) {
  const [profile, operationsData, smsMessages, resolvedSearchParams] = await Promise.all([
    requireRole(["admin", "bpbd_operator", "field_officer"], "/dashboard"),
    getOperationsData(),
    getSmsMessagesData(),
    searchParams,
  ]);
  const capabilities = roleCapabilities(profile.role);
  const activeFilter = parseFilter(resolvedSearchParams.antrean);

  const reportIds = operationsData.fieldReports.map((r) => r.id);
  const attachmentsMap = await getEntitiesAttachments("field_reports", reportIds);
  const fieldReports = operationsData.fieldReports.map((r) => ({
    ...r,
    attachments: attachmentsMap[r.id] || [],
  }));

  const pendingTriageCount = fieldReports.filter(
    (report) => report.status === "baru" || report.status === "perlu_verifikasi",
  ).length;
  const verifiedCount = fieldReports.filter(
    (report) => report.status === "diverifikasi",
  ).length;
  const actionedCount = fieldReports.filter(
    (report) =>
      report.status === "ditindaklanjuti" || report.status === "dibuka_jadi_kejadian",
  ).length;
  const filteredOutCount = fieldReports.filter(
    (report) => report.status === "ditolak" || report.status === "duplikat",
  ).length;

  const reportStages = [
    {
      label: "Menunggu Verifikasi",
      detail: "Laporan baru & dalam proses triase",
      count: pendingTriageCount,
      tone: "critical",
    },
    {
      label: "Diverifikasi",
      detail: "Data valid & siap dieskalasi / ditindaklanjuti",
      count: verifiedCount,
      tone: "warning",
    },
    {
      label: "Ditindaklanjuti / Kejadian",
      detail: "Masuk respon posko atau dibuka jadi kejadian",
      count: actionedCount,
      tone: "teal",
    },
    {
      label: "Duplikat & Ditolak",
      detail: "Disaring petugas triase, tidak masuk operasi",
      count: filteredOutCount,
      tone: "muted",
    },
  ];

  const smsReportsCount = fieldReports.filter(
    (report) => report.channel === "SMS Zero-Grid",
  ).length;

  return (
    <div className="@container/main flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Laporan Situasi &amp; SMS Zero-Grid
          </h1>
          <p className="font-sans text-sm text-muted-foreground mt-0.5">
            Pusat triase laporan bencana dari warga, SMS offline darurat, dan tim lapangan.
          </p>
        </div>
        {capabilities.canCreateReport && (
          <CreateReportDialog defaultReporter={profile.fullName} />
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
            <CardDescription className="font-sans text-xs font-medium text-muted-foreground">Menunggu Verifikasi</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-heading font-semibold text-3xl tabular-nums leading-none tracking-tight">
                {reportStages[0].count} Laporan
              </div>
              {reportStages[0].count > 0 && (
                <Badge variant="destructive" className="font-sans text-[10px] uppercase font-semibold tracking-tight">
                  Prioritas
                </Badge>
              )}
            </div>
            <p className="font-sans text-muted-foreground text-xs">Perlu validasi lokasi &amp; keparahan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900/50">
                <MessageSquareText className="size-4" />
              </div>
            </CardTitle>
            <CardDescription className="font-sans text-xs font-medium text-muted-foreground">SMS Zero-Grid (Offline)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-heading font-semibold text-3xl tabular-nums leading-none tracking-tight">
              {smsReportsCount} Pesan
            </div>
            <p className="font-sans text-muted-foreground text-xs">Diterima tanpa koneksi internet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/50">
                <ShieldCheck className="size-4" />
              </div>
            </CardTitle>
            <CardDescription className="font-sans text-xs font-medium text-muted-foreground">Laporan Terverifikasi</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-heading font-semibold text-3xl tabular-nums leading-none tracking-tight">
              {reportStages[1].count} Laporan
            </div>
            <p className="font-sans text-muted-foreground text-xs">Siap dieskalasi jadi kejadian resmi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/50">
                <CheckCircle2 className="size-4" />
              </div>
            </CardTitle>
            <CardDescription className="font-sans text-xs font-medium text-muted-foreground">Telah Ditindaklanjuti</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-heading font-semibold text-3xl tabular-nums leading-none tracking-tight">
              {reportStages[2].count} Selesai
            </div>
            <p className="font-sans text-muted-foreground text-xs">Masuk alur evakuasi &amp; logistik</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Queue Table & Simulator Panel */}
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px] items-start">
        {/* Report Queue Table Card */}
        <Card className="shadow-xs overflow-hidden min-w-0 border border-border/70">
          <CardHeader className="py-3.5 px-4 sm:px-5">
            <CardTitle className="font-heading text-base font-semibold tracking-tight text-foreground">
              Antrean Triase Laporan Masuk
            </CardTitle>
            <CardDescription className="font-sans text-xs text-muted-foreground mt-0.5">
              Daftar laporan warga dan SMS Zero-Grid yang memerlukan tindakan petugas.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ReportQueueTable
              reports={fieldReports}
              initialFilter={activeFilter}
              canVerifyReport={capabilities.canVerifyReport}
              canOpenIncident={capabilities.canOpenIncident}
              canRejectReport={capabilities.canRejectReport}
            />
          </CardContent>
        </Card>

        {/* SMS Zero-Grid Manual Input & Review Panel */}
        <div className="w-full xl:sticky xl:top-6 self-start h-fit min-w-0">
          <ZeroGridSimulator
            smsMessages={smsMessages}
            canVerify={capabilities.canVerifyReport}
          />
        </div>
      </div>

      {/* Verification Stages Overview */}
      <Card className="shadow-xs border border-border/70">
        <CardHeader className="py-4">
          <div className="flex items-center gap-2">
            <RadioTower className="size-5 text-primary" />
            <div>
              <CardTitle className="font-heading text-base font-semibold tracking-tight text-foreground">
                Alur Pipeline Verifikasi
              </CardTitle>
              <CardDescription className="font-sans text-xs text-muted-foreground mt-0.5">
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
                className="relative rounded-lg border bg-muted/20 p-4 space-y-3 transition-colors duration-150 hover:border-primary/30 hover:bg-muted/40 font-sans"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading text-xs font-semibold text-foreground">{stage.label}</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {stage.count} Laporan
                  </Badge>
                </div>
                <p className="font-sans text-[11px] text-muted-foreground leading-relaxed">{stage.detail}</p>
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
