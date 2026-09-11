"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCheck,
  Eye,
  Filter,
  Phone,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  approveAccountAction,
  batchApproveAccountsAction,
  batchRejectAccountsAction,
  rejectAccountAction,
} from "@/lib/actions/accounts";
import { roleLabel, type AppRole } from "@/lib/auth-types";
import type { AccountItem } from "@/lib/repositories/accounts";
import { cn, getInitials } from "@/lib/utils";

interface VerificationQueueProps {
  pendingAccounts: AccountItem[];
}

export function AccountVerificationQueue({ pendingAccounts }: VerificationQueueProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterOrg, setFilterOrg] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Detail Modal
  const [detailAccount, setDetailAccount] = useState<AccountItem | null>(null);

  // Reject Dialog
  const [rejectAccount, setRejectAccount] = useState<AccountItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Batch Reject Dialog
  const [batchRejectOpen, setBatchRejectOpen] = useState(false);
  const [batchRejectReason, setBatchRejectReason] = useState("");

  // Unique organizations for filtering
  const organizations = useMemo(() => {
    const set = new Set<string>();
    pendingAccounts.forEach((acc) => {
      if (acc.organization) set.add(acc.organization);
    });
    return Array.from(set);
  }, [pendingAccounts]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return pendingAccounts.filter((acc) => {
      const matchOrg = filterOrg === "all" || acc.organization === filterOrg;
      const matchRole = filterRole === "all" || acc.requestedRole === filterRole;
      const matchSearch =
        !searchQuery ||
        acc.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (acc.phone && acc.phone.includes(searchQuery)) ||
        (acc.organization && acc.organization.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchOrg && matchRole && matchSearch;
    });
  }, [pendingAccounts, filterOrg, filterRole, searchQuery]);

  const allFilteredSelected =
    filteredAccounts.length > 0 &&
    filteredAccounts.every((acc) => selectedIds.has(acc.id));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAccounts.map((a) => a.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Single approve
  const handleApprove = (account: AccountItem, targetRole?: AppRole) => {
    const formData = new FormData();
    formData.append("id", account.id);
    if (targetRole) {
      formData.append("assignedRole", targetRole);
    }

    startTransition(async () => {
      const res = await approveAccountAction(formData);
      if (res.ok) {
        toast.success(res.message);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(account.id);
          return next;
        });
        if (detailAccount?.id === account.id) setDetailAccount(null);
      } else {
        toast.error(res.message);
      }
    });
  };

  // Single reject
  const handleRejectConfirm = () => {
    if (!rejectAccount) return;
    const formData = new FormData();
    formData.append("id", rejectAccount.id);
    formData.append("reason", rejectReason);

    startTransition(async () => {
      const res = await rejectAccountAction(formData);
      if (res.ok) {
        toast.success(res.message);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(rejectAccount.id);
          return next;
        });
        setRejectAccount(null);
        setRejectReason("");
      } else {
        toast.error(res.message);
      }
    });
  };

  // Batch approve
  const handleBatchApprove = () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    startTransition(async () => {
      const res = await batchApproveAccountsAction(ids);
      if (res.ok) {
        toast.success(res.message);
        setSelectedIds(new Set());
      } else {
        toast.error(res.message);
      }
    });
  };

  // Batch reject
  const handleBatchRejectConfirm = () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    startTransition(async () => {
      const res = await batchRejectAccountsAction(ids, batchRejectReason);
      if (res.ok) {
        toast.success(res.message);
        setSelectedIds(new Set());
        setBatchRejectOpen(false);
        setBatchRejectReason("");
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Card className="shadow-xs overflow-hidden border">
      <CardHeader className="border-b py-4 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-lg font-semibold">
                Antrean Verifikasi Personel & Relawan
              </CardTitle>
              {pendingAccounts.length > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs font-semibold">
                  {pendingAccounts.length} Menunggu
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs sm:text-sm mt-0.5">
              Validasi keanggotaan tim lapangan dan relawan sebelum diberikan izin tulis ke konsol operasi.
            </CardDescription>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Cari nama / email / instansi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-44 text-xs lg:w-56"
            />
            {organizations.length > 0 && (
              <Select value={filterOrg} onValueChange={setFilterOrg}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Instansi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Instansi</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org} value={org}>
                      {org}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Peran</SelectItem>
                <SelectItem value="field_officer">Petugas Lapangan</SelectItem>
                <SelectItem value="shelter_manager">Pengelola Posko</SelectItem>
                <SelectItem value="warehouse_manager">Pengelola Gudang</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Floating/Contextual Batch Action Toolbar */}
        {selectedIds.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/10 p-2.5 text-xs">
            <div className="flex items-center gap-2 font-medium text-primary">
              <CheckCheck className="size-4" />
              <span>{selectedIds.size} akun dipilih untuk tindakan massal</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => setBatchRejectOpen(true)}
                className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <UserX className="size-3.5 mr-1" />
                Tolak Terpilih
              </Button>
              <Button
                size="sm"
                disabled={isPending}
                onClick={handleBatchApprove}
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="size-3.5 mr-1" />
                {isPending ? "Memproses..." : "Setujui Semua Terpilih"}
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground px-4">
            <div className="rounded-full bg-muted p-3 mb-3">
              <UserCheck className="size-6 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground text-sm">Tidak ada antrean verifikasi</p>
            <p className="text-xs max-w-sm mt-1">
              {pendingAccounts.length === 0
                ? "Semua personel dan relawan yang mendaftar telah diverifikasi atau tidak ada permohonan baru."
                : "Tidak ada data yang cocok dengan kriteria filter pencarian."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40 text-xs">
                <TableRow>
                  <TableHead className="w-10 px-3">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={handleToggleSelectAll}
                      className="size-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                      aria-label="Pilih semua baris"
                    />
                  </TableHead>
                  <TableHead className="py-3 font-semibold">Nama & Kontak</TableHead>
                  <TableHead className="py-3 font-semibold">Instansi / Organisasi</TableHead>
                  <TableHead className="py-3 font-semibold">Peran Diajukan</TableHead>
                  <TableHead className="py-3 font-semibold">Identitas / KTA</TableHead>
                  <TableHead className="py-3 font-semibold">Waktu Daftar</TableHead>
                  <TableHead className="py-3 text-right font-semibold pr-4">Aksi Verifikasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => {
                  const isSelected = selectedIds.has(account.id);
                  return (
                    <TableRow
                      key={account.id}
                      className={cn(
                        "text-xs transition-colors hover:bg-muted/50",
                        isSelected && "bg-primary/5"
                      )}
                    >
                      <TableCell className="px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(account.id)}
                          className="size-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                          aria-label={`Pilih ${account.fullName}`}
                        />
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar size="sm">
                            <AvatarFallback>{getInitials(account.fullName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground text-xs">{account.fullName}</p>
                            <p className="text-[11px] text-muted-foreground">{account.email}</p>
                            {account.phone && (
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1">
                                <Phone className="size-2.5" />
                                {account.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {account.organization ? (
                          <div className="inline-flex items-center gap-1 rounded-md border bg-secondary/60 px-2 py-0.5 text-[11px] font-medium">
                            <Building2 className="size-3 text-muted-foreground" />
                            {account.organization}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary text-[10px] font-semibold">
                          <Shield className="size-2.5 mr-1" />
                          {account.requestedRole ? roleLabel(account.requestedRole) : "Petugas Lapangan"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 max-w-[12rem] truncate">
                        {account.assignmentNote ? (
                          <span className="text-[11px] text-muted-foreground truncate block" title={account.assignmentNote}>
                            {account.assignmentNote}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px] italic">Tanpa catatan</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                        {account.createdAt}
                      </TableCell>
                      <TableCell className="py-3 text-right pr-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetailAccount(account)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            title="Lihat detail pendaftaran"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => setRejectAccount(account)}
                            className="h-7 text-[11px] border-destructive/30 text-destructive hover:bg-destructive/10 px-2"
                          >
                            <UserX className="size-3 mr-1" />
                            Tolak
                          </Button>
                          <Button
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleApprove(account)}
                            className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2.5"
                          >
                            <Check className="size-3 mr-1" />
                            Setujui
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Modal Detail Pendaftaran */}
      {detailAccount && (
        <Dialog open={Boolean(detailAccount)} onOpenChange={(open) => !open && setDetailAccount(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Detail Permohonan Akun</DialogTitle>
              <DialogDescription className="text-xs">
                Informasi personel dan bukti penugasan lapangan untuk verifikasi.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-3 gap-1 rounded-lg border bg-muted/30 p-3">
                <span className="text-muted-foreground">Nama Lengkap:</span>
                <span className="col-span-2 font-semibold text-foreground">{detailAccount.fullName}</span>

                <span className="text-muted-foreground">Email:</span>
                <span className="col-span-2 font-mono text-foreground">{detailAccount.email}</span>

                <span className="text-muted-foreground">No. Kontak:</span>
                <span className="col-span-2 font-mono text-foreground">{detailAccount.phone || "-"}</span>

                <span className="text-muted-foreground">Instansi:</span>
                <span className="col-span-2 font-medium text-foreground">{detailAccount.organization || "-"}</span>

                <span className="text-muted-foreground">Peran Diajukan:</span>
                <span className="col-span-2 font-semibold text-primary">
                  {detailAccount.requestedRole ? roleLabel(detailAccount.requestedRole) : "Petugas Lapangan"}
                </span>

                <span className="text-muted-foreground">Waktu Pengajuan:</span>
                <span className="col-span-2 text-foreground">{detailAccount.createdAt}</span>
              </div>

              {detailAccount.assignmentNote && (
                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                  <p className="font-semibold text-foreground">Catatan Penugasan / Identitas:</p>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{detailAccount.assignmentNote}</p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRejectAccount(detailAccount);
                  setDetailAccount(null);
                }}
                className="text-destructive border-destructive/30"
              >
                Tolak Pendaftaran
              </Button>
              <Button
                size="sm"
                onClick={() => handleApprove(detailAccount)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Setujui Akun Ini
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog Konfirmasi Penolakan Satuan */}
      {rejectAccount && (
        <Dialog open={Boolean(rejectAccount)} onOpenChange={(open) => !open && setRejectAccount(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base text-destructive flex items-center gap-2">
                <AlertCircle className="size-4" />
                Tolak Pendaftaran Akun?
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pendaftaran untuk <span className="font-semibold text-foreground">{rejectAccount.fullName}</span> ({rejectAccount.email}) akan ditolak dan tidak dapat login ke sistem.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="rejectReason" className="text-xs font-medium">
                Alasan Penolakan (Opsional)
              </Label>
              <Input
                id="rejectReason"
                placeholder="Contoh: Identitas KTA tidak sesuai / Surat tugas kadaluarsa"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="text-xs"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setRejectAccount(null)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={handleRejectConfirm}
              >
                {isPending ? "Memproses..." : "Konfirmasi Tolak"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog Konfirmasi Penolakan Massal */}
      {batchRejectOpen && (
        <Dialog open={batchRejectOpen} onOpenChange={setBatchRejectOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base text-destructive flex items-center gap-2">
                <AlertCircle className="size-4" />
                Tolak {selectedIds.size} Pendaftaran Akun Terpilih?
              </DialogTitle>
              <DialogDescription className="text-xs">
                Semua akun yang dicentang akan ditolak dan akses ke konsol operasi akan ditutup.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="batchRejectReason" className="text-xs font-medium">
                Alasan Penolakan Bersama (Opsional)
              </Label>
              <Input
                id="batchRejectReason"
                placeholder="Contoh: Verifikasi batch gagal / Di luar wilayah tanggap darurat aktif"
                value={batchRejectReason}
                onChange={(e) => setBatchRejectReason(e.target.value)}
                className="text-xs"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setBatchRejectOpen(false)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={handleBatchRejectConfirm}
              >
                {isPending ? "Memproses..." : `Tolak ${selectedIds.size} Akun`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
