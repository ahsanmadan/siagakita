import {
  Ban,
  FileClock,
  ShieldAlert,
  UserRoundCheck,
} from "lucide-react";
import { OperationalCard } from "@/components/operational-ui";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth";
import { getAuditLogs } from "@/lib/repositories/audit";
import { AuditLogTable } from "./_components/audit-log-table";

type AuditFilter = "semua" | "verifikasi" | "alokasi" | "status" | "entri";

function parseFilter(value: string | string[] | undefined): AuditFilter {
  const candidate = Array.isArray(value) ? value[0] : value;
  const validFilters: AuditFilter[] = ["semua", "verifikasi", "alokasi", "status", "entri"];
  return validFilters.includes(candidate as AuditFilter) ? (candidate as AuditFilter) : "semua";
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ aksi?: string | string[] }>;
}) {
  const [, resolvedSearchParams] = await Promise.all([
    requireRole(["admin", "bpbd_operator"], "/dashboard"),
    searchParams,
  ]);

  const auditLogs = await getAuditLogs();
  const initialFilter = parseFilter(resolvedSearchParams.aksi);

  const uniqueActors = new Set(auditLogs.map((log) => log.actorEmail)).size;
  const decisionCount = auditLogs.filter(
    (log) =>
      log.severity === "critical" ||
      log.severity === "warning" ||
      log.action.includes("opened") ||
      log.action.includes("allocated") ||
      log.action.includes("escalated"),
  ).length;
  const thirdPartyAidCount = auditLogs.filter((log) => log.targetTable === "third_party_aids").length;
  const rejectedCount = auditLogs.filter(
    (log) =>
      log.action === "report.rejected" ||
      log.action === "account.rejected" ||
      log.action === "account.batch_rejected",
  ).length;
  const uniqueTablesCount = new Set(auditLogs.map((log) => log.targetTable)).size;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── 1. Page Header (Plus Jakarta Sans Heading, Inter Subtitle) ── */}
      <PageHeader
        title="Audit Log"
        description="Riwayat keputusan, perubahan status, dan mutasi penting yang tersimpan di database."
      />

      {/* ── 2. Compact 1-Row Summary Strip ── */}
      <section
        aria-label="Ringkasan metrik audit"
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3"
      >
        {/* Total Log */}
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/90 px-3.5 py-2.5 shadow-2xs transition-colors hover:border-border">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <FileClock className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-sans text-[11px] font-medium text-muted-foreground">Total Log</p>
            <div className="flex items-baseline gap-1.5">
              <p className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {auditLogs.length}
              </p>
              <span className="font-sans text-[10.5px] text-muted-foreground">tercatat</span>
            </div>
          </div>
        </div>

        {/* Keputusan Kritis */}
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/90 px-3.5 py-2.5 shadow-2xs transition-colors hover:border-border">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-sans text-[11px] font-medium text-muted-foreground">Keputusan Kritis</p>
            <div className="flex items-baseline gap-1.5">
              <p className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {decisionCount}
              </p>
              <span className="font-sans text-[10.5px] text-muted-foreground">aksi</span>
            </div>
          </div>
        </div>

        {/* Laporan Ditolak */}
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/90 px-3.5 py-2.5 shadow-2xs transition-colors hover:border-border">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <Ban className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-sans text-[11px] font-medium text-muted-foreground">Laporan Ditolak</p>
            <div className="flex items-baseline gap-1.5">
              <p className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {rejectedCount}
              </p>
              <span className="font-sans text-[10.5px] text-muted-foreground">triase</span>
            </div>
          </div>
        </div>

        {/* Pelaku Tercatat */}
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/90 px-3.5 py-2.5 shadow-2xs transition-colors hover:border-border">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <UserRoundCheck className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-sans text-[11px] font-medium text-muted-foreground">Pelaku Tercatat</p>
            <div className="flex items-baseline gap-1.5">
              <p className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {uniqueActors}
              </p>
              <span className="font-sans text-[10.5px] text-muted-foreground">akun</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Interactive Audit Log Table Card ── */}
      <OperationalCard className="overflow-clip">
        <AuditLogTable
          initialLogs={auditLogs}
          uniqueTablesCount={uniqueTablesCount}
          thirdPartyAidCount={thirdPartyAidCount}
          initialFilter={initialFilter}
        />
      </OperationalCard>
    </div>
  );
}
