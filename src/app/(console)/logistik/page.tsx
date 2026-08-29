import { Boxes, Building2, CircleDollarSign, PackageCheck, Plus, Truck, Warehouse } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { ConfirmMutationAction } from "@/components/confirm-mutation-action";
import { MetricCard } from "@/components/metric-card";
import { MutationAction } from "@/components/mutation-action";
import { OperationalBrief } from "@/components/operational-brief";
import { MetricStrip, OperationalCard } from "@/components/operational-ui";
import { PageHeader } from "@/components/page-header";
import { RecommendationCard } from "@/components/recommendation-card";
import { SubmitButton } from "@/components/submit-button";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  allocateDistribution,
  confirmDistributionReceived,
  createThirdPartyAid,
  updateDistributionStatusAction,
  updateThirdPartyAidStatus,
} from "@/lib/actions/operations";
import { requireProfile } from "@/lib/auth";
import { pickLogisticsRecommendation } from "@/lib/recommendation-context";
import { roleCapabilities } from "@/lib/role-ui";
import { getOperationsData, type ThirdPartyAid, type WarehouseOption } from "@/lib/repositories/operations";

const statusLabels = { disiapkan: "Disiapkan", "dalam-perjalanan": "Dalam perjalanan", diterima: "Diterima" };

const aidStatusLabels: Record<ThirdPartyAid["status"], string> = {
  "menunggu-pencocokan": "Menunggu pencocokan",
  "diterima-gudang": "Diterima gudang",
  dialokasikan: "Dialokasikan",
};

function aidStatusBadge(status: ThirdPartyAid["status"]) {
  if (status === "dialokasikan") return "secondary";
  if (status === "diterima-gudang") return "outline";
  return "destructive";
}

