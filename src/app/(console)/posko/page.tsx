import {
  AlertTriangle,
  Baby,
  HeartPulse,
  Home,
  PersonStanding,
  Plus,
  Users,
} from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { RecommendationCard } from "@/components/recommendation-card";
import { ShelterQuickForms } from "@/components/shelter-quick-forms";
import { SubmitButton } from "@/components/submit-button";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createNeedRequest,
  createShelterAction,
  updateShelterPopulation,
} from "@/lib/actions/operations";
import { requireRole } from "@/lib/auth";
import { pickShelterRecommendation } from "@/lib/recommendation-context";
import { roleCapabilities } from "@/lib/role-ui";
import { getOperationsData } from "@/lib/repositories/operations";
import { cn } from "@/lib/utils";

type OccupancyTone = {
  text: string;
  track: string;
  indicator: string;
  critical: boolean;
};

function occupancyTone(ratio: number): OccupancyTone {
  if (ratio >= 90) {
    return {
      text: "text-red-600 dark:text-red-400",
      track: "bg-red-500/15",
      indicator: "[&_[data-slot=progress-indicator]]:bg-red-600 dark:[&_[data-slot=progress-indicator]]:bg-red-500",
      critical: true,
    };
  }

  if (ratio >= 70) {
    return {
      text: "text-amber-600 dark:text-amber-400",
      track: "bg-amber-500/15",
      indicator: "[&_[data-slot=progress-indicator]]:bg-amber-500 dark:[&_[data-slot=progress-indicator]]:bg-amber-400",
      critical: false,
    };
  }

  return {
    text: "text-emerald-600 dark:text-emerald-400",
    track: "bg-emerald-500/15",
    indicator: "[&_[data-slot=progress-indicator]]:bg-emerald-600 dark:[&_[data-slot=progress-indicator]]:bg-emerald-500",
    critical: false,
  };
}

