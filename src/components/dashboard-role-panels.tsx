import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Boxes,
  ClipboardList,
  Database,
  FileClock,
  MapPinned,
  PackageCheck,
  RadioTower,
  ShieldCheck,
  Sparkles,
  TentTree,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { CrisisMap, type MapPoint } from "@/components/crisis-map";
import { MapLegendDrawer } from "@/components/map-legend-drawer";
import { MetricCard } from "@/components/metric-card";
import { MutationAction } from "@/components/mutation-action";
import { CommandStrip, MapOverlay, MetricStrip, OperationalCard } from "@/components/operational-ui";
import { OperationalBrief, type OperationalBriefItem } from "@/components/operational-brief";
import { RecommendationCard } from "@/components/recommendation-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createFieldReport } from "@/lib/actions/operations";
import { roleLabel, type AppRole, type CurrentProfile } from "@/lib/auth";
import { pickLogisticsRecommendation, pickShelterRecommendation, pickSystemRecommendation } from "@/lib/recommendation-context";
import { roleMission } from "@/lib/role-ui";
import type { AuditLogItem } from "@/lib/repositories/audit";
import type { AIRecommendation, CrisisStatus, DisasterEvent, Distribution, FieldReport, Inventory, Shelter } from "@/lib/types";

type DashboardMetrics = {
  activeEvents: number;
  affectedPeople: number;
  activeShelters: number;
  criticalNeeds: number;
};

type UserSummary = {
  total: number;
  roles: { role: AppRole; count: number }[];
};

export type RoleDashboardData = {
  disasterEvents: DisasterEvent[];
  shelters: Shelter[];
  inventory: Inventory[];
  distributions: Distribution[];
  fieldReports: FieldReport[];
  recommendations: AIRecommendation[];
  metrics: DashboardMetrics;
};

function offsetCoordinates(latitude: number, longitude: number, index: number) {
  const offsets = [
    [0.018, 0.016],
    [-0.016, 0.018],
    [0.015, -0.015],
    [-0.014, -0.017],
  ];
  const [latOffset, lngOffset] = offsets[index % offsets.length];
  return { latitude: latitude + latOffset, longitude: longitude + lngOffset };
}

function distributionTone(status: Distribution["status"]): CrisisStatus {
  if (status === "diterima") return "safe";
  if (status === "dalam-perjalanan") return "warning";
  return "major";
}

function destinationShelter(distribution: Distribution, shelters: Shelter[]) {
  const destination = distribution.destination.toLowerCase();
  return shelters.find((shelter) =>
    destination.includes(shelter.name.toLowerCase()) ||
    destination.includes(shelter.location.toLowerCase()) ||
    shelter.name.toLowerCase().includes(destination),
  );
}

function mapPointsFor(events: DisasterEvent[], shelters: Shelter[], distributions: Distribution[]) {
  const needPoints = shelters.flatMap((shelter, shelterIndex) =>
    shelter.needs
      .filter((need) => need.urgency === "critical" || need.requested > need.available)
      .slice(0, 2)
      .map((need, needIndex) => {
        const coordinates = offsetCoordinates(shelter.coordinates.latitude, shelter.coordinates.longitude, shelterIndex + needIndex);
        return {
          id: `${shelter.id}-${need.id}-need`,
          name: need.item,
          location: shelter.name,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          status: need.urgency,
          kind: "Critical Need" as const,
          detail: `Kekurangan ${(need.requested - need.available).toLocaleString("id-ID")} ${need.unit} untuk posko.`,
        };
      }),
  );
  const distributionPoints: MapPoint[] = distributions
    .filter((distribution) => distribution.status !== "diterima")
    .flatMap((distribution, index) => {
      const shelter = destinationShelter(distribution, shelters) ?? shelters[index % Math.max(shelters.length, 1)];
      if (!shelter) return [];
      const coordinates = offsetCoordinates(shelter.coordinates.latitude, shelter.coordinates.longitude, index + 2);
      return [{
        id: `${distribution.id}-distribution`,
        name: distribution.cargo,
        location: distribution.destination,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        status: distributionTone(distribution.status),
        kind: "Distribution" as const,
        detail: `${distribution.origin} ke ${distribution.destination} · ETA ${distribution.eta}`,
      }];
    });

  return [
    ...events.map((event) => ({
      id: event.id,
      name: event.name,
      location: event.location,
      latitude: event.coordinates.latitude,
      longitude: event.coordinates.longitude,
      status: event.status,
      kind: "Kejadian" as const,
      detail: event.summary,
    })),
    ...shelters.map((shelter) => ({
      id: shelter.id,
      name: shelter.name,
      location: shelter.location,
      latitude: shelter.coordinates.latitude,
      longitude: shelter.coordinates.longitude,
      status: shelter.status,
      kind: "Posko" as const,
      detail: `${shelter.population.total} pengungsi · pembaruan ${shelter.lastUpdate}`,
    })),
    ...needPoints,
    ...distributionPoints,
  ];
}

