import Link from "next/link";
import {
  Activity,
  Ban,
  Database,
  FileClock,
  FilePlus2,
  PackageCheck,
  Route,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { OperationalBrief } from "@/components/operational-brief";
import { MetricStrip, OperationalCard } from "@/components/operational-ui";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { getAuditLogs, type AuditLogItem } from "@/lib/repositories/audit";
import { cn } from "@/lib/utils";

const actionLabels: Record<string, string> = {
  "event.escalated": "Eskalasi kejadian",
  "event.opened_from_report": "Buka kejadian",
  "report.created": "Laporan dibuat",
  "report.verified": "Laporan diverifikasi",
  "report.rejected": "Laporan ditolak / duplikat",
  "shelter.created": "Posko dibuat",
  "shelter.population_updated": "Populasi posko",
  "need.requested": "Kebutuhan diajukan",
  "distribution.allocated": "Stok dialokasikan",
  "distribution.created": "Distribusi dibuat",
  "distribution.status_updated": "Status distribusi",
  "distribution.received": "Distribusi diterima",
  "third_party_aid.created": "Bantuan dicatat",
  "third_party_aid.received_at_warehouse": "Bantuan diterima gudang",
  "third_party_aid.allocated": "Bantuan dialokasikan",
  "recommendation.reviewed": "Rekomendasi ditinjau",
};

function actionLabel(action: string) {
  return actionLabels[action] ?? action;
}

const auditFilters = ["semua", "verifikasi", "alokasi", "status", "entri"] as const;
type AuditFilter = (typeof auditFilters)[number];
type AuditCategory = Exclude<AuditFilter, "semua">;

const filterMeta: Record<AuditFilter, { label: string; icon: LucideIcon }> = {
  semua: { label: "Semua", icon: FileClock },
  verifikasi: { label: "Verifikasi", icon: ShieldCheck },
  alokasi: { label: "Alokasi", icon: PackageCheck },
  status: { label: "Status", icon: Route },
  entri: { label: "Entri Data", icon: FilePlus2 },
};

const categoryByAction: Record<string, AuditCategory> = {
  "report.verified": "verifikasi",
  "report.rejected": "verifikasi",
  "recommendation.reviewed": "verifikasi",
  "distribution.allocated": "alokasi",
  "third_party_aid.allocated": "alokasi",
  "third_party_aid.received_at_warehouse": "alokasi",
  "event.escalated": "status",
  "event.opened_from_report": "status",
  "distribution.status_updated": "status",
  "distribution.received": "status",
  "shelter.population_updated": "status",
  "report.created": "entri",
  "shelter.created": "entri",
  "distribution.created": "entri",
  "third_party_aid.created": "entri",
  "need.requested": "entri",
};

function auditCategory(action: string): AuditCategory {
  const known = categoryByAction[action];
  if (known) return known;
  if (action.includes("verified") || action.includes("rejected") || action.includes("reviewed")) return "verifikasi";
  if (action.includes("allocated")) return "alokasi";
  if (action.includes("created") || action.includes("requested")) return "entri";
  return "status";
}

const categoryBadgeStyle: Record<AuditCategory, string> = {
  verifikasi:
    "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
  alokasi:
    "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
  status:
    "border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200",
  entri:
    "border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-200",
};

const rejectionBadgeStyle =
  "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200";

function actionBadgeStyle(action: string) {
  if (action === "report.rejected") return rejectionBadgeStyle;
  return categoryBadgeStyle[auditCategory(action)];
}

function ActionIcon({ action }: { action: string }) {
  if (action === "report.rejected") return <Ban aria-hidden="true" />;
  const Icon = filterMeta[auditCategory(action)].icon;
  return <Icon aria-hidden="true" />;
}

const statusLabels: Record<string, string> = {
  baru: "Baru",
  diverifikasi: "Diverifikasi",
  ditindaklanjuti: "Ditindaklanjuti",
  ditolak: "Ditolak / Duplikat",
  disiapkan: "Disiapkan",
  "dalam-perjalanan": "Dalam perjalanan",
  diterima: "Diterima",
  "menunggu-pencocokan": "Menunggu pencocokan",
  "diterima-gudang": "Diterima gudang",
  dialokasikan: "Dialokasikan",
  critical: "Bahaya tinggi",
  major: "Terdampak berat",
  warning: "Perlu waspada",
  safe: "Relatif aman",
};

const statusStyles: Record<string, string> = {
  baru: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
  diverifikasi: "border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200",
  ditindaklanjuti:
    "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
  ditolak: rejectionBadgeStyle,
  critical: rejectionBadgeStyle,
  major: "border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-500/40 dark:bg-orange-500/15 dark:text-orange-200",
  warning: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
  safe: "border-teal-300 bg-teal-100 text-teal-900 dark:border-teal-500/40 dark:bg-teal-500/15 dark:text-teal-200",
  diterima:
    "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
};

function statusLabel(status: string) {
  return statusLabels[status] ?? status;
}

function statusStyle(status: string) {
  return statusStyles[status] ?? "border-border bg-muted text-muted-foreground";
}

function StatusTransition({ log, className }: { log: AuditLogItem; className?: string }) {
  if (!log.beforeStatus && !log.afterStatus) return null;
  const changed = Boolean(log.beforeStatus) && log.beforeStatus !== log.afterStatus;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {changed && log.beforeStatus ? (
        <>
          <Badge
            variant="outline"
            className={cn("text-[11px] font-medium opacity-70", statusStyle(log.beforeStatus))}
          >
            {statusLabel(log.beforeStatus)}
          </Badge>
          <span aria-hidden="true" className="text-[11px] text-muted-foreground">
            &rarr;
          </span>
        </>
      ) : null}
      {log.afterStatus ? (
        <Badge
          variant="outline"
          className={cn("text-[11px] font-semibold", statusStyle(log.afterStatus))}
        >
          {statusLabel(log.afterStatus)}
        </Badge>
      ) : null}
    </div>
  );
}

