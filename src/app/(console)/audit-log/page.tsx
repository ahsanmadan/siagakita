import { Activity, Database, FileClock, ShieldCheck, UserRoundCheck } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { OperationalBrief } from "@/components/operational-brief";
import { MetricStrip, OperationalCard } from "@/components/operational-ui";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireProfile, roleLabel } from "@/lib/auth";
import { getAuditLogs } from "@/lib/repositories/audit";

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    "event.escalated": "Eskalasi kejadian",
    "event.opened_from_report": "Buka kejadian",
    "report.created": "Laporan dibuat",
    "report.verified": "Laporan diverifikasi",
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

  return labels[action] ?? action;
}

function actionTone(action: string) {
  if (action.includes("opened") || action.includes("allocated") || action.includes("escalated")) return "destructive";
  if (action.includes("received") || action.includes("reviewed")) return "secondary";
  return "outline";
}

export default async function AuditLogPage() {
  const profile = await requireProfile();
  const allowed = profile.role === "admin" || profile.role === "bpbd_operator";

  if (!allowed) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Audit Log"
          description="Riwayat keputusan operasional hanya dapat dibuka oleh admin atau operator BPBD."
        />
        <OperationalCard emphasis="critical">
          <CardHeader className="py-5">
            <CardTitle className="text-lg">Akses audit dibatasi</CardTitle>
            <CardDescription>
              Akun Anda terdeteksi sebagai {roleLabel(profile.role)}. Data audit memuat riwayat keputusan dan perubahan internal, sehingga tidak ditampilkan untuk role ini.
            </CardDescription>
          </CardHeader>
        </OperationalCard>
      </div>
    );
  }

  const auditLogs = await getAuditLogs();
  const uniqueActors = new Set(auditLogs.map((log) => log.actorEmail)).size;
  const decisionCount = auditLogs.filter((log) => log.action.includes("opened") || log.action.includes("allocated") || log.action.includes("escalated")).length;
  const thirdPartyAidCount = auditLogs.filter((log) => log.targetTable === "third_party_aids").length;

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
          { label: "Bantuan pihak ketiga", value: `${thirdPartyAidCount} log`, detail: "Catat, validasi gudang, dan alokasi bantuan.", tone: thirdPartyAidCount ? "warning" : "neutral", icon: Database },
          { label: "Pelaku tercatat", value: `${uniqueActors} akun`, detail: "Berdasarkan actor yang menulis perubahan.", tone: uniqueActors ? "teal" : "neutral", icon: UserRoundCheck },
        ]}
      />

      <MetricStrip>
        <MetricCard label="Total audit" value={String(auditLogs.length)} note="Perubahan terbaru" icon={Activity} />
        <MetricCard label="Target tabel" value={String(new Set(auditLogs.map((log) => log.targetTable)).size)} note="Domain data terdampak" icon={Database} />
        <MetricCard label="Keputusan penting" value={String(decisionCount)} note="Perlu mudah dijelaskan" icon={ShieldCheck} tone="warning" />
        <MetricCard label="Actor" value={String(uniqueActors)} note="Akun dengan aktivitas" icon={UserRoundCheck} tone="teal" />
      </MetricStrip>

      <OperationalCard className="overflow-clip">
        <CardHeader className="py-5">
          <CardTitle className="text-base">Riwayat perubahan</CardTitle>
          <CardDescription>Audit log membantu menjawab siapa mengubah apa, kapan, dan dampak ringkasnya.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {auditLogs.length ? (
            <>
              <div className="grid gap-3 p-4 md:hidden">
                {auditLogs.map((log) => (
                  <article key={log.id} className="rounded-xl border bg-background/72 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{actionLabel(log.action)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{log.createdAt}</p>
                      </div>
                      <Badge variant={actionTone(log.action)}>{log.targetTable}</Badge>
                    </div>
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
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Aksi</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Ringkasan perubahan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="min-w-36 text-xs text-muted-foreground">{log.createdAt}</TableCell>
                        <TableCell>
                          <Badge variant={actionTone(log.action)}>{actionLabel(log.action)}</Badge>
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
            <div className="p-5 text-sm text-muted-foreground">Belum ada audit log yang bisa ditampilkan.</div>
          )}
        </CardContent>
      </OperationalCard>
    </div>
  );
}