function activeDistributions(distributions: Distribution[]) {
  return distributions.filter((distribution) => distribution.status !== "diterima");
}

function criticalNeeds(shelters: Shelter[]) {
  return shelters.flatMap((shelter) => shelter.needs.map((need) => ({ ...need, shelterName: shelter.name }))).filter((need) => need.urgency === "critical" || need.requested > need.available);
}

function latestReportsFor(profile: CurrentProfile, fieldReports: FieldReport[]) {
  if (profile.role === "field_officer") {
    const ownLabel = profile.fullName.toLowerCase();
    const owned = fieldReports.filter((report) => report.reporter.toLowerCase().includes(ownLabel) || report.channel === "Petugas");
    return owned.length ? owned : fieldReports.slice(0, 4);
  }
  return fieldReports;
}

function roleKpis(profile: CurrentProfile, data: RoleDashboardData, userSummary?: UserSummary | null) {
  const needs = criticalNeeds(data.shelters);
  const distributions = activeDistributions(data.distributions);
  const pendingReports = data.fieldReports.filter((report) => report.status === "baru");
  const lowStock = data.inventory.filter((item) => item.status === "critical" || item.status === "warning");
  const vulnerablePeople = data.shelters.reduce((total, shelter) => total + shelter.population.children + shelter.population.elderly + shelter.population.pregnant + shelter.population.disability, 0);

  if (profile.role === "field_officer") {
    const reports = latestReportsFor(profile, data.fieldReports);
    return [
      <MetricCard key="reports" label="Laporan saya" value={String(reports.length)} note="Laporan lapangan dan status tindak lanjut" icon={ClipboardList} tone="brand" />,
      <MetricCard key="new" label="Baru" value={String(reports.filter((report) => report.status === "baru").length)} note="Menunggu petugas BPBD" icon={RadioTower} tone="warning" />,
      <MetricCard key="verified" label="Diverifikasi" value={String(reports.filter((report) => report.status !== "baru").length)} note="Sudah masuk alur operasi" icon={ShieldCheck} tone="teal" />,
      <MetricCard key="events" label="Kejadian aktif" value={String(data.metrics.activeEvents)} note="Konteks area operasi" icon={MapPinned} tone="critical" />,
    ];
  }

  if (profile.role === "shelter_manager") {
    return [
      <MetricCard key="population" label="Pengungsi" value={data.shelters.reduce((total, shelter) => total + shelter.population.total, 0).toLocaleString("id-ID")} note="Total pada posko tercatat" icon={Users} tone="brand" />,
      <MetricCard key="vulnerable" label="Kelompok rentan" value={vulnerablePeople.toLocaleString("id-ID")} note="Anak, lansia, ibu hamil, disabilitas" icon={ShieldCheck} tone="warning" />,
      <MetricCard key="needs" label="Kebutuhan aktif" value={String(needs.length)} note="Belum terpenuhi penuh" icon={Boxes} tone="critical" />,
      <MetricCard key="shelters" label="Posko aktif" value={String(data.shelters.length)} note="Perlu update berkala" icon={TentTree} tone="teal" />,
    ];
  }

  if (profile.role === "warehouse_manager") {
    return [
      <MetricCard key="stock" label="Jenis stok" value={`${data.inventory.filter((item) => item.stock - item.reserved > 0).length}/${data.inventory.length}`} note="Saldo siap alokasi" icon={Warehouse} tone="brand" />,
      <MetricCard key="low" label="Stok perhatian" value={String(lowStock.length)} note="Status warning/kritis" icon={Boxes} tone="warning" />,
      <MetricCard key="requests" label="Permintaan bantuan" value={String(needs.length)} note="Dari kebutuhan posko" icon={ClipboardList} tone="critical" />,
      <MetricCard key="delivery" label="Distribusi aktif" value={String(distributions.length)} note="Perlu update perjalanan" icon={Truck} tone="teal" />,
    ];
  }

  if (profile.role === "admin") {
    return [
      <MetricCard key="events" label="Kejadian aktif" value={String(data.metrics.activeEvents)} note="Status sistem operasional" icon={RadioTower} tone="critical" />,
      <MetricCard key="users" label="Akun terdata" value={userSummary ? String(userSummary.total) : "-"} note="Ringkasan profil bila tersedia" icon={Users} tone="brand" />,
      <MetricCard key="audit" label="Audit terbaru" value="80" note="Maksimum riwayat yang ditampilkan" icon={FileClock} tone="warning" />,
      <MetricCard key="data" label="Domain aktif" value="7" note="Laporan, kejadian, posko, stok, distribusi, audit" icon={Database} tone="teal" />,
    ];
  }

  return [
    <MetricCard key="events" label="Kejadian aktif" value={String(data.metrics.activeEvents)} note={`${data.disasterEvents.filter((event) => event.status === "critical").length} berstatus kritis`} icon={RadioTower} tone="critical" />,
    <MetricCard key="reports" label="Perlu verifikasi" value={String(pendingReports.length)} note="Laporan menunggu keputusan BPBD" icon={ClipboardList} tone="warning" />,
    <MetricCard key="needs" label="Kebutuhan kritis" value={String(data.metrics.criticalNeeds || needs.length)} note="Memerlukan alokasi segera" icon={Boxes} tone="critical" />,
    <MetricCard key="delivery" label="Distribusi aktif" value={String(distributions.length)} note="Pantau ETA dan penerimaan posko" icon={Truck} tone="teal" />,
  ];
}

