# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Any car driver needing street-parking information at a Berlin destination address. Includes visitors unfamiliar with Berlin zones/signs and residents checking restrictions, paid zones, and planned events before a trip.

## Product Purpose

Berlin Parken answers: "what is mapped street-parking supply, zone rules, and planned disruptions around my destination?" before the driver arrives. It uses Berlin official open geodata only. Success is a fast, explainable pre-trip check that helps pick where to look first without over-promising live availability.

## Positioning

Explainable official data: mapped supply + managed-zone guidance + dated planned events, each traced to its Berlin Open Data source with freshness. Never presents chance of finding a space or search time as measured fact without calibration.

## Operating Context

Pre-trip, usually on phone or desktop: enter Berlin destination, pick 100m–1km radius, review supply/restrictions, zone status, nearby streets ordered by proximity, and 14-day event list. Used alongside navigation; result must remain usable without a map.

## Capabilities and Constraints

- Berlin-only destination search via Photon adapter (OSM attribution), Berlin bbox + boundary validation.
- Three WFS 2.0.0 sources: street-parking inventory, managed zones, planned events.
- Result contract: difficulty/supply label (if shown, deterministic thresholds, labelled estimate), usable/conditional/restricted/unknown capacity, zone details with on-site-signage caveat, events with type/dates/distance, straight-line distances only.
- Hard honesty limits: inventory is not live occupancy; events cover approved/ongoing starts ≤14 days ahead, incomplete; zone fees/hours vary locally; no named car-park without verified dataset (backup = second street area); mock data allowed for design mockups, labelled synthetic.
- No DB for v1. Server route handlers for WFS.

## Brand Commitments

Name: berlinparken. No locked logo, palette, or type. Incumbent code uses paper/green scaffold only — not binding. Binding copy constraints: guidance-only language, source attribution, signage caveat.

## Evidence on Hand

No real user data in mockups — use synthetic destinations (e.g. Torstraße 101, Mitte), streets, zones, events. Real source URLs exist in docs/data-sources.md and result-contract.md. No testimonials, pricing, or benchmarks to show.

## Product Principles

1. Honesty over helpfulness theater: show what is mapped, say what is unknown.
2. Explain every reason: every street pick and label traces to data or is marked estimate.
3. Pre-trip speed: destination → radius → glanceable answer in seconds.
4. Official-data trust: credit sources, show freshness, defer to on-site signs.
5. Narrow v1, done well: Berlin + radius + three datasets, no map required.

## Accessibility & Inclusion

Keyboard + screen-reader operable search and results; visible focus; loading/empty/error states announced. Must hold at 320px–1440px. German street names preserved accurately.
