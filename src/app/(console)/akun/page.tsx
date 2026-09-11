import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { AccountVerificationQueue } from "@/components/account-verification-queue";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireRole, roleLabel } from "@/lib/auth";
import type { AppRole } from "@/lib/auth-types";
import {
  getAccounts,
  getAccountVerificationMetrics,
  getPendingAccounts,
  type AccountItem,
} from "@/lib/repositories/accounts";
import { cn, getInitials } from "@/lib/utils";

export const dynamic = "force-dynamic";

const roleTeams: Record<AppRole, string> = {
  admin: "BPBD - Administrator",
  bpbd_operator: "BPBD - Pusat Kendali",
  field_officer: "Tim Lapangan",
  shelter_manager: "Posko Pengungsian",
  warehouse_manager: "Gudang Logistik",
  driver: "Armada Distribusi Logistik",
  institution_partner: "Mitra Lembaga / Instansi",
  public_viewer: "Publik",
};

const accessSummaries: Record<AppRole, string> = {
  admin: "Akses penuh operasi, audit, dan pengaturan akun melalui Supabase/seed.",
  bpbd_operator: "Verifikasi laporan, buka kejadian, posko, logistik, audit, dan peta publik.",
  field_officer: "Buat laporan lapangan dan pantau tindak lanjut laporan.",
  shelter_manager: "Update data posko, pengungsi, kelompok rentan, dan kebutuhan.",
  warehouse_manager: "Kelola stok gudang, alokasi bantuan, dan status distribusi.",
  driver: "Perbarui status pengiriman dan lokasi terakhir armada distribusi logistik.",
  institution_partner: "Kelola bantuan pihak ketiga dan koordinasi logistik afiliasi instansi.",
  public_viewer: "Akses informasi publik yang aman ditampilkan.",
};

