import {
  TILE_SIZE,
  lonLatToTile,
  metersPerPixel,
  tileUrl,
  zoomForRadius,
} from "@/lib/tiles";
import { useLocale } from "@/lib/i18n";
import styles from "./signal.module.css";

type Props = {
  longitude: number;
  latitude: number;
  radiusMeters: number;
  destination: string;
};

// Dumb: static 3×3 tile collage centred on the destination, with a pin
// and a radius ring. No map library, no interactivity; tiles that fail
// to load (e.g. offline) hide themselves, leaving the tinted backdrop.
export function LocationMap({
  longitude,
  latitude,
  radiusMeters,
  destination,
}: Props) {
  const { t } = useLocale();
  const zoom = zoomForRadius(radiusMeters);
  const centre = lonLatToTile(longitude, latitude, zoom);
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
    <div
      className={styles.locationMap}
      role="img"
      aria-label={t("signal.mapLabel", { destination })}
    >
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
      <span className={styles.mapPin} aria-hidden="true">
        P
      </span>
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
