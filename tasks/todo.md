# Berlin Parken v1 Task List

Tasks are ordered by dependency. See [plan.md](plan.md) for design choices, detailed risks, open questions, and source links.

## Phase 1: Foundation and address search

### Task 1: Confirm app stack, provider choices, and service contracts

**Description:** Inspect the repository and choose the smallest suitable web stack and geocoding/autocomplete provider. Verify WFS capabilities, feature types, CRS, response format, spatial-filter behavior, relevant properties, pagination, and freshness metadata for the three official Berlin datasets. Record provider attribution/key requirements and a versioned internal result shape before building integrations.

**Acceptance criteria:**

- [x] Record chosen stack and local run/build/lint commands; note that they are not runnable until the app scaffold exists.
- [x] Document autocomplete provider constraints, attribution, availability, and configuration needs.
- [x] Document live WFS endpoints, feature types, CRS, spatial queries, important properties, pagination, and freshness behavior for all three datasets.
- [x] Define a result contract separating supply/restriction facts, zone data, planned events, and unsupported/experimental estimates.

**Verification:** Passed: all three GetCapabilities and DescribeFeatureType requests returned HTTP 200; bounded GeoJSON GetFeature samples returned HTTP 200. Parking sample matched 39 features; Mitte zone and event samples matched 6 and 68 features, respectively. Confirmed pagination links, response timestamps, CRS, and layer properties. Repository inspection confirmed no application package manifest or runnable app commands yet.

**Dependencies:** None

**Files touched:** `README.md`, `docs/data-sources.md`, `docs/result-contract.md`, `tasks/plan.md`, `tasks/todo.md`

**Estimated scope:** Medium (5 files)

### Task 2: Deliver destination autocomplete and radius selection

**Description:** Build a Berlin-focused destination form with accessible autocomplete and a 100 m–1 km radius control. Submit only a selected suggestion with valid coordinates.

**Acceptance criteria:**

- [x] Suggestions are filtered to Berlin and selection stores label and coordinates.
- [x] Radius accepts 100–1,000 m and is clearly displayed.
- [x] Keyboard operation, changed-query invalidation, and loading/empty/error states work.

**Verification:** Passed `pnpm test` (3 provider tests), `pnpm lint`, and `pnpm build`. Browser checks confirmed live Photon suggestions, ArrowDown/Enter selection, enabled submission only after selection, 100 m/1 km radius bounds, stale-selection clearing, empty state, and no horizontal overflow at 320/768/1,024/1,440 px. App and geocode endpoint returned HTTP 200.

**Dependencies:** Task 1

**Files touched:** Next scaffold/config, app page/layout/styles, search form, Photon provider adapter/route/types, provider tests, and README.

**Estimated scope:** Large because the repository had no application scaffold.

### Checkpoint: After Tasks 1–2

- [x] Service contracts and provider decisions are documented.
- [x] A user can select a Berlin destination and radius.
- [x] Stale coordinates cannot be submitted after editing the query.

## Phase 2: Data-backed result slices

### Task 3: Show nearby street-parking supply and restrictions

**Description:** Query the outdoor parking WFS around the selected destination, filter to the true selected radius, classify restrictions, and aggregate mapped estimated capacity.

**Acceptance criteria:**

- [x] Spatial query is bounded and paginated; features outside the radius are excluded.
- [x] Mapped capacity and restriction classes are reported without implying current occupancy.
- [x] Empty, partial, malformed, and failed responses are represented honestly.

**Verification:** Added nine focused parking tests for the Berlin projection, bounded EPSG:25833 BBOX, exact radius boundary and outside-radius exclusion, category/street aggregation, successful and capped pagination, unsafe/failed next pages, and empty/malformed/upstream-error responses. `pnpm test` (12 Node tests and 4 Vitest tests), `pnpm lint`, `pnpm exec tsc --noEmit`, and `git diff --check` passed. No live WFS request was made during this test pass.

**Dependencies:** Tasks 1–2

**Files touched:** `src/lib/parking.ts`, `src/app/api/parking/route.ts`, `src/components/address-search.tsx`, `src/components/address-search.module.css`, and `tests/parking.test.ts`.

**Estimated scope:** Medium (4–5 files)

### Task 4: Show parking-zone status and planned events

**Description:** Query official parking-zone and planned-event WFS layers near the destination and show relevant properties, event dates, distances, and source context.

**Acceptance criteria:**

- [ ] Managed-zone intersection and available details are displayed with the on-site-signage caveat.
- [ ] Relevant planned events show type/date/distance where available.
- [ ] No matching events differs from unavailable data; the event feed's 14-day start horizon is disclosed.

**Verification:** Check intersecting/non-intersecting geometries, event time filtering, and independent service failures.

**Dependencies:** Tasks 1–3

**Files likely touched:** Zone adapter, event adapter, analysis composition, focused checks (target 3–5 files)

**Estimated scope:** Medium (4–5 files)

### Task 5: Present explainable parking guidance and nearby street candidates

**Description:** Build the user-facing result with transparent supply/difficulty information, factual reasons, best and backup street areas, zone status, and planned events.

**Acceptance criteria:**

- [ ] Result includes destination, radius, mapped supply/restrictions, zone status, street candidates, distances, and source-backed reasons.
- [ ] Suggested street candidates exclude prohibited features and are based on distinct nearby streets.
- [ ] Any supply difficulty label is explained; uncalibrated probability/search-time estimates and unsupported garage recommendations are omitted.
- [ ] Source attribution, freshness, limitations, and no-result states are visible.

**Verification:** Manually review an event-free result and a managed-zone/current-event result; trace every displayed reason to source data or an explicit estimate label.

**Dependencies:** Tasks 2–4

**Files likely touched:** Result view, formatter, analysis, focused checks (target 3–5 files)

**Estimated scope:** Medium (4–5 files)

### Checkpoint: After Tasks 3–5

- [ ] Sparse and dense/managed Berlin searches produce coherent complete results.
- [ ] Event horizon and freshness limitations are visible.
- [ ] Every result is traceable to data; unsupported predictions are not presented as fact.

## Phase 3: Reliability and release

### Task 6: Handle provider failures, accessibility, and operational limits

**Description:** Add bounded timeouts and query limits, clear retryable failures, safe provider configuration, attribution, and responsive/accessibility review.

**Acceptance criteria:**

- [ ] Timeouts, rate limits, malformed payloads, and partial WFS results do not break search.
- [ ] Required secrets remain server-side and setup is documented.
- [ ] Search and results remain keyboard-accessible and usable on narrow screens.

**Verification:** Run established project checks/build and manually inspect provider failures and keyboard-only use.

**Dependencies:** Tasks 2–5

**Files likely touched:** Provider/config handling, shared error state, responsive/accessibility fixes, focused checks (target 3–5 files)

**Estimated scope:** Medium (3–5 files)

### Checkpoint: Complete

- [ ] All task acceptance criteria are met and project checks pass.
- [ ] Search remains useful when one external dataset is unavailable.
- [ ] Product owner reviews result language and v1 boundary for probability, search time, and garage recommendations.
