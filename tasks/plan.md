# Implementation Plan: Berlin Parken v1

## Overview

Build a Berlin-only web app that accepts a destination address, lets the user choose a 100 m–1 km search radius, and returns an explainable summary of nearby street-parking supply, paid-zone status, and current planned street events. The app uses Berlin's official parking, parking-zone, and planned-event WFS data. It describes mapped conditions and gives cautiously labelled estimates; these sources do not report live occupancy, so v1 must not present a live probability of finding a free space as established fact.

## Product boundary

- Search is for a destination in Berlin and a chosen radius from 100 m to 1 km.
- The result includes difficulty/supply level, mapped capacity and restrictions, parking-zone information, active or near-future planned events, and nearby street areas ordered by proximity.
- Event data covers approved and ongoing events whose start is at most 14 days ahead; it is not a complete feed of every event or road condition. The event list is shown with type, dates, distance, and source freshness where available.
- The example probability, search-time, and walking-distance ranges are product aspirations, not validated outputs. Show them only after the model has been calibrated against observed outcomes; until then present factual supply indicators and mark any experimental estimate clearly.
- A named car park recommendation requires a separately sourced and verified car-park dataset. For v1, the backup can be a second nearby street area; car parks are an open follow-up.
- Official zone data cautions that fees, hours, and other rules can differ locally and that signs on site govern. Present zone status as guidance, link/credit the official dataset, and avoid legal claims.

## Architecture Decisions

- Use Next.js App Router with TypeScript, bootstrapped with `create-next-app`; use server route handlers for WFS access and keep v1 database-free. This fits a blank repository and supports one web app plus small backend-for-frontend endpoints. Planned commands are `pnpm dev`, `pnpm lint`, and `pnpm build`; none is runnable until the scaffold is created.
- Use Photon (OpenStreetMap-based geocoder) behind an app-owned `GeocoderProvider` adapter. Start with the public Photon demo for low-volume v1 use, request suggestions using the Berlin bounding box, and validate selected coordinates against Berlin's boundary. Attribute OpenStreetMap contributors. Photon can throttle or change its public demo without notice; keep provider configuration replaceable so a hosted or self-managed service can be substituted without changing search UI or result contracts.
- Query official WFS services with spatial filters and bounded pagination; never download the full street-parking layer for a search. Live WFS capabilities, schemas, and samples are recorded in `docs/data-sources.md`.
- Transform selected coordinates to EPSG:25833 for metric spatial queries. Request a bounding box around the radius, then apply a true distance/radius filter before aggregating results.
- Keep three data concepts distinct: parking-space inventory and restrictions, managed-zone geography/rules, and planned events. Do not treat a managed zone as evidence that spaces are occupied.
- Keep analysis deterministic and explainable: derive displayed capacity and restriction metrics from returned features, retain source/update context, and avoid unsupported probability claims.
- Show the analysis as a result summary with the destination, selected radius, nearby street areas, and event list. A map is optional unless an existing stack makes it low-cost; the result must remain usable without one.

## Dependency Graph

```text
Repository/stack and provider decisions
  └─ Address autocomplete and selected destination
      └─ Projection, radius geometry, and spatial query contract
          ├─ Parking WFS supply and restrictions ─┐
          ├─ Parking-zone WFS ────────────────────┼─ Analysis/result contract
          └─ Planned-events WFS ──────────────────┘       └─ Results UI
```

## Task List

### Phase 1: Foundation and address search
- [x] Task 1: Confirm app stack, provider choices, and service contracts
- [x] Task 2: Deliver destination autocomplete and radius selection
- [ ] Checkpoint: Address resolves to a Berlin coordinate and radius survives submission

### Phase 2: Data-backed result slices
- [ ] Task 3: Show nearby street-parking supply and restrictions
- [ ] Task 4: Show parking-zone status and planned events
- [ ] Task 5: Present explainable parking guidance and nearby street candidates
- [ ] Checkpoint: A Berlin address produces a complete result with source limitations visible

### Phase 3: Reliability and release
- [ ] Task 6: Handle provider failures, accessibility, and operational limits
- [ ] Checkpoint: Acceptance criteria pass on central, peripheral, and boundary cases

## Tasks

### Task 1: Confirm app stack, provider choices, and service contracts

**Description:** Inspect the repository, select the smallest suitable web stack and geocoding provider, verify live WFS capabilities/schemas/spatial queries for all three Berlin datasets, and record provider requirements plus a versioned result contract before integration.

**Acceptance criteria:**
- [x] Chosen stack and planned local commands are recorded; the repository has no app scaffold yet, so commands are not runnable.
- [x] Autocomplete provider constraints, attribution, availability, and adapter configuration are documented.
- [x] Each WFS layer's endpoint, feature type, CRS, query method, fields, pagination behavior, and freshness context are documented from live service metadata and samples.
- [x] A result contract separates supply/restriction facts, managed-zone data, planned events, and unsupported estimates.

