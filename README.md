# Berlin Parken

Berlin parking guidance app. The repository is currently at the planning/foundation stage; see [the v1 plan](tasks/plan.md) and [the task checklist](tasks/todo.md).

## Confirmed v1 foundation

- **App:** Next.js App Router with TypeScript, created with `create-next-app`; no database for v1.
- **Local commands:** `pnpm dev`, `pnpm test`, `pnpm lint`, and `pnpm build`.
- **Address suggestions:** Photon (OpenStreetMap-based) through an app-owned provider adapter. Start with the public Photon demo for low-volume v1 use; it may throttle or change without notice. The adapter keeps the UI independent of Photon and allows a hosted or self-managed provider later. Attribute OpenStreetMap contributors.
- **Berlin geodata:** the three official WFS 2.0.0 services described in [`docs/data-sources.md`](docs/data-sources.md).
- **Geocoder adapter contract:** `suggest(query)` returns normalized suggestions with a provider ID, display label, detail, and WGS84 coordinates. The selected suggestion already contains the coordinates, so the form needs no provider-specific follow-up call. Keep Photon-specific request/response mapping inside its adapter.
- **Result contract:** [`docs/result-contract.md`](docs/result-contract.md).

## Product limit

Official mapped parking data shows infrastructure and restrictions, not live occupancy. Initial results describe mapped supply and nearby conditions. Do not present a chance of finding an open space or search-time estimate as measured fact without calibration data.
