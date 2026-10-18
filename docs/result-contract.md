# Berlin Parken result contract (v1)

This is the app-facing contract between the search flow, data adapters, analysis, and result view. Coordinates and distances use metres for spatial operations. It intentionally distinguishes source facts from derived estimates.

```ts
type SourceState =
  | { status: "available"; fetchedAt: string; datasetUpdatedAt?: string }
  | { status: "empty"; fetchedAt: string; datasetUpdatedAt?: string }
  | {
      status: "partial";
      fetchedAt: string;
      message: string;
      datasetUpdatedAt?: string;
    }
  | { status: "unavailable"; message: string };

type Destination = {
  label: string;
  latitude: number;
  longitude: number;
  providerId: string;
};

type ParkingCandidate = {
  id: string;
  streetName?: string;
  usability: "usable" | "conditional";
  /** Outside layer's mapped `category`; inside layers carry their rules below. */
  sourceCategory?: string;
  mappedSpaces: number;
  distanceMeters: number;
  /** EPSG:25833 metres straight from the Berlin WFS, not WGS84 lng/lat. */
  geometry: GeoJSON.Geometry;
  rules?: {
    restriction?: string;
    hours?: string;
    fee?: string;
    maxStay?: string;
  };
};

type ParkingZone = {
  id: string;
  zone?: string;
  borough?: string;
  hours?: string;
  fee?: string;
  note?: string;
  geometry: GeoJSON.Geometry;
};

type PlannedEvent = {
  id: string;
  street?: string;
  borough?: string;
  type?: string;
  restriction?: string;
  startsOn?: string;
  endsOn?: string;
  startTime?: string;
  endTime?: string;
  distanceMeters: number;
  geometry: GeoJSON.Geometry;
};

type ParkingSearchResult = {
  schemaVersion: 1;
  destination: Destination;
  radiusMeters: number; // 100..1000
  generatedAt: string;
  sources: {
    streetParking: SourceState;
    parkingZones: SourceState;
    plannedEvents: SourceState;
  };
  supply?: {
    mappedSpaces: number;
    unrestrictedSpaces: number;
    conditionalSpaces: number;
    restrictedSpaces: number;
    unknownSpaces: number;
    featureCount: number;
    streets: Array<{
      name: string;
      mappedSpaces: number;
      nearestFeatureMeters: number;
    }>;
  };
  candidates: ParkingCandidate[];
  zones: ParkingZone[];
  events: PlannedEvent[];
  assessment?: {
    level: "lower" | "moderate" | "higher";
    basis: string[];
    methodVersion: string;
    label: "mapped-supply estimate";
  };
  availabilityProbability?: never; // Add only after calibration evidence and an approved model.
  expectedSearchMinutes?: never; // Not supported by current sources.
  walkingDistanceMeters?: never; // Requires a pedestrian routing source, not straight-line geometry distance.
  carParks?: never; // Requires a verified car-park source.
};
```

Implementation rules:

- `SourceState.status: "empty"` means the request succeeded with no matching records; unavailable or failed requests must not be represented as zero supply/no events.
- Each feature is classified into a `usability` of `usable`, `conditional`, `restricted`, or `unknown`. Raw source values are preserved (`sourceCategory`, `rules`); missing or unrecognized values become `unknown` and are not counted as available capacity.
- `candidates` carries one entry per eligible feature — `usable` or `conditional` with positive mapped capacity — so a result names specific mapped areas instead of only street-wide totals. Each entry keeps its own EPSG:25833 `geometry` and straight-line `distanceMeters`, the `usability`, and the layer's source rule fields (`restriction`, `hours`, `fee`, `maxStay`). Restricted and unknown features are never candidates. The array is always present, ranked with unrestricted segments first and then by mapped spaces / (straight-line metres + 100), and capped at 25 while retaining the best distinct named streets; it is empty when nothing qualifies. The first and backup suggestions use different named streets when the data allows it; no backup is shown otherwise. A partial source response retains its partial status alongside any suggestions.
- Geometry inclusion uses the actual selected radius after the WFS BBOX candidate query. Distance is straight-line to geometry unless an explicitly named routing source is introduced.
- A supply difficulty band, if shown, must have documented deterministic thresholds and be labelled as an estimate from mapped supply. Its basis must cite available data fields and never imply observed occupancy.
- The current mapped-supply label uses total mapped spaces in the selected radius: fewer than 400 is scarce, 400–1,200 is moderate, and more than 1,200 is ample. This is a fixed descriptive band, not a prediction of finding a free space; the result shows unrestricted, conditional, restricted, and unknown capacity separately. Revisit these bands only with observed calibration data.
- Street suggestions group distinct street names and count only mapped unrestricted or conditional spaces with positive capacity. Conditional restrictions may apply; users must check on-site signs. Distance is straight-line to the nearest eligible mapped feature.
- Do not return a finding probability or expected search duration from these sources. Walking distance requires routing data. Named garages require an independently verified garage dataset.
- Parking-zone attributes are informational and must be accompanied by the official-signage caveat. Event list filtering uses event validity dates and discloses the source's stated 14-day start horizon.
