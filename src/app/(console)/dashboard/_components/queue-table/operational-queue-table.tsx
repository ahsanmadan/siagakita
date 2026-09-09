"use client";

import { useMemo, useState } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ShelterNeed } from "@/lib/dashboard-metrics";
import type { AuditLogItem } from "@/lib/repositories/audit";
import type { Distribution, FieldReport } from "@/lib/types";
import {
  AUDIT_COLUMN_LABELS,
  DISTRIBUTION_COLUMN_LABELS,
  NEED_COLUMN_LABELS,
  REPORT_COLUMN_LABELS,
  auditColumns,
  distributionColumns,
  needColumns,
  reportColumns,
} from "./columns";
import { DataTableShell } from "./data-table-shell";

export function OperationalQueueTable({
  reports,
  needs,
  distributions,
  auditLogs,
  canVerifyReport,
  canOpenIncident,
  canViewAudit,
}: {
  reports: FieldReport[];
  needs: ShelterNeed[];
  distributions: Distribution[];
  auditLogs: AuditLogItem[];
  canVerifyReport: boolean;
  canOpenIncident: boolean;
  canViewAudit: boolean;
}) {
  const [tab, setTab] = useState("laporan");
  const reportCols = useMemo(() => reportColumns({ canVerifyReport, canOpenIncident }), [canOpenIncident, canVerifyReport]);
  const needCols = useMemo(() => needColumns(), []);
  const distributionCols = useMemo(() => distributionColumns(), []);
  const auditCols = useMemo(() => auditColumns(), []);

  const descriptions: Record<string, string> = {
    laporan: "Laporan lapangan yang tersimpan beserta status verifikasinya.",
    kebutuhan: "Kebutuhan posko yang belum terpenuhi penuh atau berstatus kritis.",
    distribusi: "Distribusi bantuan yang belum dikonfirmasi diterima posko.",
    audit: "Riwayat perubahan operasional, dibatasi 80 catatan terbaru.",
  };

  return (
    <Card className="operational-surface py-0 shadow-none">
      <Tabs value={tab} onValueChange={setTab}>
        <CardHeader className="gap-3 pt-5">
          <CardTitle className="text-base">Antrean operasional</CardTitle>
          <CardDescription>{descriptions[tab]}</CardDescription>
          <CardAction>
            <TabsList variant="line" className="flex-wrap">
              <TabsTrigger value="laporan">Laporan masuk ({reports.length})</TabsTrigger>
              <TabsTrigger value="kebutuhan">Kebutuhan kritis ({needs.length})</TabsTrigger>
              <TabsTrigger value="distribusi">Distribusi aktif ({distributions.length})</TabsTrigger>
              {canViewAudit ? <TabsTrigger value="audit">Audit ({auditLogs.length})</TabsTrigger> : null}
            </TabsList>
          </CardAction>
        </CardHeader>
        <CardContent className="pb-5">
          <TabsContent value="laporan">
            <DataTableShell
              id="queue-reports"
              data={reports}
              columns={reportCols}
              columnLabels={REPORT_COLUMN_LABELS}
              searchPlaceholder="Cari ID, lokasi, atau ringkasan laporan"
              emptyLabel="Belum ada laporan lapangan tersimpan."
              initialSorting={[{ id: "receivedAtIso", desc: true }]}
            />
          </TabsContent>
          <TabsContent value="kebutuhan">
            <DataTableShell
              id="queue-needs"
              data={needs}
              columns={needCols}
              columnLabels={NEED_COLUMN_LABELS}
              searchPlaceholder="Cari kebutuhan atau posko"
              emptyLabel="Tidak ada kebutuhan kritis saat ini."
              initialSorting={[{ id: "shortage", desc: true }]}
            />
          </TabsContent>
          <TabsContent value="distribusi">
            <DataTableShell
              id="queue-distributions"
              data={distributions}
              columns={distributionCols}
              columnLabels={DISTRIBUTION_COLUMN_LABELS}
              searchPlaceholder="Cari muatan atau tujuan distribusi"
              emptyLabel="Tidak ada distribusi aktif."
            />
          </TabsContent>
          {canViewAudit ? (
            <TabsContent value="audit">
              <DataTableShell
                id="queue-audit"
                data={auditLogs}
                columns={auditCols}
                columnLabels={AUDIT_COLUMN_LABELS}
                searchPlaceholder="Cari aksi, actor, atau target"
                emptyLabel="Belum ada audit log yang bisa ditampilkan."
                initialSorting={[{ id: "createdAtIso", desc: true }]}
              />
            </TabsContent>
          ) : null}
        </CardContent>
      </Tabs>
    </Card>
  );
}
