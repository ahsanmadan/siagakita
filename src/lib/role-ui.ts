import type { AppRole } from "@/lib/auth";

export type NavigationKey = "dashboard" | "events" | "shelters" | "logistics" | "reports" | "audit" | "publicMap";

export function roleMission(role: AppRole) {
  const missions: Record<AppRole, string> = {
    admin: "Mengawasi sistem, aktivitas audit, dan ringkasan akun operasional.",
    bpbd_operator: "Pusat koordinasi untuk verifikasi, pembukaan kejadian, kebutuhan kritis, dan distribusi bantuan.",
    field_officer: "Mencatat laporan lapangan dan memantau status tindak lanjut laporan.",
    shelter_manager: "Memperbarui kondisi posko, populasi pengungsi, kelompok rentan, dan kebutuhan bantuan.",
    warehouse_manager: "Memantau stok, permintaan bantuan, dan distribusi menuju posko.",
    public_viewer: "Melihat informasi publik aman terkait kejadian dan posko.",
  };
  return missions[role];
}

export function roleNavigation(role: AppRole): NavigationKey[] {
  const navigation: Record<AppRole, NavigationKey[]> = {
    admin: ["dashboard", "audit", "publicMap"],
    bpbd_operator: ["dashboard", "events", "reports", "shelters", "logistics", "audit", "publicMap"],
    field_officer: ["dashboard", "reports", "publicMap"],
    shelter_manager: ["dashboard", "shelters", "publicMap"],
    warehouse_manager: ["dashboard", "logistics", "shelters", "publicMap"],
    public_viewer: ["publicMap"],
  };
  return navigation[role];
}

export function roleCapabilities(role: AppRole) {
  return {
    canCreateReport: ["bpbd_operator", "field_officer"].includes(role),
    canVerifyReport: role === "bpbd_operator",
    canOpenIncident: role === "bpbd_operator",
    canUpdateShelter: ["bpbd_operator", "shelter_manager"].includes(role),
    canManageDistribution: ["bpbd_operator", "warehouse_manager"].includes(role),
    canViewAudit: ["admin", "bpbd_operator"].includes(role),
    isCoordinator: role === "bpbd_operator",
  };
}