function roleBrief(profile: CurrentProfile, data: RoleDashboardData, recommendation: AIRecommendation | null): OperationalBriefItem[] {
  const pendingReports = data.fieldReports.filter((report) => report.status === "baru").length;
  const needs = criticalNeeds(data.shelters);
  const distributions = activeDistributions(data.distributions);
  const lowStock = data.inventory.filter((item) => item.status === "critical" || item.status === "warning").length;

  if (profile.role === "field_officer") {
    const reports = latestReportsFor(profile, data.fieldReports);
    return [
      { label: "Tugas utama", value: "CREATE REPORT", detail: "Catat kondisi lapangan agar masuk antrean BPBD.", tone: "teal", icon: ClipboardList },
      { label: "Status laporan", value: `${reports.filter((report) => report.status !== "baru").length} sudah diproses`, detail: "Pantau apakah laporan sudah diverifikasi atau ditindaklanjuti.", tone: "warning", icon: ShieldCheck },
      { label: "Konteks lokasi", value: `${data.metrics.activeEvents} kejadian aktif`, detail: "Gunakan peta publik untuk orientasi area.", tone: "neutral", icon: MapPinned },
      { label: "Batas akses", value: "Tidak verifikasi", detail: "Verifikasi dan buka kejadian tetap wewenang BPBD.", tone: "neutral", icon: RadioTower },
    ];
  }

  if (profile.role === "shelter_manager") {
    return [
      { label: "Tugas utama", value: "UPDATE CONDITION", detail: "Perbarui populasi, kelompok rentan, dan kebutuhan posko.", tone: "teal", icon: TentTree },
      { label: "Kebutuhan belum penuh", value: `${needs.length} item`, detail: "Masuk antrean alokasi bantuan.", tone: needs.length ? "critical" : "teal", icon: Boxes },
      { label: "Update populasi", value: `${data.shelters.length} posko`, detail: "Data pengungsi menjadi dasar prioritas.", tone: "warning", icon: Users },
      { label: "Konteks lokasi", value: `${data.metrics.activeEvents} kejadian aktif`, detail: "Pantau posko yang terhubung ke kejadian.", tone: "neutral", icon: MapPinned },
    ];
  }

  if (profile.role === "warehouse_manager") {
    return [
      { label: "Tugas utama", value: "MANAGE DISTRIBUTION", detail: "Alokasi, update pengiriman, dan konfirmasi status bantuan.", tone: "teal", icon: Truck },
      { label: "Permintaan bantuan", value: `${needs.length} kebutuhan`, detail: "Dari posko yang membutuhkan alokasi.", tone: needs.length ? "critical" : "neutral", icon: ClipboardList },
      { label: "Stok perhatian", value: `${lowStock} item`, detail: "Perlu dicek sebelum distribusi berikutnya.", tone: lowStock ? "warning" : "teal", icon: Warehouse },
      { label: "Distribusi pending", value: `${distributions.length} aktif`, detail: "Pantau ETA dan status diterima.", tone: distributions.length ? "warning" : "neutral", icon: PackageCheck },
    ];
  }

  if (profile.role === "admin") {
    return [
      { label: "Tugas utama", value: "SYSTEM OVERVIEW", detail: "Pantau aktivitas sistem dan audit keputusan.", tone: "teal", icon: Database },
      { label: "Kejadian aktif", value: `${data.metrics.activeEvents} kejadian`, detail: "Ringkasan operasional sistem.", tone: data.metrics.activeEvents ? "critical" : "neutral", icon: RadioTower },
      { label: "Audit", value: "Recent activity", detail: "Perubahan penting dicatat untuk akuntabilitas.", tone: "warning", icon: FileClock },
      { label: "Data publik", value: "Aman dibagikan", detail: "Peta publik memakai view terbatas.", tone: "neutral", icon: MapPinned },
    ];
  }

  return [
    { label: "VERIFY REPORT", value: `${pendingReports} laporan`, detail: "Laporan baru perlu triase BPBD sebelum menjadi kejadian.", tone: pendingReports ? "critical" : "teal", icon: ClipboardList },
    { label: "Kebutuhan kritis", value: `${needs.length} item`, detail: "Prioritas alokasi dari posko terdampak.", tone: needs.length ? "critical" : "neutral", icon: Boxes },
    { label: "Distribusi tertunda", value: `${distributions.length} aktif`, detail: "Pantau ETA dan konfirmasi penerimaan.", tone: distributions.length ? "warning" : "neutral", icon: Truck },
    { label: "Decision support", value: recommendation ? "Perlu tinjauan" : "Belum ada", detail: "Rule-based dari data posko, stok, dan kebutuhan.", tone: recommendation ? "critical" : "neutral", icon: Sparkles },
  ];
}

