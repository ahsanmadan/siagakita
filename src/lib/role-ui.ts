import type { AppRole } from "@/lib/auth-types";
import type { NavItemId } from "@/navigation/sidebar/sidebar-items";

export type NavigationKey = NavItemId;

export function roleMission(role: AppRole) {
  const missions: Record<AppRole, string> = {
    admin: "Mengawasi sistem, aktivitas audit, dan ringkasan akun operasional.",
    bpbd_operator: "Pusat koordinasi untuk verifikasi, pembukaan kejadian, kebutuhan kritis, dan distribusi bantuan.",
    field_officer: "Mencatat laporan lapangan dan memantau status tindak lanjut laporan.",
    shelter_manager: "Memperbarui kondisi posko, populasi pengungsi, kelompok rentan, dan kebutuhan bantuan.",
    warehouse_manager: "Memantau stok, permintaan bantuan, dan distribusi menuju posko.",
    driver: "Memperbarui status pengiriman dan lokasi terakhir armada distribusi logistik.",
    institution_partner: "Kolaborasi bantuan logistik dan pemantauan distribusi instansi mitra.",
    public_viewer: "Melihat informasi publik aman terkait kejadian dan posko.",
  };
  return missions[role];
}

export function roleNavigation(role: AppRole): NavItemId[] {
  const navigation: Record<AppRole, NavItemId[]> = {
    admin: ["dashboard", "events", "reports", "shelters", "logistics", "audit", "accounts", "publicMap"],
    bpbd_operator: ["dashboard", "events", "reports", "shelters", "logistics", "audit", "accounts", "publicMap"],
    field_officer: ["dashboard", "reports", "publicMap"],
    shelter_manager: ["dashboard", "shelters", "publicMap"],
    warehouse_manager: ["dashboard", "logistics", "shelters", "publicMap"],
    driver: ["dashboard", "logistics", "publicMap"],
    institution_partner: ["dashboard", "logistics", "shelters", "publicMap"],
    public_viewer: ["publicMap"],
  };
  return navigation[role] ?? ["dashboard", "publicMap"];
}

export function roleCapabilities(role: AppRole) {
  return {
    canCreateReport: ["admin", "bpbd_operator", "field_officer"].includes(role),
    canVerifyReport: ["admin", "bpbd_operator"].includes(role),
    canRejectReport: ["admin", "bpbd_operator"].includes(role),
    canOpenIncident: ["admin", "bpbd_operator"].includes(role),
    canRegisterShelter: ["admin", "bpbd_operator"].includes(role),
    canUpdateShelter: ["admin", "bpbd_operator", "shelter_manager"].includes(role),
    canManageDistribution: ["admin", "bpbd_operator", "warehouse_manager"].includes(role),
    canViewAudit: ["admin", "bpbd_operator"].includes(role),
    isCoordinator: ["admin", "bpbd_operator"].includes(role),
    canManagePartnerAid: ["admin", "bpbd_operator", "warehouse_manager", "institution_partner"].includes(role),
  };
}
