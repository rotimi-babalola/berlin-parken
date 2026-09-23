# Berlin Parken v1 data sources

Checked against live WFS capabilities, schemas, and bounded GeoJSON queries on 2026-09-23. All three services advertise WFS 2.0.0 and EPSG:25833 (`urn:ogc:def:crs:EPSG::25833`) as their default CRS. GeoJSON spatial queries using `BBOX=minX,minY,maxX,maxY,EPSG:25833`, `COUNT`, and `OUTPUTFORMAT=application/json` returned successfully. Nonempty responses contain `totalFeatures`, `numberReturned`, `timeStamp`, CRS, and a `rel=next` URL when more features remain. Follow the returned URL for pagination and impose a maximum page/feature budget.

## Address autocomplete

- Initial provider: [Photon](https://github.com/komoot/photon), an open-source geocoder built on OpenStreetMap data with search-as-you-type support and bounding-box filtering.
- Initial endpoint: public demo at `https://photon.komoot.io`. Photon maintainers permit reasonable use but may throttle or ban extensive usage and make no availability guarantees. Use for low-volume v1/prototype traffic only; review usage before public launch.
- Place Photon-specific URLs, query parameters, response parsing, and IDs behind an app-owned provider adapter. The app-facing interface is `suggest(query, bounds)` and `resolve(providerId)`; normalized results contain a display label, provider ID, and WGS84 coordinates. If Photon requires no separate resolution request for a selected suggestion, the adapter may resolve from the selected normalized suggestion.
- Bound suggestions to Berlin's extent and validate the selected point against Berlin's boundary before analysis.
- Attribute OpenStreetMap contributors in the UI and provide the applicable OSM copyright/ODbL notice. Recheck Photon and OSM attribution guidance at implementation time.
- Replacement options include a managed geocoder or a self-hosted Photon instance; switching providers should require changing the adapter/configuration, not the form or analysis contract.

## Street parking inventory

- Catalog: [Parken im Straßenraum – Berlin Open Data](https://daten.berlin.de/datensaetze/parken-im-strassenraum-wfs-2eb40df3)
- WFS: `https://gdi.berlin.de/services/wfs/parkplaetze`
- Outdoor layer: `parkplaetze:parkplaetze_aussen`; another layer, `parkplaetze:parkplaetze`, is also listed.
- Relevant schema fields: `polygonid`, `strassenname`, `zone`, `anzahl_parkplaetze`, `category`, `oeffentlichesstrassenland`, `geltungszeit_ladezone`, `ladezone_einschraenkungen`, and `geom` (MultiSurface).
- Observed categories in the supplied project brief include unrestricted parking, parking bans, time-limited parking, limited duration, user-group parking, and loading zones. Keep unknown categories separate rather than assuming availability.
- Verification sample: a 200 m × 300 m bounding box in Treptow-Köpenick returned HTTP 200, 39 matching features, one requested feature with capacity 63, street name, category, zone, geometry, and a `next` link.
- The layer is large (the supplied brief observed 214,173 features); always constrain queries spatially. `anzahl_parkplaetze` is mapped/estimated inventory and does not indicate current vacancies.

## Parking management zones

- Catalog: [Parkraumbewirtschaftung (Parkzonen) – Berlin Open Data](https://daten.berlin.de/datensaetze/parkraumbewirtschaftung-parkzonen-wfs-86a217cc)
- WFS: `https://gdi.berlin.de/services/wfs/parkraumbewirtschaftung`
- Layer: `parkraumbewirtschaftung:parkzonen`.
- Schema fields: `parkzone`, `bezirk`, `zeiten`, `gebuehr`, `bemerkung`, and `geom` (MultiSurface).
- Verification sample: a 1 km × 1 km Mitte bounding box returned HTTP 200, six matching zones, and a paginated sample with park zone, borough, operating hours, hourly fee, local remark, and `next` link.
- Catalog says districts regularly update the data, while fees, operating times, and other rules can vary on local sections. The catalog explicitly says the data creates no legal entitlement and that on-site signs must be followed. Show as guidance with this caveat.

## Planned events on public streets

- Catalog: [Planbare Ereignisse im öffentlichen Straßenland – Berlin Open Data](https://daten.berlin.de/datensaetze/planbare-ereignisse-im-offentlichen-strassenland-wfs-2c6359e2)
- WFS: `https://gdi.berlin.de/services/wfs/planb_ereignisse`
- Layer: `planb_ereignisse:ereignisse`.
- Schema fields: `dat_beginn`, `dat_ende`, `uhr_beginn`, `uhr_ende`, `strasse`, `bezirk`, `ortsteil`, `von_hausnr`, `bis_hausnr`, `von_str`, `bis_str`, `ereignis`, `einschr`, `bewertung`, and `geom` (MultiSurface), plus setup/teardown date fields.
- Catalog describes approved and ongoing events across Berlin's public road network. It says events whose start is at most 14 days in the future are visualized. Listed event types include construction/work sites, moving-related stopping bans, greenery work, events, and filming that affect traffic.
- Verification sample: a 1 km × 1 km Mitte bounding box returned HTTP 200, 68 matching records and a `next` link; the first record included street, event type, restriction, start/end dates, and geometry.
- The catalog record's published/updated date is 2021-10-06, while WFS `timeStamp` reflected the query date. Keep dataset metadata freshness and response fetch time distinct. Do not claim that an empty result proves there is no disruption.

## Query and interpretation notes

- Convert selected WGS84 coordinates to EPSG:25833 before creating a metre-based query box. The supplied project brief reports that EPSG:4326 BBOX requests returned no parking features while EPSG:25833 worked.
- A BBOX is square. Query it as a candidate filter, then filter returned geometries against the actual selected circular radius.
- Keep service response timestamps separate from dataset update dates. Preserve partial/unavailable status when a service fails.
- The three datasets are published under Datenlizenz Deutschland – Zero – Version 2.0 according to their Berlin Open Data catalog entries; retain source links/attribution in the product.
- Source links and service schemas can change; recheck capabilities and schemas when implementing each adapter.
