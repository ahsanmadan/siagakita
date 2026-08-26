import { CheckCircle2, Clock3, MessageSquareText, RadioTower, ShieldCheck } from "lucide-react";
import { ConfirmMutationAction } from "@/components/confirm-mutation-action";
import { MetricCard } from "@/components/metric-card";
import { MutationAction } from "@/components/mutation-action";
import { OperationalBrief } from "@/components/operational-brief";
import { FilterBar, MetricStrip, OperationalCard } from "@/components/operational-ui";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ZeroGridSimulator } from "@/components/zero-grid-simulator";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createFieldReport, openEventFromReport, verifyFieldReport } from "@/lib/actions/operations";
import { getOperationsData } from "@/lib/repositories/operations";

const reportStatus = { baru: "Baru", diverifikasi: "Diverifikasi", ditindaklanjuti: "Ditindaklanjuti" };

export default async function ReportsPage() {
  const { fieldReports } = await getOperationsData();
  const reportStages = [
    {
      label: "Baru",
      detail: "Menunggu verifikasi awal",
      count: fieldReports.filter((report) => report.status === "baru").length,
      tone: "critical",
    },
    {
      label: "Diverifikasi",
      detail: "Siap ditautkan ke kejadian",
      count: fieldReports.filter((report) => report.status === "diverifikasi").length,
      tone: "warning",
    },
    {
      label: "Ditindaklanjuti",
      detail: "Sudah masuk alur operasi",
      count: fieldReports.filter((report) => report.status === "ditindaklanjuti").length,
      tone: "teal",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan & Zero-Grid"
        description="Satukan laporan web, SMS, dan petugas lapangan ke antrean verifikasi yang dapat ditindaklanjuti."
        actions={<MutationAction action={createFieldReport} label="Buat laporan" fields={{ location: "Laporan web", reporter: "Operator BPBD", summary: "Laporan baru membutuhkan verifikasi petugas lapangan.", channel: "Web", severity: "warning" }} />}
      />

      <OperationalBrief
        items={[
          { label: "Perlu verifikasi", value: `${reportStages[0].count} laporan baru`, detail: "Belum boleh dibuka menjadi kejadian.", tone: reportStages[0].count ? "critical" : "teal", icon: Clock3 },
          { label: "Siap dibuka", value: `${reportStages[1].count} terverifikasi`, detail: "Perlu keputusan operator untuk buka kejadian.", tone: reportStages[1].count ? "warning" : "neutral", icon: ShieldCheck },
          { label: "Zero-Grid", value: `${fieldReports.filter((report) => report.channel === "SMS Zero-Grid").length} laporan SMS`, detail: "Adapter manual; gateway SMS belum terhubung.", tone: "warning", icon: MessageSquareText },
          { label: "Ditindaklanjuti", value: `${reportStages[2].count} laporan`, detail: "Sudah masuk alur operasi atau kejadian.", tone: reportStages[2].count ? "teal" : "neutral", icon: CheckCircle2 },
        ]}
      />

      <MetricStrip>
        <MetricCard label="Laporan baru" value={String(fieldReports.filter((report) => report.status === "baru").length)} note="Perlu verifikasi segera" icon={Clock3} tone="critical" />
        <MetricCard label="Zero-Grid" value={String(fieldReports.filter((report) => report.channel === "SMS Zero-Grid").length)} note="Adapter manual, belum gateway" icon={MessageSquareText} tone="warning" />
        <MetricCard label="Diverifikasi" value={String(fieldReports.filter((report) => report.status === "diverifikasi").length)} note="Data lapangan dikonfirmasi" icon={ShieldCheck} />
        <MetricCard label="Ditindaklanjuti" value={String(fieldReports.filter((report) => report.status === "ditindaklanjuti").length)} note="Masuk alur operasional" icon={CheckCircle2} tone="teal" />
      </MetricStrip>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.65fr)]">
        <OperationalCard className="overflow-clip">
          <CardHeader className="gap-4 py-5">
            <div><CardTitle className="text-base">Antrean laporan masuk</CardTitle><CardDescription>Prioritas verifikasi berdasarkan urgensi dan kanal</CardDescription></div>
            <FilterBar><span className="mr-auto text-xs font-medium text-muted-foreground">Filter antrean</span><Select defaultValue="all"><SelectTrigger className="w-full bg-background sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua kanal</SelectItem><SelectItem value="sms">SMS Zero-Grid</SelectItem><SelectItem value="web">Web</SelectItem><SelectItem value="field">Petugas</SelectItem></SelectContent></Select></FilterBar>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid gap-3 p-4 md:hidden">
              {fieldReports.map((report) => (
                <article key={report.id} className="rounded-xl border bg-background/72 p-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{report.id}</p><p className="mt-1 text-xs text-muted-foreground">{report.location} · {report.receivedAt}</p></div><StatusBadge status={report.severity} /></div>
                  <p className="mt-3 text-sm leading-6">{report.summary}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3"><Badge variant={report.channel === "SMS Zero-Grid" ? "secondary" : "outline"}>{report.channel}</Badge><Badge variant="outline">{reportStatus[report.status]}</Badge><MutationAction className="ml-auto" action={verifyFieldReport} label={report.status === "baru" ? "Verifikasi" : "Tindak lanjut"} fields={{ code: report.id }} variant={report.status === "baru" ? "outline" : "secondary"} />{report.status !== "baru" ? <ConfirmMutationAction action={openEventFromReport} label="Buka kejadian" title={`Buka kejadian dari ${report.id}?`} description={`Laporan ${report.location} akan menjadi kejadian aktif baru bila belum terhubung ke kejadian lain.`} consequence="Sistem membuat kejadian baru, menghubungkan laporan, dan mencatat keputusan operator di audit log." fields={{ code: report.id, name: `Kejadian ${report.location}` }} /> : null}</div>
                </article>
              ))}
            </div>
            <div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>ID & lokasi</TableHead><TableHead>Kanal</TableHead><TableHead>Ringkasan</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader><TableBody>{fieldReports.map((report) => <TableRow key={report.id}><TableCell><p className="font-medium">{report.id}</p><p className="mt-1 text-xs text-muted-foreground">{report.location} · {report.receivedAt}</p></TableCell><TableCell><Badge variant={report.channel === "SMS Zero-Grid" ? "secondary" : "outline"}>{report.channel}</Badge></TableCell><TableCell className="min-w-60 max-w-sm whitespace-normal"><p className="line-clamp-2 text-sm leading-6">{report.summary}</p><StatusBadge status={report.severity} className="mt-2 w-fit" /></TableCell><TableCell><Badge variant="outline">{reportStatus[report.status]}</Badge></TableCell><TableCell><div className="flex flex-wrap gap-2"><MutationAction action={verifyFieldReport} label={report.status === "baru" ? "Verifikasi" : "Tindak lanjut"} fields={{ code: report.id }} variant={report.status === "baru" ? "outline" : "secondary"} />{report.status !== "baru" ? <ConfirmMutationAction action={openEventFromReport} label="Buka kejadian" title={`Buka kejadian dari ${report.id}?`} description={`Laporan ${report.location} akan menjadi kejadian aktif baru bila belum terhubung ke kejadian lain.`} consequence="Sistem membuat kejadian baru, menghubungkan laporan, dan mencatat keputusan operator di audit log." fields={{ code: report.id, name: `Kejadian ${report.location}` }} /> : null}</div></TableCell></TableRow>)}</TableBody></Table></div>
          </CardContent>
        </OperationalCard>
        <ZeroGridSimulator />
      </section>

      <OperationalCard><CardHeader className="py-5"><div className="flex items-center gap-2"><RadioTower className="size-5 text-primary" /><div><CardTitle className="text-base">Status antrean verifikasi</CardTitle><CardDescription>Ringkasan ini mengikuti status laporan yang tersimpan, bukan langkah dekoratif.</CardDescription></div></div></CardHeader><CardContent className="grid gap-3 pb-5 md:grid-cols-3">{reportStages.map((stage) => <div key={stage.label} className="relative rounded-xl border bg-background/60 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{stage.label}</p><Badge variant={stage.tone === "teal" ? "secondary" : "outline"}>{stage.count} laporan</Badge></div><p className="mt-2 text-xs text-muted-foreground">{stage.detail}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${fieldReports.length ? Math.max(8, Math.round((stage.count / fieldReports.length) * 100)) : 0}%` }} /></div></div>)}</CardContent></OperationalCard>
    </div>
  );
}
