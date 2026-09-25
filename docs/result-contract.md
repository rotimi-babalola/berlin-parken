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

type ParkingCategory =
  | "unrestricted"
  | "time_limited"
  | "duration_limited"
  | "user_group"
  | "loading_zone"
  | "prohibited"
  | "unknown";

type StreetParkingFeature = {
  id: string;
  streetName?: string;
  category: ParkingCategory;
  sourceCategory?: string;
  mappedSpaces?: number;
  publicStreetLand?: boolean;
  distanceMeters: number;
  geometry: GeoJSON.Geometry;
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
- Source categories are preserved alongside a normalized category. Missing or unrecognized values map to `unknown` and are not counted as available capacity.
- Geometry inclusion uses the actual selected radius after the WFS BBOX candidate query. Distance is straight-line to geometry unless an explicitly named routing source is introduced.
- A supply difficulty band, if shown, must have documented deterministic thresholds and be labelled as an estimate from mapped supply. Its basis must cite available data fields and never imply observed occupancy.
- Do not return a finding probability or expected search duration from these sources. Walking distance requires routing data. Named garages require an independently verified garage dataset.
- Parking-zone attributes are informational and must be accompanied by the official-signage caveat. Event list filtering uses event validity dates and discloses the source's stated 14-day start horizon.
