# SiagaKita Flow Hardening Design

Approved scope: fix all weird actor-flow issues found in audit.

## Goals

1. Public reports must submit reliably.
2. Console routes must match actor permissions.
3. Field officers must not verify their own operational reports.
4. Emergency reporting must work when GPS fails, with lower confidence.
5. Incident creation must never silently use fake fallback coordinates.
6. Volcano CCTV must load on demand when PVMBG provides it.

## Changes

1. Public report flow
   - Store public citizen reports with DB-valid `channel: "Web"`.
   - Allow report submission when either GPS coordinates or location text exists.
   - Lower confidence when GPS is missing.
   - Use longer tracking codes to reduce collision risk.

2. Console access
   - Require authenticated profile in console layout.
   - Redirect `public_viewer` to `/peta-publik`.
   - Add route-level role guards for sensitive console pages.

3. Report permissions
   - Keep field officers able to create and AI-triage reports.
   - Restrict report verification to `admin` and `bpbd_operator`.
   - Keep rejection and incident opening restricted to `admin` and `bpbd_operator`.

4. Staff rate limits
   - Keep public report rate limit for anonymous citizen reports.
   - Remove public rate limit from authenticated staff report creation.

5. Incident coordinates
   - Use explicit coordinates if provided.
   - Else parse `[GPS: lat, lon ...]` from citizen report summary.
   - Else fail with a clear error instead of hardcoded coordinates.

6. Volcano CCTV
   - Keep `hasCctv` and `cctvCount` on initial map points.
   - Let detail view try CCTV lookup for PVMBG volcano points on demand.

## Verification

Run:

```bash
npx tsc --noEmit
npm run build
```
