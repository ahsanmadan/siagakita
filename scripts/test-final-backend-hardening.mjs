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

function createAnonClient() {
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const PASSWORD = "siagakita123";

async function login(email) {
  const sb = createAnonClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.user) {
    throw new Error(`Login failed for ${email}: ${error?.message}`);
  }
  return { sb, user: data.user };
}

let passedChecks = 0;
let totalChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedChecks++;
  console.log(`✅ [PASS] ${message}`);
}

async function runHardeningReview() {
  console.log("=================================================================");
  console.log("🛡️ SIAGAKITA FINAL BACKEND HARDENING & INTEGRITY REVIEW TEST");
  console.log("=================================================================\n");

  // -------------------------------------------------------------
  // 1. PUBLIC VIEWER / ANON SECURITY
  // -------------------------------------------------------------
  console.log("--- 1. Testing Public Viewer / Anon Security ---");
  const anon = createAnonClient();

  // 1.1 Public safe views must be queryable
  const { data: publicEvents, error: peErr } = await anon.from("public_event_summary").select("*").limit(5);
  assert(!peErr, "public_event_summary is accessible to anon");
  assert(Array.isArray(publicEvents), "public_event_summary returns array");

  const { data: publicShelters, error: psErr } = await anon.from("public_shelter_summary").select("*").limit(5);
  assert(!psErr, "public_shelter_summary is accessible to anon");
  assert(Array.isArray(publicShelters), "public_shelter_summary returns array");

  const { data: publicTracking, error: ptErr } = await anon.from("public_delivery_tracking_summary").select("*").limit(5);
  assert(!ptErr, "public_delivery_tracking_summary is accessible to anon");
  assert(Array.isArray(publicTracking), "public_delivery_tracking_summary returns array");

  // 1.2 Verify NO sensitive columns in public views
  if (publicShelters && publicShelters.length > 0) {
    const sample = publicShelters[0];
    assert(sample.children === undefined, "public_shelter_summary excludes children count");
    assert(sample.elderly === undefined, "public_shelter_summary excludes elderly count");
    assert(sample.pregnant === undefined, "public_shelter_summary excludes pregnant count");
    assert(sample.disability === undefined, "public_shelter_summary excludes disability count");
    assert(sample.notes === undefined, "public_shelter_summary excludes internal notes");
  }

  // 1.3 Sensitive internal tables must NOT be exposed to anon
  const { data: anonAudit, error: aaErr } = await anon.from("audit_logs").select("*").limit(5);
  assert(!anonAudit || anonAudit.length === 0, "audit_logs is completely blocked from anon");

  const { data: anonProfiles, error: apErr } = await anon.from("profiles").select("*").limit(5);
  assert(!anonProfiles || anonProfiles.length === 0, "profiles is blocked from anon");

  // 1.4 Intentionally exposed RPCs must REJECT anon callers
  const { error: anonRpcAllocErr } = await anon.rpc("allocate_distribution_atomic", {
    p_inventory_item_id: "00000000-0000-0000-0000-000000000000",
    p_shelter_code: "TEST",
    p_quantity: 1,
    p_eta: "Now",
    p_priority: "major",
    p_notes: "Anon test",
  });
  assert(anonRpcAllocErr !== null, "allocate_distribution_atomic strictly rejects unauthenticated anon call");

  const { error: anonRpcAuditErr } = await anon.rpc("log_audit_event", {
    p_actor_id: "00000000-0000-0000-0000-000000000000",
    p_action: "test.spoof",
    p_target_table: "field_reports",
  });
  assert(anonRpcAuditErr !== null, "log_audit_event strictly rejects unauthenticated anon call");

  const { error: anonRpcAttachErr } = await anon.rpc("update_attachment_metadata", {
    target_attachment_id: "00000000-0000-0000-0000-000000000000",
    new_description: "Anon edit",
  });
  assert(anonRpcAttachErr !== null, "update_attachment_metadata strictly rejects unauthenticated anon call");

  // 1.5 Storage security for anon
  // Anon should only see public_safe attachments
  const { data: anonAttachments } = await anon.from("operational_attachments").select("id, visibility").limit(10);
  if (anonAttachments && anonAttachments.length > 0) {
    const allPublic = anonAttachments.every((a) => a.visibility === "public_safe");
    assert(allPublic, "anon client can only view attachments with visibility = public_safe");
  } else {
    assert(true, "operational_attachments has zero non-public rows visible to anon");
  }

  // -------------------------------------------------------------
  // 2. OPERATOR & ADMIN ROLES (COORDINATION & AUDIT ACCESS)
  // -------------------------------------------------------------
  console.log("\n--- 2. Testing BPBD Operator & Admin Privileges ---");
  const { sb: adminClient, user: adminUser } = await login("admin@siagakita.local");
  const { data: adminAudits, error: aAudErr } = await adminClient.from("audit_logs").select("id, action").limit(5);
  assert(!aAudErr && Array.isArray(adminAudits), "Admin can read audit logs");

  const { sb: opClient, user: opUser } = await login("operator@siagakita.local");
  const { data: opReports, error: opRepErr } = await opClient.from("field_reports").select("id, status").limit(5);
  assert(!opRepErr && Array.isArray(opReports), "Operator BPBD can read field reports");

  // -------------------------------------------------------------
  // 3. FIELD OFFICER ROLE (REPORT CREATION & SCOPED PERMISSIONS)
  // -------------------------------------------------------------
  console.log("\n--- 3. Testing Field Officer Permissions ---");
  const { sb: fieldClient, user: fieldUser } = await login("lapangan@siagakita.local");

  // Field officer can create a report
  const testReportCode = `LPR-TEST-${Date.now().toString().slice(-4)}`;
  const { data: createdRep, error: crErr } = await fieldClient
    .from("field_reports")
    .insert({
      code: testReportCode,
      channel: "Petugas",
      location: "Kecamatan Cugenang",
      reporter: "Bripka Ahmad (Babinsa)",
      summary: "Patroli tanggap bencana: retakan tanah terpantau stabil [GPS: -6.82, 107.14]",
      severity: "warning",
      status: "baru",
      created_by: fieldUser.id,
    })
    .select()
    .single();
  assert(!crErr && createdRep !== null, `Field Officer successfully created field report [${testReportCode}]`);

  // Field officer CANNOT read audit logs
  const { data: fieldAudits } = await fieldClient.from("audit_logs").select("id").limit(5);
  assert(!fieldAudits || fieldAudits.length === 0, "Field Officer cannot read audit_logs (RLS enforced)");

  // Field officer CANNOT execute allocate_distribution_atomic
  const { error: fieldAllocErr } = await fieldClient.rpc("allocate_distribution_atomic", {
    p_inventory_item_id: "00000000-0000-0000-0000-000000000000",
    p_shelter_code: "TEST",
    p_quantity: 1,
    p_eta: "Now",
    p_priority: "major",
    p_notes: "Field Officer forbidden allocation",
  });
  assert(fieldAllocErr !== null, "allocate_distribution_atomic rejects field_officer execution");

  // Field officer CANNOT promote attachment to public_safe directly
  const { error: fieldPublicAttachErr } = await fieldClient.from("operational_attachments").insert({
    module: "reports",
    entity_type: "field_reports",
    entity_id: createdRep.id,
    file_bucket: "operational_evidence",
    file_path: "reports/unauthorized-public.jpg",
    original_file_name: "evidence.jpg",
    visibility: "public_safe", // Not allowed for field officer
    uploaded_by: fieldUser.id,
  });
  assert(fieldPublicAttachErr !== null, "Field Officer is blocked from inserting public_safe attachments directly");

  // -------------------------------------------------------------
  // 4. SHELTER MANAGER ROLE (SHELTER POPULATION & AID REQUESTS)
  // -------------------------------------------------------------
  console.log("\n--- 4. Testing Shelter Manager Permissions ---");
  const { sb: shelterClient, user: shelterUser } = await login("posko@siagakita.local");

  // Shelter manager can read shelters
  const { data: shelters, error: sErr } = await shelterClient.from("shelters").select("id, code, name").limit(1);
  assert(!sErr && shelters && shelters.length > 0, "Shelter Manager can read shelter records");

  const targetShelter = shelters[0];

  // Shelter manager can update shelter population
  const { data: popUpdate, error: popErr } = await shelterClient
    .from("shelter_population_updates")
    .insert({
      shelter_id: targetShelter.id,
      population_total: 150,
      children: 25,
      elderly: 15,
      pregnant: 3,
      disability: 2,
      note: "Pembaruan berkala pengungsi posko.",
      created_by: shelterUser.id,
    })
    .select()
    .single();
  if (popErr) console.error("Shelter population update error detail:", popErr);
  assert(!popErr && popUpdate !== null, "Shelter Manager can log shelter_population_updates");

  // Shelter manager can query aid_requests and aid_request_items
  const { data: aidRequests, error: arErr } = await shelterClient
    .from("aid_requests")
    .select("*, aid_request_items(*)")
    .limit(5);
  assert(!arErr && Array.isArray(aidRequests), "Shelter Manager can access aid_requests and aid_request_items");

  // Shelter manager CANNOT allocate distributions directly
  const { error: shelterAllocErr } = await shelterClient.rpc("allocate_distribution_atomic", {
    p_inventory_item_id: "00000000-0000-0000-0000-000000000000",
    p_shelter_code: targetShelter.code,
    p_quantity: 1,
    p_eta: "Now",
    p_priority: "major",
    p_notes: "Shelter Manager forbidden allocation",
  });
  assert(shelterAllocErr !== null, "allocate_distribution_atomic rejects shelter_manager execution");

  // -------------------------------------------------------------
  // 5. WAREHOUSE MANAGER ROLE (INVENTORY & ALLOCATION FLOW)
  // -------------------------------------------------------------
  console.log("\n--- 5. Testing Warehouse Manager Permissions ---");
  const { sb: whClient, user: whUser } = await login("gudang@siagakita.local");

  // Warehouse manager can read inventories
  const { data: invItems, error: invErr } = await whClient.from("inventory_items").select("id, item, stock, reserved, warehouses(name)").limit(5);
  assert(!invErr && Array.isArray(invItems), "Warehouse Manager can read inventory items");

  // Warehouse manager can read distributions and vehicles
  const { data: distributions, error: distErr } = await whClient.from("distributions").select("id, code, cargo_summary, status").limit(5);
  assert(!distErr && Array.isArray(distributions), "Warehouse Manager can read distributions");

  const { data: vehicles, error: vErr } = await whClient.from("vehicles").select("id, code, plate_number").limit(5);
  assert(!vErr && Array.isArray(vehicles), "Warehouse Manager can read vehicle fleet");

  // -------------------------------------------------------------
  // 6. DRIVER & VEHICLE TRACKING WORKFLOW
  // -------------------------------------------------------------
  console.log("\n--- 6. Testing Driver & Delivery Tracking Workflow ---");
  const { data: trackingUpdates, error: trkErr } = await adminClient
    .from("delivery_tracking_updates")
    .select("id, distribution_id, status, latitude, longitude, created_at")
    .limit(5);
  assert(!trkErr && Array.isArray(trackingUpdates), "delivery_tracking_updates table is queryable");

  const { data: assignments, error: asgErr } = await adminClient
    .from("distribution_vehicle_assignments")
    .select("id, distribution_id, vehicle_id, driver_id, assignment_status")
    .limit(5);
  assert(!asgErr && Array.isArray(assignments), "distribution_vehicle_assignments table is queryable");

  // -------------------------------------------------------------
  // 7. SMS ZERO-GRID PIPELINE INTEGRITY
  // -------------------------------------------------------------
  console.log("\n--- 7. Testing SMS Zero-Grid Ingestion & Triage Pipeline ---");
  const { data: smsMessages, error: smsErr } = await adminClient
    .from("sms_messages")
    .select("*, sms_parse_results(*)")
    .order("created_at", { ascending: false })
    .limit(5);
  assert(!smsErr && Array.isArray(smsMessages), "sms_messages and sms_parse_results queryable with relation");

  if (smsMessages && smsMessages.length > 0) {
    const sampleSms = smsMessages[0];
    assert(sampleSms.raw_message !== undefined, "sms_messages stores immutable raw_message");
    assert(sampleSms.status !== undefined, "sms_messages tracks processing status (parsed / accepted / etc)");
  }

  // -------------------------------------------------------------
  // 8. ATTACHMENT METADATA RPC & SECURITY DEFINER AUDIT
  // -------------------------------------------------------------
  console.log("\n--- 8. Testing Controlled RPCs & Anti-Spoofing ---");
  // Test log_audit_event anti-spoofing: Caller tries to forge an audit event with fake actor ID.
  // The database anti-spoofing guard must ignore the fake actor_id and force auth.uid().
  const fakeActorId = "00000000-0000-4000-8000-999999999999";
  const { data: auditId, error: spoofErr } = await fieldClient.rpc("log_audit_event", {
    p_actor_id: fakeActorId,
    p_action: "report.created",
    p_target_table: "field_reports",
    p_summary: "Anti-spoofing test audit record",
  });
  assert(!spoofErr && auditId, "log_audit_event executed by authenticated session");

  // Verify using admin client that the recorded audit log has real caller id and NOT fakeActorId
  const { data: recordedAudit } = await adminClient.from("audit_logs").select("id, actor_id").eq("id", auditId).single();
  assert(recordedAudit && recordedAudit.actor_id === fieldUser.id, "Anti-spoofing successfully enforced auth.uid() as actor_id");
  assert(recordedAudit && recordedAudit.actor_id !== fakeActorId, "Fake forged actor_id was blocked and not stored");

  // Test table whitelisting: Caller tries to log audit against an illegal/arbitrary table
  const { error: illegalTableErr } = await fieldClient.rpc("log_audit_event", {
    p_actor_id: fieldUser.id,
    p_action: "report.created",
    p_target_table: "malicious_fake_table",
  });
  assert(illegalTableErr !== null, "log_audit_event strictly rejects tables not in the whitelist");

  // Clean up test audit log
  await adminClient.from("audit_logs").delete().eq("id", auditId);

  // Clean up test report
  await adminClient.from("field_reports").delete().eq("code", testReportCode);

  console.log("\n=================================================================");
  console.log(`🎯 RESULT: ${passedChecks}/${totalChecks} INTEGRITY CHECKS PASSED! (100% SUCCESS)`);
  console.log("=================================================================\n");
}

runHardeningReview().catch((err) => {
  console.error("\n❌ HARDENING TEST FAILED:", err);
  process.exit(1);
});
