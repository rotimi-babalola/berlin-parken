# Berlin Parken v1 Task List

Tasks are ordered by dependency. See [plan.md](plan.md) for design choices, detailed risks, open questions, and source links.

## Phase 1: Foundation and address search

### Task 1: Confirm app stack, provider choices, and service contracts

**Description:** Inspect the repository and choose the smallest suitable web stack and geocoding/autocomplete provider. Verify WFS capabilities, feature types, CRS, response format, spatial-filter behavior, relevant properties, pagination, and freshness metadata for the three official Berlin datasets. Record provider attribution/key requirements and a versioned internal result shape before building integrations.

**Acceptance criteria:**
- [ ] Record chosen stack and actual local run/build/test commands.
- [ ] Document autocomplete provider constraints, attribution, and configuration needs.
- [ ] Document live WFS endpoints, feature types, CRS, spatial queries, important properties, pagination, and freshness behavior for all three datasets.
- [ ] Define a result contract separating supply/restriction facts, zone data, planned events, and experimental estimates.

**Verification:** Inspect capabilities/schema and run one bounded spatial query per WFS layer; check available project commands.

**Dependencies:** None

**Files likely touched:** `README.md`, `docs/data-sources.md`, `docs/result-contract.md`

**Estimated scope:** Medium (3 files)

### Task 2: Deliver destination autocomplete and radius selection

**Description:** Build a Berlin-focused destination form with accessible autocomplete and a 100 m–1 km radius control. Submit only a selected suggestion with valid coordinates.

**Acceptance criteria:**
- [ ] Suggestions are Berlin-focused and selection stores label and coordinates.
- [ ] Radius accepts 100–1,000 m and is clearly displayed.
- [ ] Keyboard operation, changed-query invalidation, and loading/empty/error states work.

**Verification:** Run focused UI checks and manually try keyboard selection, no results, changed query, and radius boundaries.

**Dependencies:** Task 1

**Files likely touched:** Search page/component, autocomplete, provider adapter, focused checks (target 3–5 files)

**Estimated scope:** Medium (3–5 files)

### Checkpoint: After Tasks 1–2
- [ ] Service contracts and provider decisions are documented.
- [ ] A user can select a Berlin destination and radius.
- [ ] Stale coordinates cannot be submitted after editing the query.

## Phase 2: Data-backed result slices

### Task 3: Show nearby street-parking supply and restrictions

**Description:** Query the outdoor parking WFS around the selected destination, filter to the true selected radius, classify restrictions, and aggregate mapped estimated capacity.

**Acceptance criteria:**
- [ ] Spatial query is bounded and paginated; features outside the radius are excluded.
- [ ] Mapped capacity and restriction classes are reported without implying current occupancy.
- [ ] Empty, partial, malformed, and failed responses are represented honestly.

**Verification:** Check projection/radius edges, compare one bounded response with aggregates, and exercise empty and failed responses.

**Dependencies:** Tasks 1–2

**Files likely touched:** Projection/spatial helper, parking WFS adapter, classifier/aggregator, focused checks (target 3–5 files)

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
