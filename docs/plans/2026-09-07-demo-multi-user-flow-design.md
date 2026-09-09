# Demo Multi-User Operations Flow

## Goal

Show that SiagaKita is not a single-user app. The demo should prove that BPBD, field officers, shelter managers, and warehouse managers work on one shared emergency workflow with role-based access, realtime updates, and auditability.

## Chosen Approach

Use admin-managed demo accounts.

This keeps the demo fast and easy to explain. Admin BPBD prepares accounts for every role before the demo, then the presenter can switch between accounts to show how each role contributes to the same disaster response flow.

## Demo Roles

1. `admin`
   - Creates and manages demo accounts.
   - Oversees all modules.
   - Reviews audit logs.

2. `bpbd_operator`
   - Verifies incoming reports.
   - Opens active disaster events.
   - Registers shelters for active events.
   - Coordinates logistics and escalation.

3. `field_officer`
   - Creates field reports from disaster locations.
   - Tracks report follow-up status.

4. `shelter_manager`
   - Updates shelter population, capacity, vulnerable groups, and needs.
   - Maintains shelter condition data during an event.

5. `warehouse_manager`
   - Monitors inventory.
   - Handles aid allocation and distribution to shelters.
   - Updates distribution progress.

6. `public_viewer`
   - Views safe public information through the public map.

## Main Demo Flow

1. Admin BPBD logs in.
   - Explain that BPBD controls official access.
   - Demo accounts already exist for operator, field officer, shelter manager, and warehouse manager.

2. Field officer logs in.
   - Creates a new disaster report, for example a landslide report.
   - Report starts with `baru` status.

3. BPBD operator logs in.
   - Reviews the new field report.
   - Verifies the report.
   - Opens an active disaster event from the verified report.
   - The event appears on the dashboard and public map.

4. Operator or admin registers a shelter.
   - Shelter is linked to the active disaster event.
   - Shelter appears in the operations view and public map.

5. Shelter manager logs in.
   - Updates shelter population, capacity, vulnerable groups, and urgent needs.
   - These updates feed operational dashboards and logistics decisions.

6. Warehouse manager logs in.
   - Reviews shelter needs.
   - Checks available inventory.
   - Creates or updates aid distribution to the shelter.
   - Distribution status moves through `disiapkan`, `dalam-perjalanan`, and `diterima`.

7. Admin or BPBD operator reviews audit log.
   - Shows every important action is traceable by actor, table, target, and time.

## Integration Model

All roles operate on the same shared database records:

1. `field_reports` receives citizen and field officer reports.
2. `disaster_events` represents verified active incidents.
3. `shelters` stores shelters linked to events.
4. `needs` stores shelter needs.
5. `inventory_items` stores warehouse stock.
6. `distributions` stores aid movement from warehouse to shelter.
7. `audit_logs` records operational accountability.

Realtime updates already listen to these tables, so updates from one role can be reflected across the operation console and public map flow.

## Demo Script Summary

SiagaKita is a shared disaster-response workspace. BPBD manages access by role. Field officers submit reports from the field. BPBD operators verify reports and open official events. Shelter managers update evacuee and needs data. Warehouse managers allocate and track logistics. The public map receives safe public-facing information, while the audit log records operational accountability.

## Scope For Demo

Keep account creation simple. Admin-managed accounts are enough for the demo. Email invitations, self-registration, organization approval queues, and complex tenant management are out of scope unless needed after the demo.