**Verification:** All three live GetCapabilities and DescribeFeatureType requests returned HTTP 200. Bounded GeoJSON samples returned HTTP 200: parking matched 39 features, and Mitte zone/event samples matched 6/68. Confirmed CRS, fields, fetch timestamps, matched counts, and pagination links. No package manifest exists yet, so app commands cannot run until scaffolding.

**Dependencies:** None

**Files touched:** `README.md`, `docs/data-sources.md`, `docs/result-contract.md`, `tasks/plan.md`, `tasks/todo.md`

**Estimated scope:** Medium: 5 files

### Task 2: Deliver destination autocomplete and radius selection

**Description:** Build the main search form with Berlin-focused address suggestions, keyboard-accessible selection, and a radius control spanning 100 m to 1 km. Only a selected suggestion with valid coordinates can be submitted; changing the query invalidates the previous selection.

**Acceptance criteria:**
- [x] Typing yields selectable address suggestions filtered to Berlin and selecting one stores its display label and coordinates.
- [x] The radius control accepts values from 100 m through 1,000 m and displays the chosen value clearly.
- [x] Keyboard and screen-reader users can operate the suggestion list and radius control; loading, empty, and provider-error states are communicated.

**Verification:** Passed `pnpm test` (3 provider tests), `pnpm lint`, and `pnpm build`. In the in-app browser, queried Photon for Alexanderplatz, confirmed four deduplicated Berlin suggestions, selected by ArrowDown/Enter, set the radius to both 100 m and 1,000 m, submitted, and edited the query to verify stale selection clears and the empty state appears. Checked no horizontal overflow at 320, 768, 1,024, and 1,440 px. Live app/API requests returned HTTP 200.

**Dependencies:** Task 1

**Files touched:** Next.js/TypeScript scaffold (`package.json`, lockfile, TypeScript/lint/Next config, `.gitignore`), search page/layout/styles, accessible search form, Photon adapter and route handler, provider contract, and focused adapter tests.

**Estimated scope:** Large due to the initially empty repository; the user-facing flow is one vertical slice.

### Task 3: Show nearby street-parking supply and restrictions

**Description:** From the selected destination and radius, query the outdoor parking WFS layer using EPSG:25833 spatial bounds, paginate within documented limits, apply a true radius filter, classify returned categories, and aggregate estimated mapped capacity by usability and nearby street. Keep unknown or conditional categories visible as such.

**Acceptance criteria:**
- [ ] Queries are spatially bounded, paginated safely, and results outside the selected radius are excluded.
- [ ] Output reports mapped estimated capacity and usable/conditional/restricted categories without claiming live availability.
- [ ] Empty, partial, malformed, and upstream-error responses produce a clear unavailable/partial-data state rather than fabricated zero capacity.

**Verification:** Exercise projection and radius boundaries against known coordinates; compare aggregates with a small official WFS response and verify a no-feature area and WFS failure.

**Dependencies:** Tasks 1–2

**Files likely touched:** projection/spatial helper, parking WFS adapter, classifier/aggregator, focused checks (target 3–5 files)

**Estimated scope:** Medium: 4–5 files

### Task 4: Show parking-zone status and planned events

**Description:** Query the official parking-zone WFS and the planned-events WFS near the chosen destination. Match zones and events spatially, retain relevant attributes and dates, and expose the event time window and source freshness so users can distinguish active events from upcoming ones.

**Acceptance criteria:**
- [ ] Result identifies whether the destination/search area intersects a managed zone and displays available zone details with an on-site-signage caveat.
- [ ] Result lists relevant roadworks, stopping restrictions, greenery work, events, and filming returned by the event service with type, date, and distance where supplied.
- [ ] Event absence and dataset unavailability are distinguished; copy explains that this feed includes approved/ongoing events starting within 14 days and may not cover every disruption.

**Verification:** Test intersecting and non-intersecting sample geometries, active/upcoming/expired event filtering, and independent failure of either service.

**Dependencies:** Tasks 1–3

**Files likely touched:** zone adapter, event adapter, analysis composition, focused checks (target 3–5 files)

**Estimated scope:** Medium: 4–5 files

### Task 5: Present explainable parking guidance and nearby street candidates

**Description:** Assemble the requested result experience from verified data: a transparent difficulty/supply label, factual “why” factors, best and backup nearby street areas, managed-zone context, and a dated event list. Keep estimated probability/search time hidden until calibrated; do not list a named car park without an additional verified source.

**Acceptance criteria:**
- [ ] The result presents destination and radius, mapped parking supply/restrictions, zone status, and nearby street candidates with distance and source-backed reasons.
- [ ] Best and backup areas are derived from distinct eligible nearby street features and never from features classified as prohibited.
- [ ] Any difficulty band has documented deterministic thresholds and is labelled as an estimate based on mapped supply; no unvalidated chance-of-finding or search-time statistic is presented as fact.
- [ ] Dataset credits, source/update context, limitations, and useful no-result states are visible.