function AccountCell({ account }: { account: AccountItem }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="lg" className="font-medium">
        <AvatarFallback>{getInitials(account.fullName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-foreground">{account.fullName}</div>
        <div className="truncate font-mono text-xs text-muted-foreground">{account.email}</div>
      </div>
    </div>
  );
}

function RoleCell({ role }: { role: AppRole }) {
  return (
    <div className="grid gap-0.5">
      <span className="whitespace-nowrap text-sm text-foreground">{roleLabel(role)}</span>
      <span className="text-xs text-muted-foreground">{roleTeams[role]}</span>
    </div>
  );
}

export default async function AccountsPage() {
  await requireRole(["admin", "bpbd_operator"], "/dashboard");
  const [allAccounts, pendingAccounts, metrics] = await Promise.all([
    getAccounts(),
    getPendingAccounts(),
    getAccountVerificationMetrics(),
  ]);

  const activeAccounts = allAccounts.filter((a) => a.verificationStatus !== "pending");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Akun & Akses Operasi"
        description="Tata kelola otoritas pengguna, pendaftaran mandiri personel lapangan, dan antrean verifikasi massal tanggap darurat."
        actions={
          <Button asChild size="sm" className="gap-1.5 h-9 text-xs">
            <Link href="/daftar" target="_blank">
              <UserPlus className="size-3.5" />
              <span>Buka Form Pendaftaran Relawan</span>
              <ExternalLink className="size-3 opacity-60 ml-0.5" />
            </Link>
          </Button>
        }
      />

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs md:grid-cols-3 dark:*:data-[slot=card]:bg-card">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/50">
                <ShieldCheck className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Personel Aktif Terverifikasi</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-kpi font-medium text-3xl tabular-nums leading-none tracking-tight">
              {metrics.activeAccounts} Personel
            </div>
            <p className="text-muted-foreground text-sm">Memiliki hak akses resmi konsol operasi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-lg border",
                  metrics.pendingAccounts > 0
                    ? "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/50"
                    : "bg-muted text-muted-foreground border-border"
                )}
              >
                <ShieldAlert className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Antrean Verifikasi Pendaftaran</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="font-kpi font-medium text-3xl tabular-nums leading-none tracking-tight">
                {metrics.pendingAccounts} Akun
              </div>
              {metrics.pendingAccounts > 0 && (
                <Badge variant="destructive" className="animate-pulse text-xs">
                  Perlu Ditinjau
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">Menunggu persetujuan Koordinator BPBD</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/50">
                <Building2 className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>Lembaga / Instansi Terhubung</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="font-kpi font-medium text-3xl tabular-nums leading-none tracking-tight">
              {metrics.totalOrganizations} Instansi
            </div>
            <p className="text-muted-foreground text-sm">BPBD, PMI, TNI/Polri, Basarnas, Tagana</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigasi Antara Akun Aktif dan Antrean Verifikasi */}
      <Tabs defaultValue={pendingAccounts.length > 0 ? "verification" : "active"} className="space-y-4">
        <TabsList className="h-auto min-h-11 w-full justify-start overflow-x-auto overflow-y-hidden p-1 bg-muted/40 border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger
            value="active"
            className="min-h-9 shrink-0 gap-2 px-4 data-[state=active]:font-semibold shadow-none"
          >
            <Users className="size-3.5" />
            <span>Akun Terverifikasi</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[11px]">
              {activeAccounts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="verification"
            className="min-h-9 shrink-0 gap-2 px-4 data-[state=active]:font-semibold shadow-none"
          >
            <ShieldAlert className="size-3.5 text-amber-600" />
            <span>Antrean Verifikasi Massal</span>
            {pendingAccounts.length > 0 ? (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[11px] font-bold">
                {pendingAccounts.length}
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[11px]">
                0
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Akun Aktif */}
        <TabsContent value="active">
          <Card className="border">
            <CardHeader className="border-b py-4">
              <CardTitle className="text-base sm:text-lg font-semibold">Daftar Akun Terverifikasi</CardTitle>
              <CardDescription className="max-w-2xl leading-snug">
                Personel yang berwenang mengakses data insiden, logistik, dan posko.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 px-0">
              <Table className="**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4">
                <TableHeader className="[&_tr]:border-t bg-muted/30">
                  <TableRow>
                    <TableHead className="py-3 font-semibold text-xs">User</TableHead>
                    <TableHead className="py-3 font-semibold text-xs">Role / Tim</TableHead>
                    <TableHead className="py-3 font-semibold text-xs">Instansi / Organisasi</TableHead>
                    <TableHead className="py-3 font-semibold text-xs">Hak Akses</TableHead>
                    <TableHead className="py-3 font-semibold text-xs">Status</TableHead>
                    <TableHead className="py-3 font-semibold text-xs">Waktu Dibuat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeAccounts.length ? (
                    activeAccounts.map((account) => (
                      <TableRow key={account.id} className="border-border/60 hover:bg-muted/50 text-xs">
                        <TableCell className="px-3 py-3.5 align-middle">
                          <AccountCell account={account} />
                        </TableCell>
                        <TableCell className="px-3 py-3.5 align-middle">
                          <RoleCell role={account.role} />
                        </TableCell>
                        <TableCell className="px-3 py-3.5 align-middle">
                          {account.organization ? (
                            <span className="font-medium text-foreground">{account.organization}</span>
                          ) : (
                            <span className="text-muted-foreground italic">Pusat BPBD</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs px-3 py-3.5 align-middle text-[11px] text-muted-foreground leading-relaxed">
                          {accessSummaries[account.role]}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 align-middle whitespace-nowrap">
                          {account.isDemo ? (
                            <Badge className="gap-1 border px-2 py-0.5 font-medium text-[11px]" variant="outline">
                              <CheckCircle2 className="size-3 text-emerald-600" />
                              Demo Siap
                            </Badge>
                          ) : (
                            <Badge className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 font-medium text-[11px]">
                              Aktif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 align-middle text-[11px] text-muted-foreground whitespace-nowrap">
                          {account.createdAt}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Belum ada akun yang bisa ditampilkan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Antrean Verifikasi Massal */}
        <TabsContent value="verification">
          <AccountVerificationQueue pendingAccounts={pendingAccounts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
