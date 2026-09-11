export type AppRole =
  | "admin"
  | "bpbd_operator"
  | "field_officer"
  | "shelter_manager"
  | "warehouse_manager"
  | "driver"
  | "institution_partner"
  | "public_viewer";

export type VerificationStatus = "verified" | "pending" | "rejected";

export interface CurrentProfile {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  avatar?: string | null;
  verificationStatus?: VerificationStatus;
  organization?: string | null;
  requestedRole?: AppRole | null;
}

export function roleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    admin: "Administrator",
    bpbd_operator: "Operator BPBD",
    field_officer: "Petugas Lapangan",
    shelter_manager: "Pengelola Posko",
    warehouse_manager: "Pengelola Gudang",
    driver: "Pengemudi Armada",
    institution_partner: "Mitra Instansi / Lembaga",
    public_viewer: "Publik",
  };
  return labels[role] ?? "Pengguna";
}
