import Link from "next/link";
import { Activity, ArrowRight, Boxes, MapPinned, RadioTower, Sparkles, TentTree, Users } from "lucide-react";
import { CrisisMap, type MapPoint } from "@/components/crisis-map";
import { DashboardTrend } from "@/components/dashboard-trend";
import { MapLegendDrawer } from "@/components/map-legend-drawer";
import { MetricCard } from "@/components/metric-card";
import { MutationAction } from "@/components/mutation-action";
import { CommandStrip, MapOverlay, MetricStrip, OperationalCard } from "@/components/operational-ui";
import { OperationalBrief } from "@/components/operational-brief";
import { PageHeader } from "@/components/page-header";
import { RecommendationCard } from "@/components/recommendation-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createFieldReport } from "@/lib/actions/operations";
import { pickSystemRecommendation } from "@/lib/recommendation-context";
import { getOperationsData } from "@/lib/repositories/operations";
import type { FieldReport } from "@/lib/types";

function buildReportTrend(fieldReports: FieldReport[]) {
  const now = new Date();
  const buckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now);
    date.setMinutes(0, 0, 0);
    date.setHours(date.getHours() - (5 - index));
    return {
      key: date.toISOString().slice(0, 13),
      time: new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(date).replace(":", "."),
      reports: 0,
    };
  });

  for (const report of fieldReports) {
    const received = new Date(report.receivedAtIso);
    const key = received.toISOString().slice(0, 13);
    const bucket = buckets.find((item) => item.key === key);
    if (bucket) bucket.reports += 1;
  }

  return buckets.map(({ time, reports }) => ({ time, reports }));
}