function AidWorkflowActions({ aid, warehouses }: { aid: ThirdPartyAid; warehouses: WarehouseOption[] }) {
  if (aid.status === "dialokasikan") {
    return <p className="text-xs leading-5 text-muted-foreground">Bantuan sudah masuk alur alokasi. Riwayatnya tercatat di audit log.</p>;
  }

  if (aid.status === "diterima-gudang") {
    return (
      <MutationAction
        action={updateThirdPartyAidStatus}
        label="Tandai dialokasikan"
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
      <input type="hidden" name="note" value="Bantuan pihak ketiga divalidasi dan dicocokkan ke gudang." />
      <div className="grid gap-2">
        <Label>Gudang pencocokan</Label>
        <Select name="warehouseId" defaultValue={aid.warehouse_id ?? warehouses[0]?.id}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Pilih gudang" />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name} · {warehouse.level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SubmitButton pendingLabel="Memvalidasi...">Validasi ke gudang</SubmitButton>
    </ActionForm>
  );
}

export default async function LogisticsPage() {
  const profile = await requireProfile();
  const capabilities = roleCapabilities(profile.role);
  const { distributions, inventory, recommendations, shelters, thirdPartyAids, warehouses } = await getOperationsData();
  const availableItemTypes = inventory.filter((item) => item.stock - item.reserved > 0).length;
  const activeDistributions = distributions.filter((item) => item.status !== "diterima").length;
  const pendingAids = thirdPartyAids.filter((aid) => aid.status === "menunggu-pencocokan").length;
  const receivedAids = thirdPartyAids.filter((aid) => aid.status === "diterima-gudang").length;
  const allocatedAids = thirdPartyAids.filter((aid) => aid.status === "dialokasikan").length;
  const lowStockItems = inventory.filter((item) => item.status === "critical" || item.status === "warning").length;
  const logisticsRecommendation = pickLogisticsRecommendation(recommendations);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logistik & Distribusi"
        description={capabilities.canManageDistribution ? "Pantau stok berjenjang, bantuan masuk, pengiriman, dan konfirmasi penerimaan dari satu alur operasional." : "Konteks logistik ditampilkan terbatas sesuai kebutuhan operasional role saat ini."}
        actions={capabilities.canManageDistribution ?
          <Dialog>
            <DialogTrigger asChild>
              <Button className="min-h-11">
                <Plus /> Allocate Supplies
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Alokasi distribusi</DialogTitle>
                <DialogDescription>Pilih stok dan posko tujuan. Sistem menahan stok secara atomik bila jumlah mencukupi.</DialogDescription>
              </DialogHeader>
              <ActionForm action={allocateDistribution} className="py-2">
                <div className="grid gap-2">
                  <Label>Posko tujuan</Label>
                  <Select name="shelterCode" defaultValue={shelters[0]?.id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih posko" />
                    </SelectTrigger>
                    <SelectContent>
                      {shelters.map((shelter) => (
                        <SelectItem key={shelter.id} value={shelter.id}>
                          {shelter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Item stok</Label>
                  <Select name="inventoryItemId" defaultValue={inventory[0]?.id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih stok" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventory.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.item} · {item.stock - item.reserved} {item.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Jumlah</Label>
                  <Input id="quantity" name="quantity" type="number" min={1} defaultValue={100} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="eta">ETA</Label>
                  <Input id="eta" name="eta" defaultValue="Hari ini 18.00 WIB" required />
                </div>
                <input type="hidden" name="priority" value="warning" />
                <SubmitButton>Allocate Supplies</SubmitButton>
              </ActionForm>
            </DialogContent>
          </Dialog>
          : null
        }
      />

      <OperationalBrief
        items={[
          { label: "Stok perlu perhatian", value: `${lowStockItems} item`, detail: "Status warning/kritis sebelum alokasi berikutnya.", tone: lowStockItems ? "warning" : "teal", icon: Boxes },
          { label: "Pengiriman aktif", value: `${activeDistributions} distribusi`, detail: "Perlu update perjalanan atau konfirmasi terima.", tone: activeDistributions ? "warning" : "neutral", icon: Truck },
          { label: "Bantuan menunggu", value: `${pendingAids} bantuan`, detail: "Perlu validasi dan pencocokan gudang.", tone: pendingAids ? "critical" : "teal", icon: CircleDollarSign },
          { label: "Bantuan dialokasikan", value: `${allocatedAids}/${thirdPartyAids.length} bantuan`, detail: "Bantuan pihak ketiga yang sudah masuk alur distribusi.", tone: allocatedAids ? "teal" : "neutral", icon: PackageCheck },
        ]}
      />

      <MetricStrip>
        <MetricCard label="Jenis stok tersedia" value={`${availableItemTypes}/${inventory.length}`} note="Item dengan saldo siap alokasi" icon={Boxes} />
        <MetricCard label="Pengiriman aktif" value={String(activeDistributions)} note="Rute aktif perlu dipantau" icon={Truck} tone="warning" />
        <MetricCard label="Diterima gudang" value={String(receivedAids)} note="Bantuan siap dialokasikan" icon={Warehouse} tone="teal" />
        <MetricCard label="Menunggu bantuan" value={String(pendingAids)} note="Perlu validasi dan gudang" icon={CircleDollarSign} tone={pendingAids ? "critical" : "brand"} />
      </MetricStrip>

      {logisticsRecommendation ? <RecommendationCard recommendation={logisticsRecommendation} /> : null}

      <Tabs defaultValue="distribution" className="space-y-4">
        <TabsList className="h-auto min-h-11 flex-wrap">
          <TabsTrigger value="distribution">Distribusi aktif</TabsTrigger>
          <TabsTrigger value="inventory">Stok berjenjang</TabsTrigger>
          <TabsTrigger value="donations">Bantuan masuk</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="grid gap-4 lg:grid-cols-3">
          {distributions.map((distribution) => (
            <OperationalCard key={distribution.id}>
              <CardHeader className="pb-3 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline">{distribution.id}</Badge>
                  <Badge variant={distribution.status === "diterima" ? "secondary" : "outline"}>{statusLabels[distribution.status]}</Badge>
                </div>
                <CardTitle className="text-lg leading-7">{distribution.destination}</CardTitle>
                <CardDescription>{distribution.origin} · {distribution.institution}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-5">
                <div className="rounded-lg bg-muted p-3 text-sm leading-6">{distribution.cargo}</div>
                <div>
                  <div className="mb-2 flex justify-between text-xs">
                    <span>{distribution.eta}</span>
                    <strong>{distribution.progress}%</strong>
                  </div>
                  <Progress value={distribution.progress} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {capabilities.canManageDistribution ? <MutationAction
                    action={updateDistributionStatusAction}
                    label={distribution.status === "diterima" ? "Confirm Delivery" : "Update Delivery Status"}
                    fields={{
                      code: distribution.id,
                      status: distribution.status === "diterima" ? "diterima" : "dalam-perjalanan",
                      progress: distribution.status === "diterima" ? 100 : Math.min(100, distribution.progress + 15),
                    }}
                    variant="outline"
                  /> : null}
                  {capabilities.canManageDistribution ? <ConfirmMutationAction
                    action={confirmDistributionReceived}
                    label="Confirm Delivery"
                    title={`Konfirmasi ${distribution.id} diterima?`}
                    description={`Pastikan bantuan sudah diterima oleh ${distribution.destination}.`}
                    consequence="Status distribusi menjadi diterima, stok tercatat, dan audit log menyimpan konfirmasi ini."
                    fields={{ code: distribution.id }}
                  /> : null}
                </div>
              </CardContent>
            </OperationalCard>
          ))}
        </TabsContent>

        <TabsContent value="inventory">
          <OperationalCard className="overflow-clip">
            <CardHeader className="py-5">
              <CardTitle className="text-base">Stok lintas tingkat gudang</CardTitle>
              <CardDescription>Posko ke kabupaten, provinsi, dan dukungan nasional</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid gap-3 p-4 md:hidden">
                {inventory.map((item) => (
                  <article key={item.id} className="rounded-xl border bg-background/72 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.item}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.warehouse} · {item.level}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                      <span>Stok<strong className="mt-1 block data-number">{item.stock.toLocaleString("id-ID")} {item.unit}</strong></span>
                      <span>Dipesan<strong className="mt-1 block data-number">{item.reserved.toLocaleString("id-ID")}</strong></span>
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Gudang</TableHead>
                      <TableHead>Tingkat</TableHead>
                      <TableHead>Stok</TableHead>
                      <TableHead>Dipesan</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.item}<p className="mt-1 text-xs text-muted-foreground">{item.category}</p></TableCell>
                        <TableCell>{item.warehouse}</TableCell>
                        <TableCell><Badge variant="outline">{item.level}</Badge></TableCell>
                        <TableCell className="data-number">{item.stock.toLocaleString("id-ID")} {item.unit}</TableCell>
                        <TableCell className="data-number">{item.reserved.toLocaleString("id-ID")}</TableCell>
                        <TableCell><StatusBadge status={item.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </OperationalCard>
        </TabsContent>

        <TabsContent value="donations">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(19rem,0.75fr)]">
            <Card className="py-0 shadow-none">
              <CardHeader className="py-5">
                <CardTitle className="text-base">Bantuan pihak ketiga</CardTitle>
                <CardDescription>Alur: catat bantuan, validasi ke gudang, lalu tandai saat bantuan sudah dialokasikan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pb-5">
                {thirdPartyAids.length ? (
                  thirdPartyAids.map((aid) => (
                    <div key={aid.id} className="grid gap-4 rounded-xl border p-4 xl:grid-cols-[minmax(0,1fr)_minmax(15rem,0.6fr)]">
                      <div className="flex items-start gap-4">
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary">
                          <Building2 className="size-5 text-[var(--color-teal)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{aid.source_name}</p>
                            <Badge variant={aidStatusBadge(aid.status)}>{aidStatusLabels[aid.status]}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{aid.cargo} · {aid.quantity?.toLocaleString("id-ID") ?? "-"} {aid.unit ?? ""}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {aid.warehouses ? `${aid.warehouses.name} · ${aid.warehouses.level}` : "Belum dicocokkan ke gudang"}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-muted/55 p-3">
                        {capabilities.canManageDistribution ? <AidWorkflowActions aid={aid} warehouses={warehouses} /> : <p className="text-xs leading-5 text-muted-foreground">Status bantuan ditampilkan sebagai konteks. Pengelolaan distribusi dilakukan oleh gudang atau BPBD.</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Belum ada bantuan pihak ketiga yang tercatat.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-card py-0 shadow-none">
              <CardHeader className="pt-5">
                <CardTitle className="text-lg">Catat bantuan masuk</CardTitle>
                <CardDescription>Data tersimpan sebagai bantuan menunggu pencocokan gudang.</CardDescription>
              </CardHeader>
              <CardContent className="pb-5">
                {capabilities.canManageDistribution ? <ActionForm action={createThirdPartyAid}>
                  <div className="grid gap-2">
                    <Label htmlFor="sourceName">Sumber bantuan</Label>
                    <Input id="sourceName" name="sourceName" placeholder="Contoh: PMI Sumatera Barat" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cargo">Jenis bantuan</Label>
                    <Input id="cargo" name="cargo" placeholder="Contoh: Selimut dan matras" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="quantity">Jumlah</Label>
                      <Input id="quantity" name="quantity" type="number" min={1} placeholder="100" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="unit">Satuan</Label>
                      <Input id="unit" name="unit" placeholder="paket" required />
                    </div>
                  </div>
                  <SubmitButton>Catat bantuan</SubmitButton>
                </ActionForm> : <p className="text-sm leading-6 text-muted-foreground">Pencatatan dan validasi bantuan masuk dibatasi untuk BPBD dan pengelola gudang.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
