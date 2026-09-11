# Public Map Resilience Design

Approved approach: contextual status handling with a versioned browser snapshot.

## Goals

1. Keep failures next to the affected map, list, detail, route, report, or session control.
2. Explain what happened, its impact, and the safest recovery action in Indonesian.
3. Preserve the existing public-map layout and keep controls keyboard accessible.
4. Allow public data from the last successful sync to remain usable during disruption.

## State Contract

1. `critical`: the affected task cannot continue. Use red and an assertive announcement.
2. `warning`: data may be incomplete, stale, or connectivity is degraded. Use amber.
3. `info`: loading, refresh, or a normal empty result. Use blue.
4. `success`: a recovery or submission completed. Use green.
5. Every persistent state has a short title, a plain description, and one useful action when recovery is possible.

## Placement

1. Map load, marker rendering, and geolocation states stay over the map canvas.
2. Empty category, search, and filter states stay in the sidebar list.
3. Detail and evacuation-route failures stay in the selected incident panel.
4. Submission failures stay inside the citizen-report dialog.
5. Session expiry appears at the staff-portal entry point before redirecting to login.
6. Route-level server failures use the Next.js error boundary without replacing the normal page layout.

## Data Recovery

1. Store only public map points, ticker summaries, source names, and sync time.
2. Use a versioned `localStorage` key and validate parsed data before use.
3. Mark live data stale after 5 minutes and expired after 30 minutes.
4. Never replace fresher live data with an older snapshot automatically.
5. When live refresh fails, offer `Gunakan data terakhir` only if a valid snapshot exists.
6. Identify cached data visibly with its last successful synchronization time.

## Required Coverage

- Map cannot load.
- Markers cannot render.
- Shelter, incident, earthquake, or volcano category is empty.
- Search returns no result.
- Active filters return no result.
- Geolocation is denied, unavailable, or times out.
- Connection is slow or offline.
- Live source or page server fails.
- Refresh is running or fails.
- Data is stale or expired.
- Selected marker detail is no longer available.
- Evacuation route cannot be opened.
- Emergency report submission fails or succeeds.
- Staff session has expired.

## Verification

Run:

```bash
npx tsc --noEmit
npm run lint
npm run build
```