function RoleActionQueue({ profile, data, recommendation, auditLogs }: { profile: CurrentProfile; data: RoleDashboardData; recommendation: AIRecommendation | null; auditLogs: AuditLogItem[] }) {
  const needs = criticalNeeds(data.shelters);
  const distributions = activeDistributions(data.distributions);
  const pendingReports = data.fieldReports.filter((report) => report.status === "baru");
  const fieldReports = latestReportsFor(profile, data.fieldReports);

  if (profile.role === "field_officer") {
    return (
      <OperationalCard emphasis="critical">
        <CardHeader className="py-5">
          <CardTitle className="text-base">Action Required / Laporan Terakhir Saya</CardTitle>
          <CardDescription>Submit Field Report dan pantau status tindak lanjut BPBD.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-5">
          <MutationAction action={createFieldReport} label="Submit Field Report" fields={{ location: "Laporan lapangan baru", reporter: profile.fullName, summary: "Laporan lapangan baru membutuhkan verifikasi BPBD.", channel: "Petugas", severity: "warning" }} />
          {fieldReports.length ? fieldReports.slice(0, 4).map((report) => (
            <div key={report.id} className="rounded-xl border bg-background/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm font-medium">{report.id} · {report.location}</p><p className="mt-1 text-xs text-muted-foreground">{report.summary}</p><p className="mt-2 text-[11px] text-muted-foreground">Waktu laporan: {report.receivedAt}</p></div>
                <Badge variant="outline">{report.status}</Badge>
              </div>
            </div>
          )) : (
            <div className="rounded-xl border border-dashed bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
              Belum ada laporan lapangan. Buat laporan pertama untuk membantu BPBD memahami kondisi lokasi.
            </div>
          )}
        </CardContent>
      </OperationalCard>
    );
  }

  if (profile.role === "shelter_manager") {
    return (
      <OperationalCard emphasis="critical">
        <CardHeader className="py-5">
          <CardTitle className="text-base">Action Required / Kondisi Posko</CardTitle>
          <CardDescription>Perbarui kondisi posko agar BPBD dan gudang memakai data terbaru.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-5">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild className="w-full"><Link href="/posko">Update Shelter Condition <ArrowRight /></Link></Button>
            <Button asChild variant="outline" className="w-full"><Link href="/posko">Request Relief Support <ArrowRight /></Link></Button>
          </div>
          {needs.slice(0, 4).map((need) => (
            <div key={need.id} className="rounded-xl border bg-background/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm font-medium">{need.item}</p><p className="mt-1 text-xs text-muted-foreground">{need.shelterName} · kurang {(need.requested - need.available).toLocaleString("id-ID")} {need.unit}</p></div>
                <StatusBadge status={need.urgency} />
              </div>
            </div>
          ))}
        </CardContent>
      </OperationalCard>
    );
  }

  if (profile.role === "warehouse_manager") {
    return (
      <OperationalCard emphasis="critical">
        <CardHeader className="py-5">
          <CardTitle className="text-base">Action Required / Distribusi Bantuan</CardTitle>
          <CardDescription>Kelola stok dan pengiriman yang belum diterima posko.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-5">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild className="w-full"><Link href="/logistik">Allocate Supplies <ArrowRight /></Link></Button>
            <Button asChild variant="outline" className="w-full"><Link href="/logistik">Confirm Delivery <ArrowRight /></Link></Button>
          </div>
          {distributions.slice(0, 4).map((distribution) => (
            <div key={distribution.id} className="rounded-xl border bg-background/70 p-3">
              <div className="mb-2 flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{distribution.destination}</p><p className="mt-1 text-xs text-muted-foreground">{distribution.cargo}</p></div><Badge variant="outline">{distribution.status}</Badge></div>
              <Progress value={distribution.progress} />
            </div>
          ))}
        </CardContent>
      </OperationalCard>
    );
  }

  if (profile.role === "admin") {
    return (
      <OperationalCard emphasis="critical">
        <CardHeader className="py-5">
          <CardTitle className="text-base">Action Required / Recent Audit Activity</CardTitle>
          <CardDescription>Admin memantau jejak keputusan dan aktivitas sistem terbaru.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pb-5">
          {auditLogs.slice(0, 5).map((log) => (
            <div key={log.id} className="rounded-xl border bg-background/70 p-3">
              <p className="text-sm font-medium">{log.action}</p>
              <p className="mt-1 text-xs text-muted-foreground">{log.actorName} · {log.targetTable} · {log.createdAt}</p>
            </div>
          ))}
          {!auditLogs.length ? <p className="text-sm text-muted-foreground">Audit terbaru belum tersedia untuk akun ini.</p> : null}
        </CardContent>
      </OperationalCard>
    );
  }

  return (
    <OperationalCard emphasis="critical">
      <CardHeader className="py-5">
        <CardTitle className="text-base">Action Required / Decision Queue</CardTitle>
        <CardDescription>Prioritas keputusan BPBD berdasarkan laporan, kebutuhan, distribusi, dan decision support.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild className="w-full"><Link href="/laporan">Verify Field Report <ArrowRight /></Link></Button>
          <Button asChild variant="outline" className="w-full"><Link href="/kejadian">Open Incident <ArrowRight /></Link></Button>
          <Button asChild variant="outline" className="w-full"><Link href="/posko">Prioritize Needs <ArrowRight /></Link></Button>
          <Button asChild variant="outline" className="w-full"><Link href="/logistik">Coordinate Distribution <ArrowRight /></Link></Button>
        </div>
        {pendingReports.slice(0, 3).map((report) => (
          <div key={report.id} className="rounded-xl border bg-background/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-sm font-medium">Verify Field Report: {report.id}</p><p className="mt-1 text-xs text-muted-foreground">{report.location} · {report.summary}</p></div>
              <Button asChild variant="outline" size="sm"><Link href="/laporan">Review</Link></Button>
            </div>
          </div>
        ))}
        {needs.slice(0, 2).map((need) => (
          <div key={need.id} className="rounded-xl border bg-background/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-sm font-medium">Kebutuhan kritis: {need.item}</p><p className="mt-1 text-xs text-muted-foreground">{need.shelterName} · kurang {(need.requested - need.available).toLocaleString("id-ID")} {need.unit}</p></div>
              <Button asChild variant="outline" size="sm"><Link href="/logistik">Allocate</Link></Button>
            </div>
          </div>
        ))}
        {recommendation ? <RecommendationCard recommendation={recommendation} /> : null}
      </CardContent>
    </OperationalCard>
  );
}

