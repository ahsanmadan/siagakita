import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, MapPin, ShieldAlert, Users } from "lucide-react";
import { SitrepExportActions } from "@/components/sitrep-export-actions";
import type { SitrepMapPoint } from "@/components/sitrep-document";
import { CrisisMap, type MapPoint } from "@/components/crisis-map";
import { MapLegendDrawer } from "@/components/map-legend-drawer";
import { ConfirmMutationAction } from "@/components/confirm-mutation-action";
import { OperationalBrief } from "@/components/operational-brief";
import { CommandStrip, OperationalCard } from "@/components/operational-ui";
import { PageHeader } from "@/components/page-header";
import { RecommendationCard } from "@/components/recommendation-card";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { escalateEventAction } from "@/lib/actions/operations";
import { requireRole } from "@/lib/auth";
import { pickEventRecommendation } from "@/lib/recommendation-context";
import { getEventByCode } from "@/lib/repositories/operations";
import { buildSitrep } from "@/lib/sitrep";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(["admin", "bpbd_operator", "field_officer"], "/dashboard");
  const [data, requestHeaders] = await Promise.all([getEventByCode(id), headers()]);
  if (!data) notFound();

  const forwardedHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto") ?? (forwardedHost?.startsWith("localhost") ? "http" : "https");
  const appUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : "";

  const { event, institutions, recommendations, relatedShelters, relatedDistributions } = data;
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
  const publicPath = `/peta-publik?kejadian=${encodeURIComponent(event.id)}`;
  const sitrep = buildSitrep({
    event,
    shelters: relatedShelters,
    institutions,
    distributions: relatedDistributions,
    recommendation,
    publicLink: `${appUrl}${publicPath}`,
  });
  const sitrepMapPoints: SitrepMapPoint[] = [
    { id: event.id, label: event.name, latitude: event.coordinates.latitude, longitude: event.coordinates.longitude, kind: "event" },
    ...relatedShelters.map((shelter, index) => ({
      id: shelter.id,
      label: `${index + 1}. ${shelter.name}`,
      latitude: shelter.coordinates.latitude,
      longitude: shelter.coordinates.longitude,
      kind: "shelter" as const,
    })),
  ];
  const criticalShelters = relatedShelters.filter((shelter) => shelter.status === "critical").length;
  const activeInstitutions = institutions.filter((institution) => institution.contactStatus === "aktif").length;
  const operationalTimeline = [
    {
      time: "Laporan masuk",
      title: "Laporan lapangan diterima",
      detail: `Laporan awal dari area ${event.location} masuk sebagai dasar triase BPBD.`,
      status: "selesai" as const,
      nextAction: "Tidak ada tindak lanjut tertunda pada tahap penerimaan.",
    },
    {
      time: "Verifikasi",
      title: "BPBD memverifikasi dampak",
      detail: `${event.affectedPeople.toLocaleString("id-ID")} warga terdampak dan ${relatedShelters.length} posko menjadi konteks keputusan.`,
      status: "selesai" as const,
      nextAction: "Gunakan data terverifikasi sebagai dasar koordinasi dan distribusi.",
    },
    {
      time: "Ruang operasi",
      title: "Ruang operasi kejadian diaktifkan",
      detail: `Kejadian ${event.name} dibuka pada level eskalasi ${event.escalationLevel}.`,
      status: "berjalan" as const,
      nextAction: "Pantau kapasitas respons dan naikkan eskalasi jika dukungan tidak mencukupi.",
    },
    {
      time: "Kebutuhan",
      title: "Kebutuhan posko diprioritaskan",
      detail: criticalNeeds.length ? `${criticalNeeds[0].item} menjadi kebutuhan utama di ${criticalNeeds[0].shelterName}.` : "Kebutuhan posko dipantau dari pembaruan lapangan.",
      status: criticalNeeds.length ? "perlu-aksi" as const : "berjalan" as const,
      nextAction: criticalNeeds.length ? `${criticalNeeds.length} kebutuhan perlu ditindaklanjuti melalui pengelolaan posko.` : "Perbarui data kebutuhan saat kondisi posko berubah.",
    },
    {
      time: "Distribusi",
      title: "Distribusi bantuan dikoordinasikan",
      detail: relatedDistributions.length ? `${relatedDistributions.length} distribusi tercatat untuk kejadian ini.` : "Belum ada distribusi yang tercatat untuk kejadian ini.",
      status: relatedDistributions.length ? "berjalan" as const : "perlu-aksi" as const,
      nextAction: relatedDistributions.length ? "Pantau pengiriman hingga posko mengonfirmasi penerimaan." : "Tinjau kebutuhan kritis sebelum membuat alokasi bantuan.",
    },
    {
      time: "Audit",
      title: "Keputusan tercatat",
      detail: "Verifikasi, eskalasi, dan tindak lanjut penting masuk ke catatan audit untuk transparansi.",
      status: "selesai" as const,
      nextAction: "Catatan berikutnya dibuat otomatis ketika operator mengambil tindakan.",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Ruang Operasi Kejadian" description={`${event.name} · ${event.type} · ${event.location}, ${event.province} · diperbarui ${event.updatedAt}`} actions={<>{event.escalationLevel !== "Nasional" ? <ConfirmMutationAction action={escalateEventAction} label="Naikkan eskalasi" title="Naikkan level eskalasi?" description="Gunakan hanya jika kapasitas dukungan saat ini tidak cukup untuk kebutuhan lapangan." consequence="Level kejadian diperbarui, riwayat status bertambah, dan keputusan tercatat di catatan audit." fields={{ code: event.id, escalationLevel: event.escalationLevel === "Kabupaten" ? "Provinsi" : "Nasional", note: "Permintaan eskalasi diteruskan untuk persetujuan." }} icon={<ShieldAlert />} /> : null}<SitrepExportActions data={sitrep} mapPoints={sitrepMapPoints} publicPath={publicPath} secondary /></>} />

      <CommandStrip title={event.name} detail={`Level eskalasi ${event.escalationLevel}. Koordinasi lintas lembaga dan respons lapangan sedang berjalan.`} label="Respons aktif" meta={`${relatedShelters.length} posko terhubung`} action={<StatusBadge status={event.status} />} tone={event.status === "major" ? "warning" : event.status} />

      <OperationalBrief
        title="Ringkasan dampak dan kapasitas"
        items={[
          { label: "Warga terdampak", value: event.affectedPeople.toLocaleString("id-ID"), detail: "Jumlah warga terdampak yang telah tercatat.", tone: "neutral", icon: Users },
          { label: "Posko aktif", value: event.activeShelters.toLocaleString("id-ID"), detail: "Posko aktif dalam penanganan kejadian.", tone: "teal", icon: MapPin },
          { label: "Posko kritis", value: `${criticalShelters} dari ${relatedShelters.length} posko`, detail: "Perlu diprioritaskan dalam pemeriksaan kebutuhan.", tone: criticalShelters ? "critical" : "teal", icon: Users },
          { label: "Lembaga aktif", value: activeInstitutions.toLocaleString("id-ID"), detail: "Lembaga dengan kontak aktif untuk pembagian tugas.", tone: activeInstitutions ? "teal" : "warning", icon: Building2 },
        ]}
      />

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(21rem,0.75fr)]">
        <OperationalCard emphasis="map" className="flex flex-col h-full overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-4 border-b py-4 shrink-0">
            <div>
              <CardTitle className="font-display text-base">Peta Situasi Kejadian</CardTitle>
              <CardDescription>Tampilan operasional lokasi kejadian, posko, kebutuhan, dan akses bantuan.</CardDescription>
            </div>
            <MapLegendDrawer />
          </CardHeader>
          <CardContent className="relative p-0 flex-1 flex flex-col min-h-0">
            <CrisisMap
              points={points}
              center={[event.coordinates.longitude, event.coordinates.latitude]}
              zoom={10.2}
              className="flex-1 w-full h-full min-h-[34rem] rounded-none border-0"
            />
          </CardContent>
        </OperationalCard>
        <div className="space-y-4 flex flex-col">
          {recommendation ? <RecommendationCard recommendation={recommendation} title="Rekomendasi Operasional" /> : <OperationalCard className="border-dashed"><CardHeader className="pb-3 pt-5"><div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"><ShieldAlert className="size-5" /></div><CardTitle className="font-display text-base">Rekomendasi operasional belum tersedia</CardTitle><CardDescription className="leading-6">Sistem belum menemukan rekomendasi yang terhubung dengan kejadian ini. Periksa kelengkapan data posko dan kebutuhan agar analisis dapat dibuat.</CardDescription></CardHeader><CardContent className="grid gap-2 pb-5 sm:grid-cols-2 xl:grid-cols-1"><Button className="min-h-11" asChild><Link href="/posko">Lengkapi data posko</Link></Button><Button variant="outline" className="min-h-11" asChild><Link href="/posko">Input kebutuhan</Link></Button><p className="text-xs leading-5 text-muted-foreground sm:col-span-2 xl:col-span-1">Keputusan penanganan tetap berada pada operator BPBD.</p></CardContent></OperationalCard>}
          <OperationalCard className="flex-1">
            <CardHeader className="pb-2 pt-5">
              <CardTitle className="font-display text-base">Ringkasan kondisi</CardTitle>
            </CardHeader>
            <CardContent className="pb-5 text-sm leading-6 text-muted-foreground">
              {event.summary}
            </CardContent>
          </OperationalCard>
        </div>
      </section>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="h-auto min-h-11 w-full justify-start overflow-x-auto overflow-y-hidden p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><TabsTrigger value="timeline" className="min-h-11 shrink-0 border border-transparent px-4 data-[state=active]:font-semibold">Linimasa Operasional</TabsTrigger><TabsTrigger value="institutions" className="min-h-11 shrink-0 border border-transparent px-4 data-[state=active]:font-semibold">Koordinasi Lembaga</TabsTrigger><TabsTrigger value="shelters" className="min-h-11 shrink-0 border border-transparent px-4 data-[state=active]:font-semibold">Posko Terdampak</TabsTrigger></TabsList>
        <TabsContent value="timeline"><Card className="py-0 shadow-none"><CardContent className="p-0"><Timeline items={operationalTimeline} /></CardContent></Card></TabsContent>
        <TabsContent value="institutions"><div className="grid gap-3 md:grid-cols-2">{institutions.map((institution) => <Card key={institution.id} className="py-0 shadow-none"><CardContent className="flex items-start gap-4 p-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary"><Building2 className="size-5 text-[var(--color-teal)]" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="font-medium">{institution.name}</p><Badge variant={institution.contactStatus === "aktif" ? "secondary" : "outline"}>{institution.contactStatus}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{institution.role}</p><p className="mt-3 text-xs font-medium">{institution.activeTasks} tugas aktif</p></div></CardContent></Card>)}</div></TabsContent>
        <TabsContent value="shelters"><div className="grid gap-3 md:grid-cols-2">{relatedShelters.map((shelter) => <Card key={shelter.id} className="py-0 shadow-none"><CardContent className="p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-medium">{shelter.name}</p><p className="mt-1 text-sm text-muted-foreground">{shelter.location}</p></div><StatusBadge status={shelter.status} /></div><div className="mt-4 flex items-center justify-between gap-3 border-t pt-4 text-sm"><span>{shelter.population.total} pengungsi</span><Button variant="ghost" size="sm" className="min-h-11" asChild><Link href="/posko">Kelola posko</Link></Button></div></CardContent></Card>)}</div></TabsContent>
      </Tabs>
    </div>
  );
}
