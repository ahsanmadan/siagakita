import { notFound } from "next/navigation";
import { ArrowUpRight, Building2, Clock3, MapPin, Route, ShieldAlert, Users } from "lucide-react";
import { CrisisMap, type MapPoint } from "@/components/crisis-map";
import { MapLegendDrawer } from "@/components/map-legend-drawer";
import { ConfirmMutationAction } from "@/components/confirm-mutation-action";
import { OperationalBrief } from "@/components/operational-brief";
import { CommandStrip, MapOverlay, OperationalCard } from "@/components/operational-ui";
import { PageHeader } from "@/components/page-header";
import { RecommendationCard } from "@/components/recommendation-card";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { escalateEventAction } from "@/lib/actions/operations";
import { pickEventRecommendation } from "@/lib/recommendation-context";
import { getEventByCode } from "@/lib/repositories/operations";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getEventByCode(id);
  if (!data) notFound();

  const { event, institutions, recommendations, relatedShelters } = data;
  const criticalNeeds = relatedShelters.flatMap((shelter) =>
    shelter.needs
      .filter((need) => need.urgency === "critical" || need.requested > need.available)
      .map((need) => ({ ...need, shelterName: shelter.name, shelter })),
  );
  const needPoints: MapPoint[] = criticalNeeds.slice(0, 4).map((need, index) => ({
    id: `${need.shelter.id}-${need.id}-need`,
    name: need.item,
    location: need.shelterName,
    latitude: need.shelter.coordinates.latitude + (index % 2 === 0 ? 0.018 : -0.016),
    longitude: need.shelter.coordinates.longitude + (index % 2 === 0 ? 0.014 : -0.014),
    status: need.urgency,
    kind: "Critical Need",
    detail: `Kekurangan ${(need.requested - need.available).toLocaleString("id-ID")} ${need.unit} untuk posko.`,
  }));
  const points: MapPoint[] = [
    { id: event.id, name: event.name, location: event.location, latitude: event.coordinates.latitude, longitude: event.coordinates.longitude, status: event.status, kind: "Kejadian", detail: event.summary },
    ...relatedShelters.map((shelter) => ({ id: shelter.id, name: shelter.name, location: shelter.location, latitude: shelter.coordinates.latitude, longitude: shelter.coordinates.longitude, status: shelter.status, kind: "Posko" as const, detail: `${shelter.population.total} pengungsi` })),
    ...needPoints,
  ];
  const recommendation = pickEventRecommendation(recommendations, event.dbId, relatedShelters);
  const criticalShelters = relatedShelters.filter((shelter) => shelter.status === "critical").length;
  const activeInstitutions = institutions.filter((institution) => institution.contactStatus === "aktif").length;
  const operationalTimeline = [
    {
      time: "Report",
      title: "Field report diterima",
      detail: `Laporan awal dari area ${event.location} masuk sebagai dasar triase BPBD.`,
      meta: <Badge variant="outline">intake</Badge>,
    },
    {
      time: "Verification",
      title: "BPBD memverifikasi dampak",
      detail: `${event.affectedPeople.toLocaleString("id-ID")} warga terdampak dan ${relatedShelters.length} posko menjadi konteks keputusan.`,
      meta: <StatusBadge status={event.status} />,
    },
    {
      time: "Incident",
      title: "Incident room aktif",
      detail: `Kejadian ${event.name} dibuka pada level eskalasi ${event.escalationLevel}.`,
      meta: <Badge variant="secondary">command</Badge>,
    },
    {
      time: "Needs",
      title: "Kebutuhan posko diprioritaskan",
      detail: criticalNeeds.length ? `${criticalNeeds[0].item} menjadi kebutuhan utama di ${criticalNeeds[0].shelterName}.` : "Kebutuhan posko dipantau dari pembaruan lapangan.",
      meta: <Badge variant="outline">{criticalNeeds.length} kebutuhan</Badge>,
    },
    {
      time: "Distribution",
      title: "Distribusi bantuan dikoordinasikan",
      detail: "Gudang mengalokasikan bantuan dan posko mengonfirmasi penerimaan saat sampai.",
      meta: <Badge variant="outline">logistics</Badge>,
    },
    {
      time: "Audit",
      title: "Keputusan tercatat",
      detail: "Verifikasi, eskalasi, dan tindak lanjut penting masuk ke audit log untuk transparansi.",
      meta: <Badge variant="outline">traceable</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={event.name} description={`${event.type} · ${event.location}, ${event.province} · diperbarui ${event.updatedAt}`} actions={<><StatusBadge status={event.status} /><ConfirmMutationAction action={escalateEventAction} label="Naikkan eskalasi" title="Naikkan level eskalasi?" description="Gunakan hanya jika kapasitas dukungan saat ini tidak cukup untuk kebutuhan lapangan." consequence="Level kejadian diperbarui, riwayat status bertambah, dan keputusan tercatat di audit log." fields={{ code: event.id, escalationLevel: event.escalationLevel === "Nasional" ? "Nasional" : "Provinsi", note: "Permintaan eskalasi diteruskan untuk persetujuan." }} variant="outline" /></>} />

      <CommandStrip title={`${event.escalationLevel} · respons aktif`} detail="Koordinasi lintas lembaga dan distribusi bantuan sedang berjalan." meta={`${relatedShelters.length} posko terhubung`} />

      <OperationalBrief
        items={[
          { label: "Level eskalasi", value: event.escalationLevel, detail: "Menentukan jalur otoritas dan dukungan gudang.", tone: event.escalationLevel === "Kabupaten" ? "neutral" : "warning", icon: ShieldAlert },
          { label: "Posko kritis", value: `${criticalShelters} dari ${relatedShelters.length} posko`, detail: "Perlu diprioritaskan dalam pemeriksaan kebutuhan.", tone: criticalShelters ? "critical" : "teal", icon: Users },
          { label: "Koordinasi", value: `${activeInstitutions} lembaga aktif`, detail: "Kontak aktif untuk pembagian tugas lapangan.", tone: activeInstitutions ? "teal" : "warning", icon: Building2 },
          { label: "Decision support", value: recommendation ? "Menunggu validasi" : "Belum tersedia", detail: "Berdasarkan data posko, stok, dan kebutuhan; operator tetap memutuskan.", tone: recommendation ? "critical" : "neutral", icon: ShieldAlert },
        ]}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="py-0 shadow-none"><CardContent className="flex items-center gap-3 p-4"><div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldAlert /></div><div><p className="text-xs text-muted-foreground">Level eskalasi</p><p className="font-semibold">{event.escalationLevel}</p></div></CardContent></Card>
        <Card className="py-0 shadow-none"><CardContent className="flex items-center gap-3 p-4"><div className="grid size-10 place-items-center rounded-xl bg-secondary text-[var(--color-teal)]"><Users /></div><div><p className="text-xs text-muted-foreground">Warga terdampak</p><p className="data-number font-semibold">{event.affectedPeople.toLocaleString("id-ID")}</p></div></CardContent></Card>
        <Card className="py-0 shadow-none"><CardContent className="flex items-center gap-3 p-4"><div className="grid size-10 place-items-center rounded-xl bg-status-warning/15"><MapPin /></div><div><p className="text-xs text-muted-foreground">Posko aktif</p><p className="data-number font-semibold">{event.activeShelters}</p></div></CardContent></Card>
        <Card className="py-0 shadow-none"><CardContent className="flex items-center gap-3 p-4"><div className="grid size-10 place-items-center rounded-xl bg-muted"><Clock3 /></div><div><p className="text-xs text-muted-foreground">Status komando</p><p className="font-semibold">Respons aktif</p></div></CardContent></Card>
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(21rem,0.75fr)]">
        <OperationalCard emphasis="map" className="map-workspace"><CardHeader className="flex flex-row items-center justify-between gap-4 border-b py-4"><div><CardTitle className="text-base">Crisis Situation Map</CardTitle><CardDescription>Operational Map View untuk lokasi kejadian, posko, dan akses bantuan</CardDescription></div><MapLegendDrawer /></CardHeader><CardContent className="relative p-0"><CrisisMap points={points} center={[event.coordinates.longitude, event.coordinates.latitude]} zoom={10.2} className="h-[34rem] rounded-none" /><MapOverlay icon={Route} eyebrow="Akses distribusi" title="Jalur kendaraan ringan dibuka satu arah">Validasi lapangan tetap diperlukan sebelum pengiriman berikutnya.</MapOverlay></CardContent></OperationalCard>
        <div className="space-y-4">
          {recommendation ? <RecommendationCard recommendation={recommendation} /> : null}
          <OperationalCard><CardHeader className="pb-2 pt-5"><CardTitle className="text-base">Ringkasan kondisi</CardTitle></CardHeader><CardContent className="pb-5 text-sm leading-6 text-muted-foreground">{event.summary}</CardContent></OperationalCard>
        </div>
      </section>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="h-auto min-h-11 flex-wrap"><TabsTrigger value="timeline">Operational timeline</TabsTrigger><TabsTrigger value="institutions">Koordinasi lembaga</TabsTrigger><TabsTrigger value="shelters">Posko terdampak</TabsTrigger></TabsList>
        <TabsContent value="timeline"><Card className="py-0 shadow-none"><CardContent className="p-0"><Timeline items={operationalTimeline} /></CardContent></Card></TabsContent>
        <TabsContent value="institutions"><div className="grid gap-3 md:grid-cols-2">{institutions.map((institution) => <Card key={institution.id} className="py-0 shadow-none"><CardContent className="flex items-start gap-4 p-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary"><Building2 className="size-5 text-[var(--color-teal)]" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="font-medium">{institution.name}</p><Badge variant={institution.contactStatus === "aktif" ? "secondary" : "outline"}>{institution.contactStatus}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{institution.role}</p><p className="mt-3 text-xs font-medium">{institution.activeTasks} tugas aktif</p></div></CardContent></Card>)}</div></TabsContent>
        <TabsContent value="shelters"><div className="grid gap-3 md:grid-cols-2">{relatedShelters.map((shelter) => <Card key={shelter.id} className="py-0 shadow-none"><CardContent className="p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-medium">{shelter.name}</p><p className="mt-1 text-sm text-muted-foreground">{shelter.location}</p></div><StatusBadge status={shelter.status} /></div><div className="mt-4 flex items-center justify-between border-t pt-4 text-sm"><span>{shelter.population.total} pengungsi</span><span className="flex items-center gap-1 text-primary">Buka detail <ArrowUpRight className="size-4" /></span></div></CardContent></Card>)}</div></TabsContent>
      </Tabs>
    </div>
  );
}
