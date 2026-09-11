export type CrisisStatus = "critical" | "major" | "warning" | "safe";
export type ReportStatus =
  | "baru"
  | "perlu_verifikasi"
  | "diverifikasi"
  | "duplikat"
  | "ditolak"
  | "ditindaklanjuti"
  | "dibuka_jadi_kejadian";
export type DistributionStatus =
  | "menunggu_alokasi"
  | "dialokasikan"
  | "disiapkan"
  | "berangkat"
  | "dalam_perjalanan"
  | "dalam-perjalanan"
  | "tertunda"
  | "tiba_di_posko"
  | "diterima_posko"
  | "diterima"
  | "selesai"
  | "dibatalkan";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DisasterEvent {
  dbId: string;
  id: string;
  name: string;
  type: string;
  location: string;
  province: string;
  status: CrisisStatus;
  escalationLevel: "Kabupaten" | "Provinsi" | "Nasional";
  updatedAt: string;
  updatedAtIso?: string;
  coordinates: Coordinates;
  affectedPeople: number;
  activeShelters: number;
  summary: string;
}

export interface AffectedPopulation {
  total: number;
  children: number;
  elderly: number;
  pregnant: number;
  disability: number;
}

export interface Need {
  id: string;
  item: string;
  category: string;
  requested: number;
  available: number;
  unit: string;
  urgency: CrisisStatus;
}

export interface Shelter {
  dbId: string;
  id: string;
  name: string;
  location: string;
  eventId: string;
  status: CrisisStatus;
  coordinates: Coordinates;
  capacity: number;
  population: AffectedPopulation;
  needs: Need[];
  lastUpdate: string;
  attachments?: OperationalAttachment[];
}

export interface Inventory {
  id: string;
  item: string;
  category: string;
  warehouse: string;
  level: "Posko" | "Kabupaten" | "Provinsi" | "Nasional";
  stock: number;
  reserved: number;
  unit: string;
  status: CrisisStatus;
}

export interface Vehicle {
  id: string;
  code: string;
  plateNumber: string;
  name: string;
  vehicleType: string;
  capacityWeightKg?: number | null;
  capacityVolumeM3?: number | null;
  capacityDescription?: string | null;
  warehouseId?: string | null;
  institutionId?: string | null;
  institutionName?: string | null;
  operationalStatus: "siap" | "bertugas" | "perbaikan" | "nonaktif";
  createdAt?: string;
  updatedAt?: string;
}

