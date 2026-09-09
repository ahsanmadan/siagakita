import { CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole, roleLabel } from "@/lib/auth";
import type { AppRole } from "@/lib/auth-types";
import { getAccounts, type AccountItem } from "@/lib/repositories/accounts";
import { getInitials } from "@/lib/utils";

export const dynamic = "force-dynamic";

const demoPassword = "siagakita123";

const roleTeams: Record<AppRole, string> = {
  admin: "BPBD - Administrator",
  bpbd_operator: "BPBD - Pusat Kendali",
  field_officer: "Tim Lapangan",
  shelter_manager: "Posko Pengungsian",
  warehouse_manager: "Gudang Logistik",
  public_viewer: "Publik",
};

const accessSummaries: Record<AppRole, string> = {
  admin: "Akses penuh operasi, audit, dan pengaturan akun melalui Supabase/seed.",
  bpbd_operator: "Verifikasi laporan, buka kejadian, posko, logistik, audit, dan peta publik.",
  field_officer: "Buat laporan lapangan dan pantau tindak lanjut laporan.",
  shelter_manager: "Update data posko, pengungsi, kelompok rentan, dan kebutuhan.",
  warehouse_manager: "Kelola stok gudang, alokasi bantuan, dan status distribusi.",
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
  const accounts = await getAccounts();

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-xl leading-none">Akun Demo</CardTitle>
        <CardDescription className="max-w-2xl leading-snug">
          Daftar akun operasional untuk video demo. Password akun demo lokal: <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{demoPassword}</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-0">
        <Table className="**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4">
          <TableHeader className="[&_tr]:border-t">
            <TableRow>
              <TableHead className="py-4 font-normal">User</TableHead>
              <TableHead className="py-4 font-normal">Role / Tim</TableHead>
              <TableHead className="py-4 font-normal">Hak akses demo</TableHead>
              <TableHead className="py-4 font-normal">Status</TableHead>
              <TableHead className="py-4 font-normal">Dibuat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length ? (
              accounts.map((account) => (
                <TableRow key={account.id} className="border-border/60 hover:bg-muted/50">
                  <TableCell className="px-3 py-4 align-middle">
                    <AccountCell account={account} />
                  </TableCell>
                  <TableCell className="px-3 py-4 align-middle">
                    <RoleCell role={account.role} />
                  </TableCell>
                  <TableCell className="max-w-lg px-3 py-4 align-middle text-sm text-muted-foreground">
                    {accessSummaries[account.role]}
                  </TableCell>
                  <TableCell className="px-3 py-4 align-middle">
                    {account.isDemo ? (
                      <Badge className="gap-1.5 border px-2 py-1 font-medium" variant="outline">
                        <CheckCircle2 />
                        Demo siap
                      </Badge>
                    ) : (
                      <Badge className="border px-2 py-1 font-medium" variant="outline">Akun tambahan</Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-4 align-middle text-sm text-muted-foreground">
                    {account.createdAt}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Belum ada akun yang bisa ditampilkan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