function parseFilter(value: string | string[] | undefined): AuditFilter {
  const candidate = Array.isArray(value) ? value[0] : value;
  return auditFilters.includes(candidate as AuditFilter) ? (candidate as AuditFilter) : "semua";
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ aksi?: string | string[] }>;
}) {
  const [, resolvedSearchParams] = await Promise.all([requireRole(["admin", "bpbd_operator"], "/dashboard"), searchParams]);

  const auditLogs = await getAuditLogs();
  const activeFilter = parseFilter(resolvedSearchParams.aksi);
  const visibleLogs =
    activeFilter === "semua"
      ? auditLogs
      : auditLogs.filter((log) => auditCategory(log.action) === activeFilter);

  const uniqueActors = new Set(auditLogs.map((log) => log.actorEmail)).size;
  const decisionCount = auditLogs.filter((log) => log.action.includes("opened") || log.action.includes("allocated") || log.action.includes("escalated")).length;
  const thirdPartyAidCount = auditLogs.filter((log) => log.targetTable === "third_party_aids").length;
  const rejectedCount = auditLogs.filter((log) => log.action === "report.rejected").length;

  const filterCounts: Record<AuditFilter, number> = {
    semua: auditLogs.length,
    verifikasi: auditLogs.filter((log) => auditCategory(log.action) === "verifikasi").length,
    alokasi: auditLogs.filter((log) => auditCategory(log.action) === "alokasi").length,
    status: auditLogs.filter((log) => auditCategory(log.action) === "status").length,
    entri: auditLogs.filter((log) => auditCategory(log.action) === "entri").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Riwayat keputusan, perubahan status, dan mutasi penting yang tersimpan di database."
      />

      <OperationalBrief
        items={[
          { label: "Riwayat terbaru", value: `${auditLogs.length} log`, detail: "Dibatasi 80 perubahan terakhir agar cepat dibaca.", tone: auditLogs.length ? "teal" : "neutral", icon: FileClock },
          { label: "Keputusan kritis", value: `${decisionCount} aksi`, detail: "Eskalasi, buka kejadian, dan alokasi bantuan.", tone: decisionCount ? "critical" : "neutral", icon: ShieldCheck },
          { label: "Laporan ditolak", value: `${rejectedCount} log`, detail: "Laporan ditandai duplikat atau tidak valid saat triase.", tone: rejectedCount ? "warning" : "neutral", icon: Ban },
          { label: "Pelaku tercatat", value: `${uniqueActors} akun`, detail: "Berdasarkan actor yang menulis perubahan.", tone: uniqueActors ? "teal" : "neutral", icon: UserRoundCheck },
        ]}
      />

      <MetricStrip>
        <MetricCard label="Total audit" value={String(auditLogs.length)} note="Perubahan terbaru" icon={Activity} />
        <MetricCard label="Target tabel" value={String(new Set(auditLogs.map((log) => log.targetTable)).size)} note="Domain data terdampak" icon={Database} />
        <MetricCard label="Keputusan penting" value={String(decisionCount)} note="Perlu mudah dijelaskan" icon={ShieldCheck} tone="warning" />
        <MetricCard label="Bantuan pihak ketiga" value={String(thirdPartyAidCount)} note="Catat, validasi, alokasi" icon={UserRoundCheck} tone="teal" />
      </MetricStrip>

      <OperationalCard className="overflow-clip">
        <CardHeader className="gap-3 py-5">
          <div>
            <CardTitle className="text-base">Riwayat perubahan</CardTitle>
            <CardDescription>Audit log membantu menjawab siapa mengubah apa, kapan, dan dampak ringkasnya.</CardDescription>
          </div>
          <div
            role="group"
            aria-label="Filter cepat jenis aksi audit"
            className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-muted/40 p-1.5"
          >
            {auditFilters.map((filter) => {
              const isActive = filter === activeFilter;
              const Icon = filterMeta[filter].icon;
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
                    href={filter === "semua" ? "/audit-log" : `/audit-log?aksi=${filter}`}
                    aria-current={isActive ? "true" : undefined}
                    scroll={false}
                  >
                    <Icon aria-hidden="true" />
                    {filterMeta[filter].label}
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
          {auditLogs.length ? (
            visibleLogs.length ? (
              <>
                <div className="grid gap-3 p-4 md:hidden">
                  {visibleLogs.map((log) => (
                    <article
                      key={log.id}
                      className="rounded-xl border bg-background/72 p-4 transition-colors duration-200 hover:border-primary/30 hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Badge
                            variant="outline"
                            className={cn("gap-1 font-semibold", actionBadgeStyle(log.action))}
                          >
                            <ActionIcon action={log.action} />
                            {actionLabel(log.action)}
                          </Badge>
                          <p className="mt-2 text-xs text-muted-foreground">{log.createdAt}</p>
                        </div>
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {log.targetTable}
                        </Badge>
                      </div>
                      <StatusTransition log={log} className="mt-3" />
                      <p className="mt-3 text-sm">{log.actorName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{log.actorRole} · {log.actorEmail}</p>
                      <div className="mt-4 grid gap-2 border-t pt-3 text-xs text-muted-foreground">
                        <p><span className="font-medium text-foreground">Sebelum:</span> {log.beforeSummary}</p>
                        <p><span className="font-medium text-foreground">Sesudah:</span> {log.afterSummary}</p>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Aksi</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Ringkasan perubahan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleLogs.map((log) => (
                        <TableRow
                          key={log.id}
                          className="transition-colors duration-200 hover:bg-muted/60"
                        >
                          <TableCell className="min-w-36 text-xs text-muted-foreground">{log.createdAt}</TableCell>
                          <TableCell className="min-w-44">
                            <Badge
                              variant="outline"
                              className={cn("gap-1 font-semibold", actionBadgeStyle(log.action))}
                            >
                              <ActionIcon action={log.action} />
                              {actionLabel(log.action)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{log.actorName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{log.actorRole}</p>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{log.targetTable}</p>
                            <p className="mt-1 max-w-36 truncate text-xs text-muted-foreground">{log.targetId ?? "-"}</p>
                          </TableCell>
                          <TableCell className="max-w-md whitespace-normal">
                            <StatusTransition log={log} className="mb-1.5" />
                            <p className="line-clamp-2 text-sm leading-6">{log.afterSummary}</p>
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">Sebelum: {log.beforeSummary}</p>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Tidak ada audit log untuk filter “{filterMeta[activeFilter].label}”.
              </div>
            )
          ) : (
            <div className="p-5 text-sm text-muted-foreground">Belum ada audit log yang bisa ditampilkan.</div>
          )}
        </CardContent>
      </OperationalCard>
    </div>
  );
}
