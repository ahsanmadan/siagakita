import {
  Boxes,
  Building2,
  CircleDollarSign,
  FileCheck,
  MapPin,
  PackageCheck,
  Truck,
  Warehouse,
} from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { AllocationDialog } from "@/components/allocation-dialog";
import { ConfirmMutationAction } from "@/components/confirm-mutation-action";
import { FleetCheckpointDialog } from "@/components/fleet-checkpoint-dialog";
import { MutationAction } from "@/components/mutation-action";
import { RecommendationCard } from "@/components/recommendation-card";
import { SubmitButton } from "@/components/submit-button";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  confirmDistributionReceived,
  createThirdPartyAid,
  updateDistributionStatusAction,
  updateThirdPartyAidStatus,
} from "@/lib/actions/operations";
import { requireRole } from "@/lib/auth";
import { buildAllocationPrefill } from "@/lib/recommendation-allocation";
import { pickLogisticsRecommendation } from "@/lib/recommendation-context";
import { roleCapabilities } from "@/lib/role-ui";
import {
  getOperationsData,
  type ThirdPartyAid,
  type WarehouseOption,
} from "@/lib/repositories/operations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const statusLabels: Record<string, string> = {
  menunggu_alokasi: "Menunggu Alokasi",
  dialokasikan: "Armada Dialokasikan",
  disiapkan: "Disiapkan",
  berangkat: "Berangkat",
  dalam_perjalanan: "Dalam Perjalanan",
  "dalam-perjalanan": "Dalam Perjalanan",
  tertunda: "Tertunda",
  tiba_di_posko: "Tiba di Posko",
  diterima_posko: "Diterima Posko",
  diterima: "Diterima",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const aidStatusLabels: Record<ThirdPartyAid["status"], string> = {
  "menunggu-pencocokan": "Menunggu Pencocokan",
  "diterima-gudang": "Diterima Gudang",
  dialokasikan: "Dialokasikan",
};

function aidStatusBadge(status: ThirdPartyAid["status"]) {
  if (status === "dialokasikan") return "secondary";
  if (status === "diterima-gudang") return "outline";
  return "destructive";
}

function AidWorkflowActions({
  aid,
  warehouses,
}: {
  aid: ThirdPartyAid;
  warehouses: WarehouseOption[];
}) {
  if (aid.status === "dialokasikan") {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        Bantuan sudah dialokasikan ke jalur distribusi aktif.
      </p>
    );
  }

  if (aid.status === "diterima-gudang") {
    return (
      <MutationAction
        action={updateThirdPartyAidStatus}
        label="Tandai Dialokasikan"
        fields={{
          id: aid.id,
          status: "dialokasikan",
          warehouseId: aid.warehouse_id ?? warehouses[0]?.id ?? "",
          note: "Bantuan pihak ketiga sudah dialokasikan dari gudang.",
        }}
        variant="secondary"
      />
    );
  }

  return (
    <ActionForm action={updateThirdPartyAidStatus} className="gap-3">
      <input type="hidden" name="id" value={aid.id} />
      <input type="hidden" name="status" value="diterima-gudang" />
      <input
        type="hidden"
        name="note"
        value="Bantuan pihak ketiga divalidasi dan dicocokkan ke gudang."
      />
      <div className="grid gap-2">
        <Label className="text-xs">Gudang Pencocokan</Label>
        <Select name="warehouseId" defaultValue={aid.warehouse_id ?? warehouses[0]?.id}>
          <SelectTrigger className="h-8 text-xs bg-background">
            <SelectValue placeholder="Pilih gudang" />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id} className="text-xs">
                {warehouse.name} · {warehouse.level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SubmitButton pendingLabel="Memvalidasi...">Validasi ke Gudang</SubmitButton>
    </ActionForm>
  );
}

