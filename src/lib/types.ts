export type CrisisStatus = "critical" | "major" | "warning" | "safe";
export type ReportStatus = "baru" | "diverifikasi" | "ditindaklanjuti";
export type DistributionStatus = "disiapkan" | "dalam-perjalanan" | "diterima";

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

export interface Distribution {
  id: string;
  destination: string;
  origin: string;
  cargo: string;
  eta: string;
  progress: number;
  status: DistributionStatus;
  institution: string;
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
}
