# Berlin Parken

Berlin parking guidance app. The repository is currently at the planning/foundation stage; see [the v1 plan](tasks/plan.md) and [the task checklist](tasks/todo.md).

## Confirmed v1 foundation

- **App:** Next.js App Router with TypeScript, created with `create-next-app`; no database for v1.
- **Local commands after app scaffold:** `pnpm dev`, `pnpm lint`, and `pnpm build`. They are not runnable yet because this repository does not yet contain an application/package manifest.
- **Address suggestions:** Photon (OpenStreetMap-based) through an app-owned provider adapter. Start with the public Photon demo for low-volume v1 use; it may throttle or change without notice. The adapter keeps the UI independent of Photon and allows a hosted or self-managed provider later. Attribute OpenStreetMap contributors.
- **Berlin geodata:** the three official WFS 2.0.0 services described in [`docs/data-sources.md`](docs/data-sources.md).
- **Geocoder adapter contract:** `suggest(query, bounds)` returns normalized suggestions; `resolve(providerId)` returns the selected label and WGS84 coordinates. Search UI and analysis use only this normalized contract. Keep Photon-specific request/response mapping inside its adapter.
- **Result contract:** [`docs/result-contract.md`](docs/result-contract.md).

## Product limit

Official mapped parking data shows infrastructure and restrictions, not live occupancy. Initial results describe mapped supply and nearby conditions. Do not present a chance of finding an open space or search-time estimate as measured fact without calibration data.
