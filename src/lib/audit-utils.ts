export type AuditSeverity = "info" | "important" | "notice" | "warning" | "critical";

export type WriteAuditLogParams = {
  actorId: string;
  action: string;
  targetTable: string;
  targetId?: string | null;
  summary?: string;
  severity?: AuditSeverity;
  actorRole?: string;
  institutionId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  source?: string;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: Record<string, unknown>;
};

// ── Sensitive Data Masking Utility ──────────────────────────────────
function maskString(val: string, keyName: string): string {
  if (keyName.includes("password") || keyName.includes("token") || keyName.includes("secret")) {
    return "***MASKED***";
  }
  if (
    keyName.includes("phone") ||
    keyName.includes("telepon") ||
    keyName.includes("hp") ||
    keyName.includes("sim") ||
    keyName.includes("license")
  ) {
    if (val.length >= 7) {
      return `${val.slice(0, 4)}****${val.slice(-3)}`;
    }
    return "***MASKED***";
  }
  if (keyName === "raw_message" && val.length > 80) {
    return `${val.slice(0, 77)}...`;
  }
  return val;
}

export function maskAuditPayload<T>(payload: T): T {
  if (!payload || typeof payload !== "object") return payload;

  if (Array.isArray(payload)) {
    return payload.map((item) => maskAuditPayload(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (typeof value === "string") {
      result[key] = maskString(value, lowerKey);
    } else if (value && typeof value === "object") {
      result[key] = maskAuditPayload(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

// ── Default Severity Classifier ─────────────────────────────────────
export function resolveAuditSeverity(action: string): AuditSeverity {
  if (
    action === "event.escalated" ||
    action === "event.opened_from_report" ||
    action === "report.rejected" ||
    action === "account.rejected" ||
    action === "account.batch_rejected"
  ) {
    return "critical";
  }

  if (
    action === "distribution.delayed" ||
    action === "report.marked_duplicate" ||
    action === "sms.rejected" ||
    action === "sms.marked_duplicate" ||
    action === "aid_request.rejected" ||
    action === "attachment.deleted" ||
    action === "attachment.visibility_changed"
  ) {
    return "warning";
  }

  if (
    action === "report.verified" ||
    action === "report.followed_up" ||
    action === "aid_request.allocated" ||
    action === "aid_request.partially_fulfilled" ||
    action === "aid_request.fulfilled" ||
    action === "aid_allocation.created" ||
    action === "aid_allocation.delivered" ||
    action === "distribution.received" ||
    action === "distribution.arrived" ||
    action === "distribution.vehicle_assigned" ||
    action === "distribution.checkpoint_updated" ||
    action === "distribution.location_updated" ||
    action === "shelter.population_updated" ||
    action === "proof_of_delivery.confirmed" ||
    action === "attachment.uploaded" ||
    action === "attachment.proof_attached" ||
    action === "attachment.replaced" ||
    action === "attachment.metadata_updated" ||
    action === "account.verified" ||
    action === "account.batch_verified"
  ) {
    return "important";
  }

  return "info";
}

// ── Natural Indonesian Summary Generator ────────────────────────────
export function generateAuditSummary(
  action: string,
  targetTable: string,
  afterData?: unknown,
  beforeData?: unknown
): string {
  const after = (afterData as Record<string, unknown>) || {};
  const before = (beforeData as Record<string, unknown>) || {};

  switch (action) {
    case "event.escalated":
      return `Eskalasi bencana ditingkatkan ke ${after.escalation_level || after.escalationLevel || "level baru"}.`;
    case "event.opened_from_report":
      return `Kejadian bencana resmi dibuka dari laporan: ${after.name || after.title || "Bencana"}.`;
    case "report.created":
      return `Laporan situasi diterima via ${after.channel || "lapangan"} di ${after.location || "lokasi"}.`;
    case "report.needs_verification":
      return "Laporan ditandai membutuhkan verifikasi lanjutan oleh petugas.";
    case "report.verified":
      return "Laporan situasi lapangan dikonfirmasi valid oleh petugas.";
    case "report.followed_up":
      return "Laporan situasi lapangan masuk respon penanganan tim operasi.";
    case "report.marked_duplicate":
      return "Laporan ditandai sebagai duplikat dari laporan serupa.";
    case "report.rejected":
      return "Laporan ditolak setelah peninjauan triase operasional.";
    case "report.converted_to_event":
      return "Laporan situasi resmi dijadikan kejadian bencana aktif.";
    case "report.ai_triaged_groq":
      return `Triase otomatis AI: urgensi ${after.urgency || after.severity || "dianalisis"}.`;

    case "sms.received_and_parsed":
      return "SMS Zero-Grid darurat diterima dan diekstraksi ke sistem.";
    case "sms.accepted":
      return "SMS darurat disetujui menjadi laporan lapangan resmi.";
    case "sms.edited_and_accepted":
      return "SMS darurat disesuaikan operator lalu disetujui.";
    case "sms.rejected":
      return "SMS darurat ditolak (tidak relevan/fiktif).";
    case "sms.marked_duplicate":
      return "SMS darurat ditandai duplikasi informasi serupa.";

    case "aid_request.submitted":
      return "Pengajuan kebutuhan bantuan logistik posko diajukan.";
    case "aid_request.reviewed":
      return "Pengajuan bantuan posko telah ditinjau operator.";
    case "aid_request.rejected":
      return "Pengajuan bantuan logistik posko ditolak.";
    case "aid_request.allocated":
      return "Alokasi logistik posko disetujui dari stok gudang.";
    case "aid_request.partially_fulfilled":
      return "Sebagian kebutuhan logistik posko telah dialokasikan.";
    case "aid_request.fulfilled":
      return "Seluruh kebutuhan logistik posko selesai dialokasikan.";
    case "aid_allocation.created":
      return "Alokasi stok logistik gudang ke posko dicatat.";
    case "aid_allocation.delivered":
      return "Alokasi barang bantuan diterima posko tujuan.";

    case "shelter.created":
      return `Posko pengungsian baru didaftarkan: ${after.name || "Posko"}.`;
    case "shelter.population_updated":
      return `Populasi pengungsi posko diperbarui: total ${after.population_total || after.total || "0"} jiwa.`;
    case "need.requested":
      return `Permintaan kebutuhan posko diajukan: ${after.item || "bantuan"}.`;

    case "distribution.created":
      return `Distribusi logistik armada ${after.code || ""} dibuat.`;
    case "distribution.allocated":
      return "Alokasi muatan logistik armada telah disetujui.";
    case "distribution.vehicle_assigned":
      return `Armada dan pengemudi ditugaskan ke distribusi ${after.code || ""}.`;
    case "distribution.location_updated":
    case "distribution.checkpoint_updated":
      return `Lokasi terakhir diperbarui: ${after.last_location_name || after.location || "titik perjalanan"}.`;
    case "distribution.delayed":
      return `Distribusi logistik tertunda: ${after.driver_note || after.note || "kendala perjalanan"}.`;
    case "distribution.arrived":
      return "Armada distribusi logistik tiba di posko tujuan.";
    case "distribution.status_updated":
      return `Status distribusi diperbarui dari ${before.status || "awal"} ke ${after.status || "baru"}.`;
    case "distribution.received":
      return "Muatan logistik distribusi selesai diserahterimakan di posko.";
    case "proof_of_delivery.confirmed":
      return "Tanda terima bantuan (Proof of Delivery) dikonfirmasi posko.";

    case "attachment.uploaded":
      return `Berkas bukti diunggah untuk ${targetTable}: ${(after.original_file_name as string) || (after.file_path as string) || "lampiran"}.`;
    case "attachment.replaced":
      return `Berkas bukti lampiran diperbarui pada ${targetTable}.`;
    case "attachment.metadata_updated":
      return `Keterangan lampiran diperbarui pada ${targetTable}.`;
    case "attachment.deleted":
      return `Berkas bukti lampiran dihapus dari ${targetTable}.`;
    case "attachment.visibility_changed":
      return `Visibilitas berkas lampiran diubah menjadi ${after.visibility || "baru"}.`;
    case "attachment.proof_attached":
      return "Dokumen serah terima bantuan (Proof of Delivery) berhasil dilampirkan.";

    case "third_party_aid.created":
      return `Bantuan pihak ketiga dicatat dari ${after.source_name || "donatur"}.`;
    case "third_party_aid.received_at_warehouse":
      return "Bantuan pihak ketiga diverifikasi dan masuk gudang.";
    case "third_party_aid.allocated":
      return "Bantuan pihak ketiga dialokasikan ke posko.";

    case "auth.registered_pending":
      return "Registrasi akun baru menunggu persetujuan operator.";
    case "account.verified":
      return "Akun petugas operasional diaktifkan.";
    case "account.rejected":
      return "Permohonan akun pengguna ditolak.";
    case "account.batch_verified":
      return "Verifikasi massal aktivasi akun petugas.";
    case "account.batch_rejected":
      return "Penolakan massal akun pengguna.";

    default:
      return `${action.replace(/\./g, " ").replace(/_/g, " ")} pada ${targetTable}`;
  }
}
