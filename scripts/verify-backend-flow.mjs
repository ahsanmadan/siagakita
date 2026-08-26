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
const email = process.env.SIAGAKITA_E2E_EMAIL ?? "operator@siagakita.local";
const password = process.env.SIAGAKITA_E2E_PASSWORD ?? "SiagaKitaDemo2026!";
const keepData = process.env.SIAGAKITA_E2E_KEEP_DATA === "1";

if (!url || !anonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY belum ada di .env.local.");
}

const supabase = createClient(url, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function fail(message, details) {
  if (details) console.error(details);
  throw new Error(message);
}

async function expectOk(label, promise) {
  const result = await promise;
  if (result.error) fail(`${label} gagal: ${result.error.message}`, result.error);
  return result.data;
}

async function writeAudit(actorId, action, targetTable, targetId, beforeData, afterData) {
  await expectOk(
    `audit ${action}`,
    supabase.from("audit_logs").insert({
      actor_id: actorId,
      action,
      target_table: targetTable,
      target_id: targetId,
      before_data: beforeData ?? null,
      after_data: afterData ?? null,
    }),
  );
}

async function cleanupCreatedData({ report, event, shelter, allocation }) {
  const distributionItems = await expectOk(
    "cleanup ambil item distribusi",
    supabase.from("distribution_items").select("inventory_item_id, quantity").eq("distribution_id", allocation.distribution_id),
  );

  for (const item of distributionItems ?? []) {
    const current = await expectOk(
      "cleanup ambil stok",
      supabase.from("inventory_items").select("id, reserved").eq("id", item.inventory_item_id).single(),
    );
    await expectOk(
      "cleanup restore reserved stok",
      supabase
        .from("inventory_items")
        .update({ reserved: Math.max(0, Number(current.reserved ?? 0) - Number(item.quantity ?? 0)) })
        .eq("id", item.inventory_item_id),
    );
  }

  await expectOk("cleanup hapus item distribusi", supabase.from("distribution_items").delete().eq("distribution_id", allocation.distribution_id));
  await expectOk("cleanup hapus distribusi", supabase.from("distributions").delete().eq("id", allocation.distribution_id));
  await expectOk(
    "cleanup restore posko",
    supabase
      .from("shelters")
      .update({
        population_total: shelter.population_total,
        children: shelter.children,
        elderly: shelter.elderly,
        pregnant: shelter.pregnant,
        disability: shelter.disability,
      })
      .eq("id", shelter.id),
  );
  await expectOk("cleanup lepas relasi laporan-kejadian", supabase.from("field_reports").update({ event_id: null }).eq("id", report.id));
  await expectOk("cleanup hapus verifikasi laporan", supabase.from("report_verifications").delete().eq("report_id", report.id));
  await expectOk("cleanup hapus laporan jika policy mengizinkan", supabase.from("field_reports").delete().eq("id", report.id));
  await expectOk("cleanup hapus riwayat kejadian", supabase.from("event_status_history").delete().eq("event_id", event.id));
  await expectOk("cleanup hapus kejadian", supabase.from("disaster_events").delete().eq("id", event.id));

  const remainingReport = await expectOk("cleanup cek laporan tersisa", supabase.from("field_reports").select("id").eq("id", report.id).maybeSingle());
  return { reportDeleted: !remainingReport };
}

const startedAt = new Date().toISOString();
const suffix = Date.now().toString().slice(-6);

console.log("SiagaKita backend flow verification");
console.log(`Akun: ${email}`);

const auth = await supabase.auth.signInWithPassword({ email, password });
if (auth.error || !auth.data.user) fail(`Login gagal: ${auth.error?.message ?? "user kosong"}`);
console.log("PASS login Supabase Auth");

const profile = await expectOk(
  "ambil profil",
  supabase.from("profiles").select("id, full_name, app_role").eq("id", auth.data.user.id).single(),
);
if (!["admin", "bpbd_operator"].includes(profile.app_role)) {
  fail(`Akun ${email} harus admin/bpbd_operator untuk flow penuh, sekarang ${profile.app_role}.`);
}
console.log(`PASS role terbaca dari profiles: ${profile.app_role}`);

const report = await expectOk(
  "buat laporan",
  supabase
    .from("field_reports")
    .insert({
      code: `LPR-E2E-${suffix}`,
      channel: "Web",
      location: "Nagari Uji Backend, Sumatera Barat",
      reporter: "Verifier E2E SiagaKita",
      summary: "Uji flow backend end-to-end untuk laporan, verifikasi, kejadian, posko, stok, dan distribusi.",
      severity: "warning",
      created_by: profile.id,
    })
    .select("*")
    .single(),
);
await writeAudit(profile.id, "report.created", "field_reports", report.id, null, report);
console.log(`PASS buat laporan: ${report.code}`);

const verifiedReport = await expectOk(
  "verifikasi laporan",
  supabase.from("field_reports").update({ status: "diverifikasi" }).eq("id", report.id).select("*").single(),
);
await expectOk(
  "catat verifikasi laporan",
  supabase.from("report_verifications").insert({
    report_id: report.id,
    status: "diverifikasi",
    note: "Uji backend: laporan diverifikasi oleh operator.",
    verified_by: profile.id,
  }),
);
await writeAudit(profile.id, "report.verified", "field_reports", report.id, report, verifiedReport);
console.log("PASS verifikasi laporan");

const event = await expectOk(
  "buka kejadian",
  supabase
    .from("disaster_events")
    .insert({
      code: `EVT-E2E-${suffix}`,
      name: `Uji Backend SiagaKita ${suffix}`,
      disaster_type: "Uji operasional",
      location: verifiedReport.location,
      province: "Sumatera Barat",
      status: verifiedReport.severity,
      state: "active",
      escalation_level: "Kabupaten",
      latitude: -0.305,
      longitude: 100.369,
      affected_people: 0,
      active_shelters: 0,
      summary: verifiedReport.summary,
      created_by: profile.id,
    })
    .select("*")
    .single(),
);
await expectOk(
  "tautkan laporan ke kejadian",
  supabase.from("field_reports").update({ event_id: event.id, status: "ditindaklanjuti" }).eq("id", report.id).select("id").single(),
);
await expectOk(
  "catat riwayat status kejadian",
  supabase.from("event_status_history").insert({
    event_id: event.id,
    next_status: event.status,
    next_escalation: event.escalation_level,
    note: "Uji backend: kejadian dibuka dari laporan terverifikasi.",
    created_by: profile.id,
  }),
);
await writeAudit(profile.id, "event.opened_from_report", "disaster_events", event.id, null, { event, report_id: report.id });
console.log(`PASS buka kejadian: ${event.code}`);

const shelter = await expectOk(
  "ambil posko",
  supabase
    .from("shelters")
    .select("id, code, name, population_total, children, elderly, pregnant, disability")
    .order("last_update", { ascending: false })
    .limit(1)
    .single(),
);
const shelterUpdate = {
  population_total: Number(shelter.population_total ?? 0) + 1,
  children: Number(shelter.children ?? 0),
  elderly: Number(shelter.elderly ?? 0),
  pregnant: Number(shelter.pregnant ?? 0),
  disability: Number(shelter.disability ?? 0),
  last_update: new Date().toISOString(),
};
const updatedShelter = await expectOk(
  "update posko",
  supabase.from("shelters").update(shelterUpdate).eq("id", shelter.id).select("*").single(),
);
await expectOk(
  "catat histori populasi posko",
  supabase.from("shelter_population_updates").insert({
    shelter_id: shelter.id,
    population_total: updatedShelter.population_total,
    children: updatedShelter.children,
    elderly: updatedShelter.elderly,
    pregnant: updatedShelter.pregnant,
    disability: updatedShelter.disability,
    note: "Uji backend: pembaruan populasi via verifikasi flow.",
    created_by: profile.id,
  }),
);
await writeAudit(profile.id, "shelter.population_updated", "shelters", shelter.id, shelter, updatedShelter);
console.log(`PASS update posko: ${shelter.name}`);

const inventoryItems = await expectOk(
  "ambil stok",
  supabase.from("inventory_items").select("id, item, stock, reserved, unit").order("created_at").limit(50),
);
const inventoryItem = inventoryItems.find((item) => Number(item.stock ?? 0) - Number(item.reserved ?? 0) >= 1);
if (!inventoryItem) fail("Tidak ada stok dengan saldo tersedia minimal 1 untuk alokasi.");

const allocation = await expectOk(
  "alokasi stok atomik",
  supabase.rpc("allocate_distribution_atomic", {
    p_inventory_item_id: inventoryItem.id,
    p_shelter_code: shelter.code,
    p_quantity: 1,
    p_eta: "Uji backend hari ini",
    p_priority: "warning",
    p_notes: "Uji backend: alokasi atomik 1 unit.",
  }),
);
await writeAudit(profile.id, "distribution.allocated", "distributions", allocation.distribution_id, null, allocation);
console.log(`PASS alokasi stok atomik: ${allocation.distribution_code}`);

const distributionBefore = await expectOk(
  "ambil distribusi",
  supabase.from("distributions").select("*").eq("id", allocation.distribution_id).single(),
);
const distributionReceived = await expectOk(
  "konfirmasi diterima",
  supabase
    .from("distributions")
    .update({ status: "diterima", progress: 100 })
    .eq("id", allocation.distribution_id)
    .select("*")
    .single(),
);
await writeAudit(profile.id, "distribution.received", "distributions", allocation.distribution_id, distributionBefore, distributionReceived);
console.log("PASS konfirmasi distribusi diterima");

const auditLogs = await expectOk(
  "verifikasi audit log",
  supabase
    .from("audit_logs")
    .select("id, action")
    .gte("created_at", startedAt)
    .in("action", [
      "report.created",
      "report.verified",
      "event.opened_from_report",
      "shelter.population_updated",
      "distribution.allocated",
      "distribution.received",
    ]),
);
if ((auditLogs ?? []).length < 6) fail(`Audit log belum lengkap. Ditemukan ${auditLogs?.length ?? 0}/6.`);
console.log(`PASS audit log lengkap: ${auditLogs.length} catatan`);

if (keepData) {
  console.log("SKIP cleanup: SIAGAKITA_E2E_KEEP_DATA=1");
} else {
  const cleanup = await cleanupCreatedData({ report, event, shelter, allocation });
  console.log("PASS cleanup kejadian, distribusi, stok, dan posko E2E");
  if (!cleanup.reportDeleted) {
    console.log("WARN laporan E2E tersisa karena RLS tidak mengizinkan hard-delete laporan lewat akun operator.");
  }
}

await supabase.auth.signOut();
console.log("DONE backend flow nyata berhasil dijalankan.");
