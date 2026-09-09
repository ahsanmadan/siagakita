import Link from "next/link";
import { ArrowRight, RadioTower, TentTree, Users } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOperationsData } from "@/lib/repositories/operations";
import { requireRole } from "@/lib/auth";

export default async function EventsPage() {
  await requireRole(["admin", "bpbd_operator", "field_officer"], "/dashboard");
  const { disasterEvents, metrics } = await getOperationsData();

  return (
    <div className="@container/main flex flex-col gap-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Ruang Operasi Kejadian Bencana Aktif
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pusat komando terpadu untuk koordinasi tim gabungan, eskalasi wilayah, dan alokasi sumber daya.
        </p>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs md:grid-cols-3 dark:*:data-[slot=card]:bg-card">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/50">
                <RadioTower className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Kejadian Tanggap Darurat</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
                {metrics.activeEvents} Wilayah
              </div>
              <Badge variant="destructive" className="animate-pulse">
                Aktif
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">Sedang dalam proses penanganan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/50">
                <Users className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Total Warga Terdampak</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {metrics.affectedPeople.toLocaleString("id-ID")} Jiwa
            </div>
            <p className="text-muted-foreground text-sm">Akumulasi seluruh titik bencana</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/50">
                <TentTree className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Posko Penampungan Terhubung</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {metrics.activeShelters} Posko
            </div>
            <p className="text-muted-foreground text-sm">Menerima pengungsi & logistik</p>
          </CardContent>
        </Card>
      </div>

      {/* Incident List Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="py-4">
          <CardTitle className="text-base">Daftar Kejadian Bencana</CardTitle>
          <CardDescription>
            Pilih kejadian untuk membuka ruang kendali insiden, peta interaktif, dan koordinasi instansi.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-xs">Nama Kejadian & Lokasi</TableHead>
                <TableHead className="text-xs">Status Krisis</TableHead>
                <TableHead className="text-xs">Tingkat Eskalasi</TableHead>
                <TableHead className="text-xs">Warga Terdampak</TableHead>
                <TableHead className="text-xs text-right">Ruang Operasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disasterEvents.map((event) => (
                <TableRow key={event.id} className="text-xs hover:bg-muted/40">
                  <TableCell className="font-medium">
                    <Link
                      href={`/kejadian/${event.id}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors text-sm"
                    >
                      {event.name}
                    </Link>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {event.location}, {event.province} · Update {event.updatedAt}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={event.status} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {event.escalationLevel}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums font-semibold">
                    {event.affectedPeople.toLocaleString("id-ID")} Jiwa
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
                      <Link href={`/kejadian/${event.id}`}>
                        Buka Ruang Kendali <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
