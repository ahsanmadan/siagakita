export type AppRole =
  | "admin"
  | "bpbd_operator"
  | "field_officer"
  | "shelter_manager"
  | "warehouse_manager"
  | "public_viewer";

export interface CurrentProfile {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  avatar?: string | null;
}

export function roleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    admin: "Administrator",
    bpbd_operator: "Operator BPBD",
    field_officer: "Petugas Lapangan",
    shelter_manager: "Pengelola Posko",
    warehouse_manager: "Pengelola Gudang",
    public_viewer: "Publik",
  };
  return labels[role] ?? "Pengguna";
}