export interface Driver {
  id: string;
  profileId?: string | null;
  name: string;
  phoneNumber?: string | null;
  licenseNumber?: string | null;
  institutionId?: string | null;
  institutionName?: string | null;
  activeStatus: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DistributionVehicleAssignment {
  id: string;
  distributionId: string;
  vehicleId: string;
  driverId: string;
  assignedBy?: string | null;
  assignedAt: string;
  assignmentStatus: "aktif" | "selesai" | "dibatalkan" | "diganti";
  notes?: string | null;
  vehicle?: Vehicle | null;
  driver?: Driver | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryTrackingUpdate {
  id: string;
  distributionId: string;
  vehicleId?: string | null;
  driverId?: string | null;
  status: DistributionStatus;
  locationName?: string | null;
  latitude: number;
  longitude: number;
  accuracyMeter?: number | null;
  note?: string | null;
  source: "manual_driver" | "manual_petugas" | "checkpoint_posko" | "system";
  createdBy?: string | null;
  createdAt: string;
}

export type AttachmentVisibility = "internal" | "public_safe" | "restricted" | "private";

export interface OperationalAttachment {
  id: string;
  module: string;
  entityType: string;
  entityId: string;
  fileBucket: string;
  filePath: string;
  originalFileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  visibility: AttachmentVisibility;
  description?: string | null;
  caption?: string | null;
  metadata?: Record<string, unknown>;
  uploadedBy?: string | null;
  uploadedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProofOfDelivery {
  id: string;
  distributionId: string;
  shelterId: string;
  receivedBy: string;
  receivedByProfileId?: string | null;
  receivedAt: string;
  receiverNote?: string | null;
  proofPath?: string | null;
  attachmentId?: string | null;
  attachment?: OperationalAttachment | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface DistributionStatusHistory {
  id: string;
  distributionId: string;
  previousStatus?: DistributionStatus | null;
  nextStatus: DistributionStatus;
  note?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface DistributionCheckpoint {
  status: DistributionStatus | "checkpoint" | "tiba-posko";
  location: string;
  note?: string | null;
  updatedByRole: "driver" | "officer" | "shelter" | "system";
  createdAt: string;
}

export interface PublicDeliveryTracking {
  code: string;
  destinationShelter: string;
  cargoSummary: string;
  status: DistributionStatus;
  statusLabel: string;
  eta: string;
  progress: number;
  lastLocationName?: string | null;
  lastCoordinates?: Coordinates | null;
  lastUpdatedAt?: string | null;
}

export interface Distribution {
  id: string;
  destination: string;
  origin: string;
  cargo: string;
  eta: string;
  progress: number;
  status: DistributionStatus;
  institution: string;
  destinationShelterId?: string;
  originWarehouseId?: string;
  vehicleCode?: string;
  vehicleName?: string;
  vehiclePlateNumber?: string;
  driverName?: string;
  driverPhone?: string;
  lastLocationName?: string;
  lastCoordinates?: Coordinates | null;
  lastUpdatedAt?: string;
  lastUpdatedAtIso?: string;
  lastUpdatedByRole?: "driver" | "officer" | "shelter" | "system";
  driverNote?: string;
  checkpointHistory?: DistributionCheckpoint[];
  statusHistory?: DistributionStatusHistory[];
  latestAssignment?: DistributionVehicleAssignment | null;
  latestTrackingUpdate?: DeliveryTrackingUpdate | null;
  proofOfDelivery?: ProofOfDelivery | null;
  attachments?: OperationalAttachment[];
  isStale?: boolean;
}

export interface FieldReport {
  id: string;
  channel: "Web" | "SMS Zero-Grid" | "Petugas";
  location: string;
  reporter: string;
  receivedAt: string;
  receivedAtIso: string;
  summary: string;
  status: ReportStatus;
  severity: CrisisStatus;
  attachments?: OperationalAttachment[];
}

export interface Institution {
  id: string;
  name: string;
  role: string;
  activeTasks: number;
  contactStatus: "aktif" | "menunggu";
}

export interface AIRecommendation {
  id: string;
  eventId: string | null;
  shelterId: string | null;
  title: string;
  rationale: string;
  confidence: number;
  priority: CrisisStatus;
  action: string;
  factors: string[];
  source?: string;
}

export type SmsStatus = "pending" | "parsed" | "accepted" | "rejected" | "duplicate" | "failed";

export interface SmsParseResult {
  id?: string;
  messageId?: string;
  location: string | null;
  disasterType: string | null;
  severity: CrisisStatus | null;
  needsSummary: string | null;
  quantity: number | null;
  unit: string | null;
  reporterName: string | null;
  coordinates: Coordinates | null;
  confidenceScore: number;
  parserVersion: string;
  parseError: string | null;
  isAccepted: boolean;
  createdAt?: string;
}

export interface SmsMessage {
  id: string;
  senderPhone: string;
  rawMessage: string;
  receivedAt: string;
  gateway: string | null;
  status: SmsStatus;
  fieldReportId: string | null;
  createdAt: string;
  updatedAt: string;
  parseResult?: SmsParseResult | null;
}

export type AidRequestStatus =
  | "diajukan"
  | "ditinjau"
  | "sebagian_dialokasikan"
  | "dialokasikan"
  | "dalam_distribusi"
  | "terpenuhi"
  | "ditolak"
  | "dibatalkan";

export type AidAllocationStatus =
  | "dialokasikan"
  | "sebagian_dikirim"
  | "dikirim"
  | "diterima"
  | "dibatalkan";

export interface AidRequestItem {
  id: string;
  requestId: string;
  item: string;
  category: string;
  requestedQuantity: number;
  allocatedQuantity: number;
  fulfilledQuantity: number;
  unit: string;
  urgency: CrisisStatus;
  notes?: string | null;
  fulfillmentStatus: "menunggu" | "sebagian" | "dialokasikan" | "terpenuhi";
  legacyNeedId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AidAllocation {
  id: string;
  requestItemId: string;
  warehouseId: string;
  warehouseName?: string;
  inventoryItemId: string;
  inventoryItemName?: string;
  allocatedQuantity: number;
  allocationStatus: AidAllocationStatus;
  allocatedBy?: string | null;
  allocatedAt: string;
  distributionId?: string | null;
  distributionCode?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AidRequest {
  id: string;
  code: string;
  shelterId: string;
  shelterName?: string;
  eventId?: string | null;
  status: AidRequestStatus;
  priority: CrisisStatus;
  notes?: string | null;
  requestedBy?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: AidRequestItem[];
}
