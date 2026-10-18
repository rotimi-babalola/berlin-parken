import {
  TILE_SIZE,
  lonLatToTile,
  metersPerPixel,
  tileUrl,
  zoomForRadius,
} from "@/lib/tiles";
import { candidateMapPoint } from "@/lib/candidate-map";
import { useLocale } from "@/lib/i18n";
import type { ParkingCandidate } from "@/lib/parking";
import type { WalkingRoute } from "@/lib/walking-route";
import styles from "./signal.module.css";

type Props = {
  longitude: number;
  latitude: number;
  radiusMeters: number;
  destination: string;
  areas: ParkingCandidate[];
  walking?: Record<string, WalkingRoute | null> | null;
};

// Static 3×3 tile collage centred on the destination, with suggested area
// pins and a radius ring. Failed tiles leave the tinted backdrop visible.
export function LocationMap({
  longitude,
  latitude,
  radiusMeters,
  destination,
  areas,
  walking,
}: Props) {
  const { t } = useLocale();
  const mapLabel = [
    t("signal.mapLabel", { destination }),
    ...areas.map(
      (area, index) =>
        `${t(index === 0 ? "signal.firstArea" : "signal.backupArea")}: ${area.streetName}`,
    ),
  ].join(". ");
  const points = areas.map((area) =>
    candidateMapPoint(area, longitude, latitude),
  );
  const routePoints = areas.flatMap((area) =>
    (walking?.[area.id]?.coordinates ?? []).map(([longitude, latitude]) => ({
      longitude,
      latitude,
    })),
  );
  let zoom = zoomForRadius(radiusMeters);
  let centre = lonLatToTile(longitude, latitude, zoom);
  // Keep both pins within the smallest map viewport (280 px high).
  while (
    zoom > 0 &&
    [...points, ...routePoints].some((point) => {
      const tile = lonLatToTile(point.longitude, point.latitude, zoom);
      return (
        Math.abs((tile.x - centre.x) * TILE_SIZE + tile.px - centre.px) > 100 ||
        Math.abs((tile.y - centre.y) * TILE_SIZE + tile.py - centre.py) > 100
      );
    })
  ) {
    zoom--;
    centre = lonLatToTile(longitude, latitude, zoom);
  }
  // NEXT_PUBLIC_: basemap keys are public by design (referrer-restricted
  // in the CARTO dashboard); without one the tiles show a watermark.
  const key = process.env.NEXT_PUBLIC_CARTO_API_KEY;
  const ringDiameter = Math.round(
    (radiusMeters * 2) / metersPerPixel(latitude, zoom),
  );
  const tiles = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      tiles.push({ x: centre.x + dx, y: centre.y + dy });
    }
  }

  return (
    <div className={styles.locationMap} role="img" aria-label={mapLabel}>
      <div
        className={styles.tileGrid}
        aria-hidden="true"
        style={{
          left: `calc(50% - ${TILE_SIZE + centre.px}px)`,
          top: `calc(50% - ${TILE_SIZE + centre.py}px)`,
        }}
      >
        {tiles.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element -- CARTO serves fixed 256px tiles; Next optimization would add latency, not value.
          <img
            key={`${tile.x}/${tile.y}`}
            className={styles.tile}
            src={tileUrl(tile.x, tile.y, zoom, key)}
            alt=""
            loading="lazy"
            draggable={false}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ))}
      </div>
      <span
        className={styles.radiusRing}
        aria-hidden="true"
        style={{ width: ringDiameter, height: ringDiameter }}
      />
      {areas.map((area, index) => {
        const route = walking?.[area.id];
        if (!route) return null;
        const path = route.coordinates
          .map(([lon, lat]) => {
            const tile = lonLatToTile(lon, lat, zoom);
            return `${(tile.x - centre.x) * TILE_SIZE + tile.px - centre.px},${(tile.y - centre.y) * TILE_SIZE + tile.py - centre.py}`;
          })
          .join(" ");
        return (
          <svg key={area.id} className={styles.walkPath} aria-hidden="true">
            <polyline
              points={path}
              stroke={index === 0 ? "#a13120" : "#37684a"}
            />
          </svg>
        );
      })}
      <span className={styles.destinationPin} aria-hidden="true">
        ⌂
      </span>
      {areas.map((area, index) => {
        const tile = lonLatToTile(
          points[index].longitude,
          points[index].latitude,
          zoom,
        );
        return (
          <span
            key={area.id}
            className={`${styles.areaPin} ${index === 1 ? styles.backupPin : ""}`}
            style={{
              left: `calc(50% + ${(tile.x - centre.x) * TILE_SIZE + tile.px - centre.px}px)`,
              top: `calc(50% + ${(tile.y - centre.y) * TILE_SIZE + tile.py - centre.py}px)`,
            }}
            aria-hidden="true"
          >
            {index + 1}
          </span>
        );
      })}
      {areas.length > 0 && (
        <span className={styles.mapLegend} aria-hidden="true">
          {areas.map((area, index) => (
            <span key={area.id}>
              <b className={index === 1 ? styles.backupLegend : ""}>
                {index + 1}
              </b>
              {area.streetName}
            </span>
          ))}
        </span>
      )}
      <span className={styles.mapCredit} aria-hidden="true">
        {t("signal.mapTiles")}{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          tabIndex={-1}
        >
          OpenStreetMap
        </a>{" "}
        ·{" "}
        <a
          href="https://carto.com/attributions"
          target="_blank"
          rel="noreferrer"
          tabIndex={-1}
        >
          CARTO
        </a>
      </span>
    </div>
  );
}