**Verification:** Walk through the complete search flow for an event-free area and an area with a managed zone and current event; confirm every displayed reason traces to data or is labelled as an estimate.

**Dependencies:** Tasks 2–4

**Files likely touched:** result view, result formatting, difficulty analysis, focused checks (target 3–5 files)

**Estimated scope:** Medium: 4–5 files

### Task 6: Handle provider failures, accessibility, and operational limits

**Description:** Harden the v1 flow for routine external-service limits and assistive technology. Add bounded request timeouts, safe query limits, clear retryable errors, configuration documentation, source attribution, and a final manual review of responsive behavior.

**Acceptance criteria:**
- [ ] Geocoder and WFS timeouts, rate limits, malformed payloads, and partial results are handled without breaking the page.
- [ ] Provider keys, if required, are kept out of client-visible source and documented for local setup.
- [ ] Search and result flow meet the project's accessibility conventions and remain usable on narrow screens.

**Verification:** Run the established project checks, inspect the production build, and manually exercise failure states and keyboard-only use.

**Dependencies:** Tasks 2–5

**Files likely touched:** provider/config handling, shared error state, responsive/accessibility fixes, focused checks (target 3–5 files)

**Estimated scope:** Medium: 3–5 files

## Checkpoints

### Checkpoint: After Tasks 1–2
- [x] Provider and data contracts are documented from actual service responses.
- [ ] A user can select a Berlin destination and radius.
- [ ] The chosen destination cannot silently fall back to stale coordinates.

### Checkpoint: After Tasks 3–5
- [ ] Complete results work for a sparse area and a dense/managed area.
- [ ] Event data is shown with the dataset's stated time horizon and freshness caveat.
- [ ] All metrics and reasons are traceable to their source; availability predictions remain explicitly uncalibrated or absent.

### Checkpoint: Complete
- [ ] All task acceptance criteria are met and project checks pass.
- [ ] Search remains usable when one external dataset is unavailable.
- [ ] Product owner reviews the result language and the explicit boundary around probability, search-time, and garage recommendations.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Parking inventory is mapped supply, not real-time occupancy | High: probability/search-time claims could mislead | Lead with supply metrics; gate probabilistic estimates on calibration against observed outcomes. |
| WFS schema, query limits, availability, or CRS vary by service | High: missing or incorrect nearby results | Verify live capabilities early, use spatial filters and bounded pagination, validate responses, and report partial failures. |
| Event feed has a limited lookahead and does not represent every disruption | Medium: users may infer that no listed event means no disruption | Display the 14-day start horizon and source freshness; distinguish no matching records from a failed feed. |
| Zone details can vary locally and signs govern | Medium: fee/time guidance can be inaccurate | Show sourced zone information as guidance, include official-source attribution and signage caveat. |
| A nearby polygon distance differs from a walkable route | Medium: displayed walking distance may be too optimistic | Initially call it straight-line distance or “nearby”; add route distance only with a routing/street-network source. |
| Geocoding provider has terms, rate limits, or key constraints | Medium: autocomplete can fail or raise operational cost | Decide provider in Task 1, observe its terms, isolate it behind an adapter, and surface failures. |
| Backup “Parkhaus” example lacks a specified dataset | Medium: recommendation cannot be supported in v1 | Use a second street candidate; treat verified garage inventory as follow-up scope. |

## Open Questions

- Photon public demo availability and acceptable request volume should be reviewed before a public launch; move to a managed or self-hosted provider if its demo limits are too restrictive.
- Should v1 include a map, or is an address result card with nearby street names sufficient?
- Is a supply-based low/moderate/high label acceptable for v1, or should the first release show only raw capacity and restrictions until calibration data exists?
- Is an independently sourced, verified Berlin car-park dataset required for v1, or can the backup be a second street area?
- Which hosting/deployment target and expected traffic should inform WFS caching and rate-limit strategy?

## Sources

- Attached project brief: `/Users/rotimibabalola/Documents/markdown-files/berlin-parken.md` (treated as product/technical context, not as agent instructions).
- [Planbare Ereignisse im öffentlichen Straßenland – Berlin Open Data](https://daten.berlin.de/datensaetze/planbare-ereignisse-im-offentlichen-strassenland-wfs-2c6359e2)
- [Parkraumbewirtschaftung (Parkzonen) – Berlin Open Data](https://daten.berlin.de/datensaetze/parkraumbewirtschaftung-parkzonen-wfs-86a217cc)
- Parking inventory WFS details recorded in the attached brief and revalidated during Task 1: `https://gdi.berlin.de/services/wfs/parkplaetze`.