export default async function DashboardPage() {
  const { disasterEvents, distributions, fieldReports, metrics, recommendations, shelters } = await getOperationsData();
  const priorityEvent = disasterEvents[0];
  const primaryRecommendation = pickSystemRecommendation(recommendations);
  const reportTrend = buildReportTrend(fieldReports);
  const newReports = fieldReports.filter((report) => report.status === "baru").length;
  const criticalShelters = shelters.filter((shelter) => shelter.status === "critical").length;
  const activeDistributions = distributions.filter((distribution) => distribution.status !== "diterima").length;
  const mapPoints: MapPoint[] = [
    ...disasterEvents.map((event) => ({ id: event.id, name: event.name, location: event.location, latitude: event.coordinates.latitude, longitude: event.coordinates.longitude, status: event.status, kind: "Kejadian" as const, detail: event.summary })),
    ...shelters.map((shelter) => ({ id: shelter.id, name: shelter.name, location: shelter.location, latitude: shelter.coordinates.latitude, longitude: shelter.coordinates.longitude, status: shelter.status, kind: "Posko" as const, detail: `${shelter.population.total} pengungsi · pembaruan ${shelter.lastUpdate}` })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pusat Kendali"
        description="Ringkasan situasi lintas kejadian berdasarkan data yang tersimpan pada sistem."
        actions={
          <>
            <Button variant="outline" asChild className="min-h-11"><Link href="/peta-publik">Lihat peta publik</Link></Button>
            <MutationAction action={createFieldReport} label="Buat laporan" fields={{ location: "Laporan cepat pusat kendali", reporter: "Operator BPBD", summary: "Laporan cepat membutuhkan tindak lanjut dan verifikasi petugas.", channel: "Petugas", severity: "warning" }} />
          </>
        }
      />

      <OperationalBrief
        items={[
          { label: "Laporan baru", value: `${newReports} menunggu verifikasi`, detail: "Perlu triase sebelum dibuka menjadi kejadian.", tone: newReports ? "critical" : "teal", icon: RadioTower },
          { label: "Posko kritis", value: `${criticalShelters} posko prioritas`, detail: "Dipakai untuk menentukan alokasi bantuan berikutnya.", tone: criticalShelters ? "warning" : "teal", icon: TentTree },
          { label: "Distribusi aktif", value: `${activeDistributions} pengiriman berjalan`, detail: "Pantau ETA dan konfirmasi penerimaan posko.", tone: activeDistributions ? "warning" : "neutral", icon: Boxes },
    { label: "Saran prioritas", value: primaryRecommendation ? "Perlu tinjauan operator" : "Belum ada saran", detail: "Dihitung dari data posko, stok, dan kebutuhan.", tone: primaryRecommendation ? "critical" : "neutral", icon: Sparkles },
        ]}
      />

      {priorityEvent ? (
        <CommandStrip
          title={priorityEvent.name}
          detail={`${priorityEvent.location}, ${priorityEvent.province} · ${priorityEvent.summary}`}
          meta={`Diperbarui ${priorityEvent.updatedAt}`}
          action={<Button asChild size="sm"><Link href={`/kejadian/${priorityEvent.id}`}>Buka ruang operasi <ArrowRight /></Link></Button>}
        />
      ) : null}

      <MetricStrip>
        <MetricCard label="Kejadian aktif" value={String(metrics.activeEvents)} note={`${disasterEvents.filter((event) => event.status === "critical").length} berstatus kritis`} icon={RadioTower} tone="critical" />
        <MetricCard label="Warga terdampak" value={metrics.affectedPeople.toLocaleString("id-ID")} note="Akumulasi seluruh kejadian" icon={Users} />
        <MetricCard label="Posko aktif" value={String(metrics.activeShelters)} note={`${shelters.length} posko tercatat`} icon={TentTree} tone="teal" />
        <MetricCard label="Kebutuhan kritis" value={String(metrics.criticalNeeds)} note="Memerlukan alokasi segera" icon={Boxes} tone="warning" />
      </MetricStrip>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,0.72fr)]">
        <OperationalCard emphasis="map" className="map-workspace min-w-0 self-start">
          <CardHeader className="flex flex-row items-center justify-between gap-4 border-b bg-card/88 py-4">
            <div><CardTitle className="text-base">Peta situasi nasional</CardTitle><CardDescription>Marker kejadian dan posko prioritas</CardDescription></div>
            <div className="flex items-center gap-2"><MapLegendDrawer /><Badge variant="outline" className="hidden rounded-full sm:flex"><Activity /> Data aktif</Badge></div>
          </CardHeader>
          <CardContent className="relative p-0">
            <CrisisMap points={mapPoints} className="h-[31rem] rounded-none border-0" />
            <MapOverlay icon={MapPinned} eyebrow="Fokus pemantauan" title="Prioritas lintas wilayah">
              Posko dan kejadian ditampilkan dari database operasional.
            </MapOverlay>
          </CardContent>
        </OperationalCard>

        <div className="grid min-w-0 gap-4">
          {primaryRecommendation ? <RecommendationCard recommendation={primaryRecommendation} title="Saran prioritas lintas sistem" /> : null}
          <OperationalCard><CardHeader className="pb-0 pt-5"><CardTitle className="text-base">Laporan masuk per jam</CardTitle><CardDescription>Dihitung dari laporan enam jam terakhir</CardDescription></CardHeader><CardContent className="pb-4"><DashboardTrend data={reportTrend} /></CardContent></OperationalCard>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <OperationalCard className="overflow-clip">
          <CardHeader className="flex flex-row items-center justify-between gap-4 py-5"><div><CardTitle className="text-base">Kejadian aktif</CardTitle><CardDescription>Urut berdasarkan tingkat prioritas</CardDescription></div>{priorityEvent ? <Button variant="ghost" asChild><Link href={`/kejadian/${priorityEvent.id}`}>Detail <ArrowRight /></Link></Button> : null}</CardHeader>
          <CardContent className="p-0"><div className="grid gap-3 p-4 md:hidden">{disasterEvents.map((event) => <article key={event.id} className="rounded-xl border bg-background/72 p-4"><div className="flex items-start justify-between gap-3"><div><Link href={`/kejadian/${event.id}`} className="inline-flex min-h-8 items-center font-semibold hover:text-primary">{event.name}</Link><p className="mt-1 text-xs text-muted-foreground">{event.location} · {event.updatedAt}</p></div><StatusBadge status={event.status} /></div><p className="mt-4 border-t pt-3 text-xs text-muted-foreground"><strong className="data-number mr-1 text-base text-foreground">{event.affectedPeople.toLocaleString("id-ID")}</strong> warga terdampak</p></article>)}</div><div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Kejadian</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Terdampak</TableHead></TableRow></TableHeader><TableBody>{disasterEvents.map((event) => <TableRow key={event.id}><TableCell><Link href={`/kejadian/${event.id}`} className="inline-flex min-h-8 items-center font-medium hover:text-primary">{event.name}</Link><p className="mt-1 text-xs text-muted-foreground">{event.location} · {event.updatedAt}</p></TableCell><TableCell><StatusBadge status={event.status} /></TableCell><TableCell className="data-number text-right font-medium">{event.affectedPeople.toLocaleString("id-ID")}</TableCell></TableRow>)}</TableBody></Table></div></CardContent>
        </OperationalCard>
        <OperationalCard><CardHeader className="py-5"><CardTitle className="text-base">Distribusi berjalan</CardTitle><CardDescription>Pergerakan bantuan yang perlu dipantau</CardDescription></CardHeader><CardContent className="space-y-5 pb-5">{distributions.slice(0, 2).map((item) => <div key={item.id}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium">{item.destination}</p><p className="mt-1 text-xs text-muted-foreground">{item.cargo}</p></div><Badge variant="outline">{item.eta}</Badge></div><Progress value={item.progress} className="mt-3" /></div>)}</CardContent></OperationalCard>
      </section>
    </div>
  );
}
