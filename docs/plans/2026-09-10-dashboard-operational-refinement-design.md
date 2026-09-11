# Dashboard Operational Refinement Design

Approved direction: balanced operational density through semantic component refinement.

## Constraints

1. Preserve the left sidebar, KPI grid, primary chart, and reports table.
2. Do not change the size or container of `Tren Mobilisasi Logistik & Evakuasi`.
3. Do not add controls or status elements to the top bar.
4. Do not change product concepts, navigation destinations, or operational data.

## KPI Hierarchy

1. Keep four equal grid columns and consistent card dimensions.
2. Emphasize active disasters and critical supplies through semantic border, icon, number weight, and action-status treatment.
3. Keep shelter population and unverified reports legible with quieter neutral surfaces.
4. Use only factual metadata already available in dashboard data.
5. Use Plus Jakarta Sans for card titles and KPI values; use Inter for status, context, and metadata.

## Reports Table

1. Keep the existing data and table behavior.
2. Use a compact, aligned filter toolbar with selection context shown only when relevant.
3. Establish report/location as the scanning anchor, followed by urgency, status, and a right-aligned action area.
4. Target balanced row density around 48-52px without reducing touch targets below 44px.
5. Normalize urgency and status badges by height, padding, weight, and semantic contrast.

## Sidebar

1. Preserve current menu grouping and destinations.
2. Strengthen the active item with a meaningful side indicator and controlled surface contrast.
3. Normalize `Darurat`, `New`, and `Live` badge geometry and alignment while retaining distinct semantics.
4. Reduce visual noise through consistent group, item, icon, and label spacing.

## Verification

```bash
npx tsc --noEmit
npx eslint "src/app/(console)/dashboard/**/*.{ts,tsx}" "src/app/(console)/_components/sidebar/**/*.{ts,tsx}" "src/navigation/sidebar/sidebar-items.ts"
npm run build
```