function OperationalSummary({ profile, data, userSummary }: { profile: CurrentProfile; data: RoleDashboardData; userSummary?: UserSummary | null }) {
  const priorityEvent = data.disasterEvents[0];
  const needs = criticalNeeds(data.shelters);
  const distributions = activeDistributions(data.distributions);
  const lowStock = data.inventory.filter((item) => item.status === "critical" || item.status === "warning");

  return (
    <OperationalCard>
      <CardHeader className="py-5">
        <CardTitle className="text-base">Operational Summary</CardTitle>
        <CardDescription>{roleMission(profile.role)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        {priorityEvent ? (
          <CommandStrip
            title={priorityEvent.name}
            detail={`${priorityEvent.location}, ${priorityEvent.province} · ${priorityEvent.summary}`}
            meta={`Update ${priorityEvent.updatedAt}`}
            action={profile.role === "bpbd_operator" ? <Button asChild size="sm"><Link href={`/kejadian/${priorityEvent.id}`}>Open Incident Room</Link></Button> : undefined}
          />
        ) : null}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Kebutuhan belum penuh</p><p className="data-number mt-1 text-xl font-semibold">{needs.length}</p></div>
          <div className="rounded-xl border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Distribusi aktif</p><p className="data-number mt-1 text-xl font-semibold">{distributions.length}</p></div>
          <div className="rounded-xl border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Stok perhatian</p><p className="data-number mt-1 text-xl font-semibold">{lowStock.length}</p></div>
        </div>
        {profile.role === "admin" && userSummary ? (
          <div className="rounded-xl border bg-background/70 p-3">
            <p className="text-sm font-medium">User summary</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {userSummary.roles.map((item) => <Badge key={item.role} variant="outline">{roleLabel(item.role)}: {item.count}</Badge>)}
            </div>
          </div>
        ) : null}
      </CardContent>
    </OperationalCard>
  );
}

function MapContext({ profile, points, data }: { profile: CurrentProfile; points: MapPoint[]; data: RoleDashboardData }) {
  const isBpbd = profile.role === "bpbd_operator";
  const firstPoint = points[0];

  return (
    <OperationalCard emphasis="map" className="map-workspace min-w-0 self-start">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b bg-card/88 py-4">
        <div>
          <CardTitle className="text-base">Crisis Situation Map</CardTitle>
          <CardDescription>{isBpbd ? "Operational Map View untuk prioritas Sungai Pua, posko, kebutuhan kritis, dan distribusi aktif" : "Operational Map View untuk konteks tugas role saat ini"}</CardDescription>
        </div>
        <div className="flex items-center gap-2"><MapLegendDrawer /><Badge variant="outline" className="hidden rounded-full sm:flex"><Activity /> Data aktif</Badge></div>
      </CardHeader>
      <CardContent className="relative p-0">
        <CrisisMap points={points} center={firstPoint ? [firstPoint.longitude, firstPoint.latitude] : undefined} className={`${isBpbd ? "h-[34rem]" : "h-[21rem]"} rounded-none border-0`} />
        <MapOverlay icon={MapPinned} eyebrow={isBpbd ? "Command center" : "Operational context"} title={isBpbd ? "Fokus operasi Sungai Pua" : `${data.metrics.activeEvents} kejadian aktif`}>
          {isBpbd ? "Marker insiden, posko, kebutuhan kritis, dan distribusi aktif menjadi pusat orientasi keputusan BPBD." : "Crisis Situation Map membantu membaca lokasi kejadian dan posko tanpa membuka modul lain."}
        </MapOverlay>
      </CardContent>
    </OperationalCard>
  );
}

export function DashboardRolePanels({
  profile,
  data,
  auditLogs = [],
  userSummary = null,
}: {
  profile: CurrentProfile;
  data: RoleDashboardData;
  auditLogs?: AuditLogItem[];
  userSummary?: UserSummary | null;
}) {
  const points = mapPointsFor(data.disasterEvents, data.shelters, data.distributions);
  const recommendation = profile.role === "shelter_manager"
    ? pickShelterRecommendation(data.recommendations, data.shelters)
    : profile.role === "warehouse_manager"
      ? pickLogisticsRecommendation(data.recommendations)
      : pickSystemRecommendation(data.recommendations);

  return (
    <div className="space-y-6">
      <MetricStrip>{roleKpis(profile, data, userSummary)}</MetricStrip>
      <OperationalBrief title={`EOC status · ${roleLabel(profile.role)}`} items={roleBrief(profile, data, recommendation)} />
      <section className={`grid min-w-0 gap-4 ${profile.role === "bpbd_operator" ? "xl:grid-cols-[minmax(0,1.8fr)_minmax(22rem,0.78fr)]" : "xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"}`}>
        <MapContext profile={profile} points={points} data={data} />
        <RoleActionQueue profile={profile} data={data} recommendation={recommendation} auditLogs={auditLogs} />
      </section>
      <OperationalSummary profile={profile} data={data} userSummary={userSummary} />
    </div>
  );
}
