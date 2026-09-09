/**
 * Utilitas geospasial dan perhitungan klastering laporan darurat
 */

export type Coordinates = {
  latitude: number;
  longitude: number;
};

/**
 * Menghitung jarak antara dua koordinat menggunakan formula Haversine (dalam meter)
 */
export function calculateDistanceMeters(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3; // Radius bumi dalam meter
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export type ConfidenceFactor = {
  hasGpsAccuracy: boolean;
  gpsAccuracyMeters?: number;
  hasPhoto: boolean;
  hasValidPhone: boolean;
  nearbyReportCount: number; // Laporan dari warga lain dalam radius 250m
  isWithinKnownDisasterZone: boolean;
};

/**
 * Menghitung Skor Kepercayaan Laporan (0 - 100%)
 * Untuk membedakan laporan riil genting dari potensi prank/iseng
 */
export function calculateConfidenceScore(factors: ConfidenceFactor): {
  score: number;
  grade: "tinggi" | "sedang" | "rendah";
  recommendation: "DISPOSISI_SAR" | "VERIFIKASI_TELEPON" | "ASESMEN_MOTOR_TRAIL";
} {
  let score = 0;

  // 1. GPS Akurasi Satelit (+25%)
  if (factors.hasGpsAccuracy) {
    if (factors.gpsAccuracyMeters && factors.gpsAccuracyMeters <= 30) {
      score += 25; // Akurasi tinggi satelit
    } else {
      score += 15; // Akurasi sedang seluler
    }
  }

  // 2. Berada di zona bencana aktif (+25%)
  if (factors.isWithinKnownDisasterZone) {
    score += 25;
  }

  // 3. Konvergensi Warga Sekitar (Radius 250m) (+35%)
  // Bila ada lebih dari 2 warga lain di area yang sama melapor, probabilitas keabsahan melonjak
  if (factors.nearbyReportCount >= 3) {
    score += 35;
  } else if (factors.nearbyReportCount >= 1) {
    score += 20;
  }

  // 4. Bukti Foto Kamera Langsung (+10%)
  if (factors.hasPhoto) {
    score += 10;
  }

  // 5. Nomor Kontak Valid / Merespons (+10%)
  if (factors.hasValidPhone) {
    score += 10;
  }

  score = Math.min(100, Math.max(10, score));

  if (score >= 75) {
    return {
      score,
      grade: "tinggi",
      recommendation: "DISPOSISI_SAR",
    };
  }

  if (score >= 45) {
    return {
      score,
      grade: "sedang",
      recommendation: "VERIFIKASI_TELEPON",
    };
  }

  return {
    score,
    grade: "rendah",
    recommendation: "ASESMEN_MOTOR_TRAIL",
  };
}