export default async function LogisticsPage() {
  const profile = await requireRole(["admin", "bpbd_operator", "warehouse_manager"], "/dashboard");
  const capabilities = roleCapabilities(profile.role);
  const {
    distributions: baseDistributions,
    inventory,
    recommendations,
    shelters,
    thirdPartyAids,
    warehouses,
  } = await getOperationsData();

  const supabase = await createSupabaseServerClient();
  const { data: rawPods } = await supabase
    .from("proof_of_delivery")
    .select("*, operational_attachments(*)")
    .order("created_at", { ascending: false });

  const podByDistId = new Map<string, any>();
  if (rawPods) {
    for (const pod of rawPods) {
      if (pod.distribution_id) podByDistId.set(pod.distribution_id, pod);
    }
  }

  const distributions = baseDistributions.map((d) => {
    const pod = podByDistId.get(d.id);
    if (!pod) return d;
    const rawAttach = pod.operational_attachments as Record<string, any> | undefined;
    const podAttachment = rawAttach ? {
      id: rawAttach.id,
      module: rawAttach.module,
      entityType: rawAttach.entity_type,
      entityId: rawAttach.entity_id,
      fileBucket: rawAttach.file_bucket,
      filePath: rawAttach.file_path,
      originalFileName: rawAttach.original_file_name,
      mimeType: rawAttach.mime_type,
      fileSize: rawAttach.file_size ? Number(rawAttach.file_size) : null,
      visibility: rawAttach.visibility,
      description: rawAttach.description,
      caption: rawAttach.caption,
      metadata: rawAttach.metadata || {},
      uploadedBy: rawAttach.uploaded_by,
      uploadedAt: rawAttach.uploaded_at || rawAttach.created_at,
      createdAt: rawAttach.created_at,
      updatedAt: rawAttach.updated_at,
    } : pod.proof_path ? {
      id: `legacy-${pod.id}`,
      module: "deliveries",
      entityType: "proof_of_delivery",
      entityId: pod.id,
      fileBucket: "operational_evidence",
      filePath: pod.proof_path,
      originalFileName: pod.proof_path.split("/").pop() || "bukti-penerimaan.jpg",
      mimeType: "image/jpeg",
      fileSize: null,
      visibility: "internal" as const,
      description: pod.receiver_note || "Bukti serah terima bantuan posko (legacy)",
      caption: null,
      metadata: {},
      uploadedBy: pod.created_by,
      uploadedAt: pod.created_at,
      createdAt: pod.created_at,
      updatedAt: pod.created_at,
    } : null;

    return {
      ...d,
      proofOfDelivery: {
        id: pod.id,
        distributionId: pod.distribution_id,
        shelterId: pod.shelter_id,
        receivedBy: pod.received_by,
        receivedByProfileId: pod.received_by_profile_id,
        receivedAt: pod.received_at,
        receiverNote: pod.receiver_note,
        proofPath: pod.proof_path,
        attachmentId: pod.attachment_id,
        attachment: podAttachment,
        createdBy: pod.created_by,
        createdAt: pod.created_at,
      },
    };
  });

  const availableItemTypes = inventory.filter((item) => item.stock - item.reserved > 0).length;
  const activeDistributions = distributions.filter((item) => item.status !== "diterima").length;
  const pendingAids = thirdPartyAids.filter((aid) => aid.status === "menunggu-pencocokan").length;
  const receivedAids = thirdPartyAids.filter((aid) => aid.status === "diterima-gudang").length;
  const lowStockItems = inventory.filter(
    (item) => item.status === "critical" || item.status === "warning",
  ).length;
  const logisticsRecommendation = pickLogisticsRecommendation(recommendations);
  const allocationPrefill = logisticsRecommendation
    ? buildAllocationPrefill(logisticsRecommendation, shelters, inventory)
    : null;
  const shelterOptions = shelters.map((shelter) => ({
    id: shelter.id,
    name: shelter.name,
    location: shelter.location,
    needs: shelter.needs,
  }));
  const inventoryOptions = inventory.map((item) => ({
    id: item.id,
    item: item.item,
    stock: item.stock,
    reserved: item.reserved,
    unit: item.unit,
  }));

  return (
    <div className="@container/main flex flex-col gap-6">
      {/* Top Header Strip */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Logistik & Armada Bantuan
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manajemen stok berjenjang, armada konvoi logistik, dan alokasi bantuan pihak ketiga.
          </p>
        </div>
        {capabilities.canManageDistribution && (
          <AllocationDialog
            shelters={shelterOptions}
            inventory={inventoryOptions}
            triggerLabel="Alokasi Logistik"
            triggerClassName="self-start sm:self-auto"
          />
        )}
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/50">
                <Boxes className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Stok Siap Alokasi</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-kpi font-medium text-3xl tabular-nums leading-none tracking-tight">
              {availableItemTypes} / {inventory.length}
            </div>
            <p className="text-muted-foreground text-sm">Item dengan saldo cadangan aman</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/50">
                <Truck className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Armada Konvoi Aktif</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-kpi font-medium text-3xl tabular-nums leading-none tracking-tight">
                {activeDistributions} Rute
              </div>
              <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700">
                Dalam Perjalanan
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">Truk logistik & tangki air</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/50">
                <Warehouse className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Bantuan Diterima Gudang</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-kpi font-medium text-3xl tabular-nums leading-none tracking-tight">
              {receivedAids} Paket
            </div>
            <p className="text-muted-foreground text-sm">Tervalidasi di gudang kabupaten/provinsi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/50">
                <CircleDollarSign className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Menunggu Validasi</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-kpi font-medium text-3xl tabular-nums leading-none tracking-tight">
                {pendingAids} Bantuan
              </div>
              {pendingAids > 0 ? (
                <Badge variant="destructive" className="animate-pulse">
                  Perlu Aksi
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground text-sm">Bantuan pihak ketiga masuk</p>
          </CardContent>
        </Card>
      </div>

      {logisticsRecommendation && (
        <RecommendationCard
          recommendation={logisticsRecommendation}
          action={
            capabilities.canManageDistribution && allocationPrefill ? (
              <AllocationDialog
                shelters={shelterOptions}
                inventory={inventoryOptions}
                prefill={allocationPrefill}
                triggerLabel="Terapkan Alokasi Ini"
                triggerSize="default"
                triggerClassName="w-full justify-center"
                fromRecommendation
              />
            ) : null
          }
        />
      )}

      {/* Tabs Layout */}
      <Tabs defaultValue="distribution" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="distribution" className="text-xs">
            Distribusi Aktif ({distributions.length})
          </TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs">
            Stok Gudang Berjenjang ({inventory.length})
          </TabsTrigger>
          <TabsTrigger value="donations" className="text-xs">
            Bantuan Masuk ({thirdPartyAids.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Distribusi Aktif */}
        <TabsContent value="distribution" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {distributions.map((distribution) => (
            <Card key={distribution.id} className="flex flex-col justify-between shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Badge variant="outline" className="font-mono text-xs shrink-0">
                      {distribution.vehicleCode || distribution.id}
                    </Badge>
                    <span className="text-[11px] font-medium text-muted-foreground truncate">
                      {distribution.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {distribution.isStale && (
                      <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] px-1.5 py-0">
                        Update Usang
                      </Badge>
                    )}
                    <Badge
                      variant={distribution.status === "diterima" ? "secondary" : "outline"}
                      className={
                        distribution.status === "dalam-perjalanan"
                          ? "border-sky-300 text-sky-700 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300"
                          : ""
                      }
                    >
                      {statusLabels[distribution.status]}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-base font-semibold mt-2 truncate">
                  {distribution.destination}
                </CardTitle>
                <CardDescription className="text-xs">
                  {distribution.vehicleName || "Truk Bantuan"} · {distribution.origin}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="rounded-lg bg-muted/60 p-3 text-xs leading-relaxed border">
                  <span className="font-medium text-foreground">Muatan: </span>
                  {distribution.cargo}
                </div>

                {/* Last Known Checkpoint Card (Manual update checkpoint model) */}
                <div className="rounded-lg border p-2.5 bg-muted/30 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <MapPin className="size-3 text-sky-600" />
                      Lokasi Terakhir Diperbarui
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {distribution.lastUpdatedAt}
                    </span>
                  </div>
                  <div className="font-medium text-foreground text-[12px]">
                    {distribution.lastLocationName || "Gudang Logistik"}
                  </div>
                  {distribution.lastCoordinates && (
                    <div className="text-[10px] font-mono text-muted-foreground">
                      Koordinat: {distribution.lastCoordinates.latitude.toFixed(4)}, {distribution.lastCoordinates.longitude.toFixed(4)}
                    </div>
                  )}
                  {distribution.driverNote && (
                    <p className="text-[11px] italic text-muted-foreground border-l-2 border-sky-400 pl-2 mt-1">
                      &ldquo;{distribution.driverNote}&rdquo;
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                    <span>
                      Sumber: <strong className="text-foreground">{distribution.lastUpdatedByRole === "driver" ? "Supir Armada" : distribution.lastUpdatedByRole === "shelter" ? "Petugas Posko" : "Pembaruan Manual Petugas"}</strong>
                    </span>
                    {distribution.vehiclePlateNumber && (
                      <span className="font-mono text-[9.5px] bg-muted px-1.5 py-0.5 rounded border">
                        {distribution.vehiclePlateNumber}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>ETA: {distribution.eta}</span>
                    <span className="font-semibold text-foreground">{distribution.progress}%</span>
                  </div>
                  <Progress value={distribution.progress} className="h-1.5" />
                </div>

                {/* Checkpoint History Accordion */}
                {distribution.checkpointHistory && distribution.checkpointHistory.length > 0 && (
                  <details className="text-xs group border rounded-md p-2 bg-card">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium list-none flex items-center justify-between">
                      <span>Riwayat Checkpoint ({distribution.checkpointHistory.length})</span>
                      <span className="text-[10px] group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="space-y-1.5 pt-2 pl-2 border-l-2 border-sky-300 ml-1 mt-1.5 text-[11px]">
                      {distribution.checkpointHistory.map((h, i) => (
                        <div key={i} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="font-semibold uppercase text-sky-700 dark:text-sky-300">{h.status}</span>
                            <span>{new Date(h.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</span>
                          </div>
                          <div className="font-medium text-foreground">{h.location}</div>
                          {h.note && <div className="text-muted-foreground text-[10.5px] italic">&ldquo;{h.note}&rdquo;</div>}
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Dokumen Tanda Terima (Proof of Delivery) */}
                {distribution.proofOfDelivery?.attachment && (
                  <div className="flex items-center justify-between text-[11px] p-2 rounded-md bg-muted/30 border border-border/70">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <FileCheck className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate font-medium text-foreground">
                        {distribution.proofOfDelivery.attachment.originalFileName || "Bukti POD"}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 uppercase font-mono">
                        {distribution.proofOfDelivery.attachment.visibility}
                      </Badge>
                    </div>
                    <span className="text-[10.5px] text-muted-foreground shrink-0">
                      Penerima: {distribution.proofOfDelivery.receivedBy}
                    </span>
                  </div>
                )}

                {capabilities.canManageDistribution && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                    <FleetCheckpointDialog distribution={distribution} />
                    <ConfirmMutationAction
                      action={confirmDistributionReceived}
                      label="Terima Bantuan"
                      size="sm"
                      triggerClassName="text-xs h-8"
                      title={`Konfirmasi ${distribution.id} diterima?`}
                      description={`Pastikan bantuan sudah sampai di ${distribution.destination}.`}
                      consequence="Status distribusi berubah jadi Diterima dan kuota posko otomatis tercatat."
                      fields={{ code: distribution.id }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab 2: Inventory Stok */}
        <TabsContent value="inventory">
          <Card className="shadow-xs overflow-hidden">
            <CardHeader className="py-4">
              <CardTitle className="text-base">Stok Logistik Lintas Tingkat Gudang</CardTitle>
              <CardDescription>
                Sinkronisasi saldo stok dari Posko, BPBD Kabupaten, BPBD Provinsi, hingga BNPB Pusat.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-xs">Komoditas & Kategori</TableHead>
                    <TableHead className="text-xs">Gudang</TableHead>
                    <TableHead className="text-xs">Tingkat</TableHead>
                    <TableHead className="text-xs">Stok Tersedia</TableHead>
                    <TableHead className="text-xs">Dipesan</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.id} className="text-xs hover:bg-muted/40">
                      <TableCell className="font-medium">
                        <div className="font-semibold text-foreground">{item.item}</div>
                        <div className="text-[11px] text-muted-foreground">{item.category}</div>
                      </TableCell>
                      <TableCell>{item.warehouse}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {item.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums font-semibold">
                        {item.stock.toLocaleString("id-ID")} {item.unit}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {item.reserved.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Bantuan Masuk */}
        <TabsContent value="donations">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
            <Card className="shadow-xs">
              <CardHeader className="py-4">
                <CardTitle className="text-base">Pencatatan Bantuan Pihak Ketiga</CardTitle>
                <CardDescription>
                  Verifikasi bantuan dari lembaga swasta, relawan, dan CSR sebelum dialokasikan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                {thirdPartyAids.length ? (
                  thirdPartyAids.map((aid) => (
                    <div
                      key={aid.id}
                      className="grid gap-3 rounded-lg border p-3.5 xl:grid-cols-[minmax(0,1fr)_minmax(14rem,0.6fr)] bg-card"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                          <Building2 className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">
                              {aid.source_name}
                            </span>
                            <Badge variant={aidStatusBadge(aid.status)} className="text-[10px]">
                              {aidStatusLabels[aid.status]}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {aid.cargo} · {aid.quantity?.toLocaleString("id-ID") ?? "-"}{" "}
                            {aid.unit ?? ""}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground/80">
                            {aid.warehouses
                              ? `${aid.warehouses.name} (${aid.warehouses.level})`
                              : "Belum dicocokkan ke gudang"}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2.5 border">
                        {capabilities.canManageDistribution ? (
                          <AidWorkflowActions aid={aid} warehouses={warehouses} />
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Pengelolaan alokasi dibatasi untuk operator logistik BPBD.
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                    Belum ada bantuan pihak ketiga yang tercatat.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-xs border-primary/20 bg-card">
              <CardHeader className="py-4">
                <CardTitle className="text-base">Catat Bantuan Baru</CardTitle>
                <CardDescription>
                  Bantuan yang dicatat akan masuk antrean validasi gudang.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                {capabilities.canManageDistribution ? (
                  <ActionForm action={createThirdPartyAid} className="gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="sourceName" className="text-xs">
                        Sumber Bantuan
                      </Label>
                      <Input
                        id="sourceName"
                        name="sourceName"
                        placeholder="Contoh: PMI Jawa Barat / CSR PLN"
                        className="h-8 text-xs"
                        required
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="cargo" className="text-xs">
                        Jenis Bantuan
                      </Label>
                      <Input
                        id="cargo"
                        name="cargo"
                        placeholder="Contoh: Tenda darurat & selimut"
                        className="h-8 text-xs"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1.5">
                        <Label htmlFor="quantity" className="text-xs">
                          Jumlah
                        </Label>
                        <Input
                          id="quantity"
                          name="quantity"
                          type="number"
                          min={1}
                          placeholder="100"
                          className="h-8 text-xs"
                          required
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="unit" className="text-xs">
                          Satuan
                        </Label>
                        <Input
                          id="unit"
                          name="unit"
                          placeholder="paket"
                          className="h-8 text-xs"
                          required
                        />
                      </div>
                    </div>
                    <SubmitButton>Simpan Bantuan</SubmitButton>
                  </ActionForm>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Pencatatan dibatasi untuk BPBD dan koordinator logistik.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