export default async function ShelterPage() {
  const profile = await requireRole(["admin", "bpbd_operator", "shelter_manager", "warehouse_manager"], "/dashboard");
  const capabilities = roleCapabilities(profile.role);
  const { recommendations, shelters } = await getOperationsData();

  const totals = shelters.reduce(
    (result, shelter) => ({
      total: result.total + shelter.population.total,
      children: result.children + shelter.population.children,
      elderly: result.elderly + shelter.population.elderly,
      vulnerable:
        result.vulnerable +
        shelter.population.pregnant +
        shelter.population.disability,
    }),
    { total: 0, children: 0, elderly: 0, vulnerable: 0 },
  );

  const needs = shelters.flatMap((shelter) =>
    shelter.needs.map((need) => ({ ...need, shelter: shelter.name })),
  );
  const criticalShelters = shelters.filter((shelter) => shelter.status === "critical").length;
  const criticalNeeds = needs.filter((need) => need.urgency === "critical").length;
  const overCapacityShelters = shelters.filter(
    (shelter) => shelter.population.total > shelter.capacity,
  ).length;
  const shelterRecommendation = pickShelterRecommendation(recommendations, shelters);

  return (
    <div className="@container/main flex flex-col gap-6">
      {/* Top Header Strip */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Posko Pengungsian & Kelompok Rentan
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoring kapasitas posko, perlindungan kelompok rentan, dan kebutuhan logistik darurat.
          </p>
        </div>
        {capabilities.canRegisterShelter && (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 self-start sm:self-auto">
                <Plus className="size-4" /> Daftarkan Posko
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrasi Posko Pengungsian Baru</DialogTitle>
                <DialogDescription>
                  Masukkan identitas lokasi dan kapasitas maksimal posko.
                </DialogDescription>
              </DialogHeader>
              <ActionForm action={createShelterAction} className="py-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="shelter-name" className="text-xs">
                    Nama Posko
                  </Label>
                  <Input
                    id="shelter-name"
                    name="name"
                    placeholder="Contoh: Posko Balai Desa Sumberwuluh"
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="shelter-capacity" className="text-xs">
                    Kapasitas Maksimal (Jiwa)
                  </Label>
                  <Input
                    id="shelter-capacity"
                    name="capacity"
                    type="number"
                    placeholder="500"
                    min={1}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <SubmitButton>Daftarkan Posko</SubmitButton>
              </ActionForm>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/50">
                <Users className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Total Jiwa di Pengungsian</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {totals.total.toLocaleString("id-ID")} Jiwa
            </div>
            <p className="text-muted-foreground text-sm">Tersebar di {shelters.length} posko aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/50">
                <Baby className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Balita & Anak-anak</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {totals.children.toLocaleString("id-ID")} Anak
            </div>
            <p className="text-muted-foreground text-sm">Prioritas MPASI, susu & selimut</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900/50">
                <PersonStanding className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Lansia & Ibu Hamil</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {(totals.elderly + totals.vulnerable).toLocaleString("id-ID")} Jiwa
            </div>
            <p className="text-muted-foreground text-sm">Butuh layanan medis & tenda khusus</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/50">
                <AlertTriangle className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Posko Melebihi Kapasitas</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
                {overCapacityShelters} Posko
              </div>
              {overCapacityShelters > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  Kritis
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">Perlu pembukaan posko satelit</p>
          </CardContent>
        </Card>
      </div>

      {capabilities.canUpdateShelter && shelters[0] && (
        <ShelterQuickForms
          shelters={shelters}
          updateShelterPopulation={updateShelterPopulation}
          createNeedRequest={createNeedRequest}
        />
      )}

      {/* Main Grid: Posko List & Recommendation */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,0.6fr)]">
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="py-4">
            <CardTitle className="text-base">Daftar Posko Pengungsian Aktif</CardTitle>
            <CardDescription>
              Status keterisian tempat tidur, lokasi, dan kondisi fasilitas darurat.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-xs">Nama Posko & Lokasi</TableHead>
                  <TableHead className="text-xs">Jumlah Pengungsi</TableHead>
                  <TableHead className="text-xs">Keterisian Kapasitas</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shelters.map((shelter) => {
                  const occupancyRatio = Math.round(
                    (shelter.population.total / (shelter.capacity || 1)) * 100,
                  );
                  const tone = occupancyTone(occupancyRatio);
                  return (
                    <TableRow key={shelter.id} className="text-xs duration-200 ease-out hover:bg-muted/40">
                      <TableCell className="font-medium">
                        <div className="font-semibold text-foreground">{shelter.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {shelter.location} · {shelter.lastUpdate}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums font-semibold">
                        {shelter.population.total.toLocaleString("id-ID")} Jiwa
                      </TableCell>
                      <TableCell>
                        <div className="w-40 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className={cn("font-semibold tabular-nums", tone.text)}>
                              {occupancyRatio}%
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                              Maks {shelter.capacity.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <Progress
                            value={Math.min(100, occupancyRatio)}
                            className={cn("h-1.5", tone.track, tone.indicator)}
                          />
                          {tone.critical && (
                            <Badge
                              variant="destructive"
                              className="h-5 rounded-full px-2 text-[10px] font-semibold"
                            >
                              {occupancyRatio > 100 ? "Kritis · Melebihi Kapasitas" : "Kritis"}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={shelter.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {shelterRecommendation && (
          <RecommendationCard recommendation={shelterRecommendation} />
        )}
      </div>

      {/* Critical Needs Gap Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="py-4">
          <CardTitle className="text-base">Kesenjangan Kebutuhan Logistik Lintas Posko</CardTitle>
          <CardDescription>
            Defisit pasokan yang diminta posko dibanding ketersediaan aktual di lapangan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-xs">Komoditas</TableHead>
                <TableHead className="text-xs">Posko Pemohon</TableHead>
                <TableHead className="text-xs">Jumlah Diminta</TableHead>
                <TableHead className="text-xs">Tersedia di Posko</TableHead>
                <TableHead className="text-xs">Kesenjangan (Defisit)</TableHead>
                <TableHead className="text-xs text-right">Tingkat Urgensi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {needs.map((need) => {
                const deficit = Math.max(0, need.requested - need.available);
                return (
                  <TableRow
                    key={need.id}
                    className="group/need text-xs duration-200 ease-out hover:bg-muted/40"
                  >
                    <TableCell className="font-medium">
                      <div className="font-semibold text-foreground">{need.item}</div>
                      <div className="text-[11px] text-muted-foreground">{need.category}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground transition-colors duration-200 ease-out group-hover/need:text-foreground">
                      {need.shelter}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {need.requested.toLocaleString("id-ID")} {need.unit}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {need.available.toLocaleString("id-ID")} {need.unit}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "tabular-nums font-semibold",
                        deficit > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {deficit > 0
                        ? `-${deficit.toLocaleString("id-ID")} ${need.unit}`
                        : "Terpenuhi"}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge
                        status={need.urgency}
                        className="min-w-[8.5rem] justify-center text-[11px]"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
