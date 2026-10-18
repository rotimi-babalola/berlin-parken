import {
  TILE_SIZE,
  lonLatToTile,
  metersPerPixel,
  tileUrl,
  zoomForRadius,
} from "@/lib/tiles";
import { useEffect, useRef, useState } from "react";
import { candidateMapPoint } from "@/lib/candidate-map";
import { House } from "@/components/icons";
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

// Tile collage centred on the destination (grown to fill the map box), with
// suggested area pins and a radius ring. Failed tiles leave the tinted
// backdrop visible.
export function LocationMap({
  longitude,
  latitude,
  radiusMeters,
  destination,
  areas,
  walking,
}: Props) {
  const { t } = useLocale();
  const [box, setBox] = useState({ width: 0, height: 0 });
  const mapRef = useRef<HTMLDivElement>(null);
  // The collage grows with the map box; before the first measurement it stays
  // the 3×3 grid the server rendered.
  useEffect(() => {
    const node = mapRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setBox({ width: node.clientWidth, height: node.clientHeight });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
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
  // Enough tiles to cover the whole map box, so a wide map has no flat
  // backdrop bar beside the collage.
  const halfWidth = box.width / 2;
  const halfHeight = box.height / 2;
  const minDx = Math.min(-1, Math.floor((centre.px - halfWidth) / TILE_SIZE));
  const maxDx = Math.max(1, Math.ceil((halfWidth + centre.px) / TILE_SIZE) - 1);
  const minDy = Math.min(-1, Math.floor((centre.py - halfHeight) / TILE_SIZE));
  const maxDy = Math.max(
    1,
    Math.ceil((halfHeight + centre.py) / TILE_SIZE) - 1,
  );
  const worldTiles = 2 ** zoom;
  const tiles = [];
  for (let dx = minDx; dx <= maxDx; dx += 1) {
    for (let dy = minDy; dy <= maxDy; dy += 1) {
      const x = centre.x + dx;
      const y = centre.y + dy;
      // Off-world tiles (only reachable at low zoom) would 404.
      if (x < 0 || y < 0 || x >= worldTiles || y >= worldTiles) continue;
      tiles.push({ x, y });
    }
  }

  return (
    <div
      className={styles.locationMap}
      ref={mapRef}
      role="img"
      aria-label={mapLabel}
    >
      <div
        className={styles.tileGrid}
        aria-hidden="true"
        style={{
          // The first column/row is tile `minDx`/`minDy`, not the centre tile.
          left: `calc(50% - ${centre.px - minDx * TILE_SIZE}px)`,
          top: `calc(50% - ${centre.py - minDy * TILE_SIZE}px)`,
          gridTemplateColumns: `repeat(${maxDx - minDx + 1}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${maxDy - minDy + 1}, ${TILE_SIZE}px)`,
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
        <House />
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
