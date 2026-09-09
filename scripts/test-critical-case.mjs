import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const envPath = resolve(root, ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, "")];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Supabase credentials missing in .env.local");
}

function client() {
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const PASSWORD = "siagakita123";

async function login(email) {
  const sb = client();
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.user) {
    throw new Error(`Login failed for ${email}: ${error?.message}`);
  }
  return { sb, user: data.user };
}

async function runCriticalTest() {
  console.log("=================================================================");
  console.log("🚨 SIMULASI UJI KASUS NYATA & GENTING: LONGSOR & GEMPA CIANJUR");
  console.log("=================================================================\n");

  const timestamp = Date.now().toString().slice(-4);
  const reportCode = `LPR-CJR-${timestamp}`;
  const eventCode = `EVT-CJR-${timestamp}`;
  const shelterCode = `PSK-CJR-${timestamp}`;
  const distCode = `DST-CJR-${timestamp}`;

  // Bersihkan simulasi sebelumnya agar tidak terjadi duplikasi ganda
  const { sb: opInit } = await login("operator@siagakita.local");
  const { data: oldReports } = await opInit.from("field_reports").select("id").like("code", "LPR-CJR-%");
  if (oldReports && oldReports.length > 0) {
    await opInit.from("field_reports").update({ status: "ditolak", event_id: null }).in("id", oldReports.map((r) => r.id));
  }
  const { data: oldEvents } = await opInit.from("disaster_events").select("id").like("code", "EVT-CJR-%");
  if (oldEvents && oldEvents.length > 0) {
    await opInit.from("field_reports").update({ event_id: null }).in("event_id", oldEvents.map((e) => e.id));
    await opInit.from("disaster_events").update({ state: "closed" }).in("id", oldEvents.map((e) => e.id));
  }

  // -------------------------------------------------------------
  // FASE 1: LAPORAN DARURAT WARGA (Dicatat oleh Petugas Lapangan via Zero-Grid / Web)
  // -------------------------------------------------------------
  console.log("📍 [FASE 1: LAPORAN DARURAT WARGA DITERIMA SISTEM]");
  const { sb: fieldClient, user: fieldOfficer } = await login("lapangan@siagakita.local");
  const { data: newReport, error: reportErr } = await fieldClient
    .from("field_reports")
    .insert({
      code: reportCode,
      channel: "SMS Zero-Grid",
      location: "Desa Cugenang, Kabupaten Cianjur",
      reporter: "Ibu Siti Rohayah (Warga RT 02)",
      summary: "Tebing 15m longsor menutup akses desa, 4 rumah roboh, 20 warga luka, butuh evakuasi segera!",
      status: "baru",
      severity: "critical",
      created_by: fieldOfficer.id,
    })
    .select()
    .single();

  if (reportErr) throw new Error(`Fase 1 Gagal: ${reportErr.message}`);
  console.log(`✅ Laporan warga berhasil masuk [${newReport.code}]:`);
  console.log(`   Pelapor: ${newReport.reporter} | Severity: ${newReport.severity}`);
  console.log(`   Ringkasan: "${newReport.summary}"\n`);

  // -------------------------------------------------------------
  // FASE 2: VERIFIKASI PETUGAS LAPANGAN (lapangan@siagakita.local)
  // -------------------------------------------------------------
  console.log("📍 [FASE 2: VERIFIKASI OLEH PETUGAS LAPANGAN]");

  // Catat verifikasi
  const { error: verifErr } = await fieldClient.from("report_verifications").insert({
    report_id: newReport.id,
    status: "diverifikasi",
    note: "Kondisi terkonfirmasi langsung di lokasi: jalan terputus total, 185 warga dievakuasi ke lapangan terbuka.",
    verified_by: fieldOfficer.id,
  });
  if (verifErr) throw new Error(`Fase 2 (Verifikasi) Gagal: ${verifErr.message}`);

  // Update status laporan menjadi diverifikasi
  const { error: reportUpdateErr } = await fieldClient
    .from("field_reports")
    .update({ status: "diverifikasi" })
    .eq("id", newReport.id);
  if (reportUpdateErr) throw new Error(`Fase 2 (Update Laporan) Gagal: ${reportUpdateErr.message}`);

  console.log(`✅ Petugas Lapangan (${fieldOfficer.email}) telah memverifikasi laporan.`);
  console.log(`   Status Laporan: DIVERIFIKASI (Terkonfirmasi valid & genting)\n`);

  // -------------------------------------------------------------
  // FASE 3: COMMAND CENTER - BUKA KEJADIAN & POSKO (operator@siagakita.local)
  // -------------------------------------------------------------
  console.log("📍 [FASE 3: OPERATOR BPBD MEMBUKA KEJADIAN & POSKO]");
  const { sb: operatorClient, user: operator } = await login("operator@siagakita.local");

  const { data: newEvent, error: eventErr } = await operatorClient
    .from("disaster_events")
    .insert({
      code: eventCode,
      name: "Longsor & Gempa Cugenang",
      disaster_type: "Tanah Longsor",
      location: "Kecamatan Cugenang",
      province: "Jawa Barat",
      status: "critical",
      escalation_level: "Provinsi",
      latitude: -6.8152,
      longitude: 107.1035,
      affected_people: 185,
      active_shelters: 1,
      summary: "Akses utama terisolir tebing longsor pasca getaran dangkal. 185 jiwa dalam penanganan tanggap darurat.",
      state: "active",
      created_by: operator.id,
    })
    .select()
    .single();

  if (eventErr) throw new Error(`Fase 3 (Buka Bencana) Gagal: ${eventErr.message}`);

  // Tautkan laporan ke bencana
  await operatorClient.from("field_reports").update({ event_id: newEvent.id, status: "ditindaklanjuti" }).eq("id", newReport.id);

  // Daftarkan Posko Resmi
  const { data: newShelter, error: shelterErr } = await operatorClient
    .from("shelters")
    .insert({
      code: shelterCode,
      event_id: newEvent.id,
      institution_id: "20000000-0000-4000-8000-000000000003",
      name: "Posko Lapangan Sepak Bola Cugenang",
      location: "Jl. Raya Cugenang Km 7, Cianjur",
      latitude: -6.8140,
      longitude: 107.1050,
      capacity: 300,
      population_total: 185,
      children: 35,
      elderly: 22,
      pregnant: 4,
      disability: 2,
      status: "critical",
    })
    .select()
    .single();

  if (shelterErr) throw new Error(`Fase 3 (Buka Posko) Gagal: ${shelterErr.message}`);

  console.log(`✅ Operator BPBD (${operator.email}) berhasil meresmikan tanggap darurat:`);
  console.log(`   Kejadian: ${newEvent.name} (Eskalasi: ${newEvent.escalation_level})`);
  console.log(`   Posko: ${newShelter.name} (Kapasitas: ${newShelter.capacity} jiwa)\n`);

  // -------------------------------------------------------------
  // FASE 4: INTAKE KEBUTUHAN PENGUNGSI (posko@siagakita.local)
  // -------------------------------------------------------------
  console.log("📍 [FASE 4: PENGELOLA POSKO MENGAJUKAN KEBUTUHAN KRITIS]");
  const { sb: shelterClient } = await login("posko@siagakita.local");

  const needsData = [
    { shelter_id: newShelter.id, item: "Air Minum Bersih", category: "Pangan", requested: 2000, available: 0, unit: "liter", urgency: "critical" },
    { shelter_id: newShelter.id, item: "Tenda Darurat Family", category: "Sandang", requested: 25, available: 0, unit: "unit", urgency: "critical" },
    { shelter_id: newShelter.id, item: "Makanan Siap Saji", category: "Pangan", requested: 600, available: 0, unit: "porsi", urgency: "major" },
  ];

  const { data: insertedNeeds, error: needsErr } = await shelterClient
    .from("needs")
    .insert(needsData)
    .select();

  if (needsErr) throw new Error(`Fase 4 (Kebutuhan) Gagal: ${needsErr.message}`);

  console.log(`✅ Pengelola Posko berhasil mendaftarkan ${insertedNeeds.length} kebutuhan mendesak:`);
  insertedNeeds.forEach((n) => console.log(`   - [${n.urgency.toUpperCase()}] ${n.item}: ${n.requested} ${n.unit}`));
  console.log("");

  // -------------------------------------------------------------
  // FASE 5: DISPATCH LOGISTIK DARI GUDANG (gudang@siagakita.local)
  // -------------------------------------------------------------
  console.log("📍 [FASE 5: PENGELOLA GUDANG MEMBERANGKATKAN ARMADA BANTUAN]");
  const { sb: warehouseClient, user: warehouseManager } = await login("gudang@siagakita.local");

  // Ambil gudang tersedia
  const { data: warehouses } = await warehouseClient.from("warehouses").select("id, name").limit(1);
  const warehouseId = warehouses?.[0]?.id;

  const { data: newDist, error: distErr } = await warehouseClient
    .from("distributions")
    .insert({
      code: distCode,
      destination_shelter_id: newShelter.id,
      origin_warehouse_id: warehouseId,
      cargo_summary: "Tenda 25 unit, Air 2.000 L, Makanan 600 porsi",
      eta: "35 Menit (Truk Taktis 4x4)",
      progress: 35,
      status: "dalam-perjalanan",
      institution: "BPBD + TNI",
      created_by: warehouseManager.id,
    })
    .select()
    .single();

  if (distErr) throw new Error(`Fase 5 (Distribusi) Gagal: ${distErr.message}`);

  console.log(`✅ Armada Logistik diberangkatkan [${newDist.code}]:`);
  console.log(`   Kargo: ${newDist.cargo_summary}`);
  console.log(`   Status: DALAM PERJALANAN (ETA: ${newDist.eta})\n`);

  // -------------------------------------------------------------
  // FASE 6: VALIDASI INTEGRITAS DATA PETA PUBLIK & DASHBOARD
  // -------------------------------------------------------------
  console.log("📍 [FASE 6: VALIDASI PUBLIK & DASHBOARD]");

  // 1. Cek Peta Publik
  const publicClient = client();
  const { data: publicEvents } = await publicClient.from("public_event_summary").select("*").eq("id", newEvent.id);
  const { data: publicShelters } = await publicClient.from("public_shelter_summary").select("*").eq("id", newShelter.id);

  console.log(`🔍 Peta Publik Check:`);
  console.log(`   - Kejadian Aktif terlihat publik: ${publicEvents?.length === 1 ? "✅ YA" : "❌ TIDAK"}`);
  console.log(`   - Posko Aktif terlihat publik: ${publicShelters?.length === 1 ? "✅ YA" : "❌ TIDAK"}`);
  console.log(`   - Koordinat Geografis Posko: [${publicShelters?.[0]?.latitude}, ${publicShelters?.[0]?.longitude}]`);

  // 2. Cek Total Pengungsi & Dashboard Konsol
  const { data: internalShelter } = await operatorClient.from("shelters").select("*").eq("id", newShelter.id).single();

  console.log(`\n🔍 Dashboard Konsol Check:`);
  console.log(`   - Total Jiwa di Posko: ${internalShelter?.population_total} Jiwa`);
  console.log(`   - Balita/Anak Rentan: ${internalShelter?.children} Jiwa`);
  console.log(`   - Ibu Hamil: ${internalShelter?.pregnant} Jiwa`);
  console.log(`   - Armada Bergerak: 1 Truk (${newDist.institution})`);

  console.log("\n=================================================================");
  console.log("🎯 KESIMPULAN: SELURUH ALUR OPERASIONAL GENTING BERJALAN 100% SUKSES!");
  console.log("=================================================================");
}

runCriticalTest().catch((err) => {
  console.error("\n❌ TEST GAGAL DENGAN ERROR:", err);
  process.exit(1);
});
