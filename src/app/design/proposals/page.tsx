"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import styles from "./page.module.css";

type Direction = "signal" | "atlas" | "night";

type Sample = {
  address: string;
  district: string;
  street: string;
  alternate: string;
  zone: string;
  event: string;
  streets: {
    name: string;
    distance: number;
    mapped: number;
    restricted: number;
    note: string;
  }[];
  zones: { name: string; distance: number; hours: string; fee: string }[];
  events: {
    type: string;
    street: string;
    distance: number;
    dates: string;
    hours: string;
    impact: string;
  }[];
};

const samples: Sample[] = [
  {
    address: "Torstraße 101, Berlin-Mitte",
    district: "Mitte",
    street: "Torstraße",
    alternate: "Alte Schönhauser Straße",
    zone: "Managed zone · sample hours 09:00–20:00",
    event: "Planned roadwork nearby",
    streets: [
      {
        name: "Torstraße",
        distance: 35,
        mapped: 210,
        restricted: 20,
        note: "Mostly conditional parking; check signs for each section.",
      },
      {
        name: "Alte Schönhauser Straße",
        distance: 180,
        mapped: 116,
        restricted: 10,
        note: "Conditional parking with paid-zone rules.",
      },
      {
        name: "Linienstraße",
        distance: 280,
        mapped: 84,
        restricted: 16,
        note: "Some restricted sections in this sample.",
      },
    ],
    zones: [
      {
        name: "Zone 29 · Mitte",
        distance: 0,
        hours: "Mon–Sun 09:00–24:00",
        fee: "€4.00 per hour",
      },
      {
        name: "Zone 14 · Mitte",
        distance: 160,
        hours: "Mon–Fri 09:00–20:00 · Sat 09:00–18:00",
        fee: "€3.00 per hour",
      },
      {
        name: "Zone 42 · Mitte",
        distance: 340,
        hours: "Mon–Sat 09:00–22:00",
        fee: "€2.00 per hour",
      },
    ],
    events: [
      {
        type: "Roadwork",
        street: "Linienstraße",
        distance: 65,
        dates: "21 Sep–16 Oct 2026",
        hours: "07:00–17:00",
        impact: "No stopping in signed sections.",
      },
      {
        type: "Lane closure",
        street: "Torstraße",
        distance: 240,
        dates: "29 Sep 2026",
        hours: "06:00–12:00",
        impact: "One traffic lane affected.",
      },
      {
        type: "Worksite",
        street: "Rosa-Luxemburg-Straße",
        distance: 360,
        dates: "30 Sep–2 Oct 2026",
        hours: "08:00–18:00",
        impact: "Temporary stopping restrictions may apply.",
      },
    ],
  },
  {
    address: "Kantstraße 72, Berlin-Charlottenburg",
    district: "Charlottenburg",
    street: "Kantstraße",
    alternate: "Wilmersdorfer Straße",
    zone: "Managed zone · sample hours 09:00–22:00",
    event: "No event in this sample",
    streets: [
      {
        name: "Kantstraße",
        distance: 30,
        mapped: 160,
        restricted: 15,
        note: "Conditional street parking; paid-zone signs apply.",
      },
      {
        name: "Wilmersdorfer Straße",
        distance: 180,
        mapped: 105,
        restricted: 15,
        note: "Mixed conditional and restricted sections.",
      },
      {
        name: "Windscheidstraße",
        distance: 360,
        mapped: 55,
        restricted: 10,
        note: "Conditional parking in this sample.",
      },
    ],
    zones: [
      {
        name: "Zone 8 · Charlottenburg",
        distance: 0,
        hours: "Mon–Sat 09:00–22:00",
        fee: "€3.00 per hour",
      },
      {
        name: "Zone 9 · Charlottenburg",
        distance: 290,
        hours: "Mon–Fri 09:00–20:00",
        fee: "€2.00 per hour",
      },
    ],
    events: [],
  },
  {
    address: "Hauptstraße 5, Berlin-Schöneberg",
    district: "Schöneberg",
    street: "Hauptstraße",
    alternate: "Belziger Straße",
    zone: "Managed zone · sample hours 09:00–20:00",
    event: "Planned street event nearby",
    streets: [
      {
        name: "Hauptstraße",
        distance: 20,
        mapped: 120,
        restricted: 10,
        note: "Conditional parking; some signed loading areas.",
      },
      {
        name: "Belziger Straße",
        distance: 180,
        mapped: 90,
        restricted: 10,
        note: "Conditional parking under local zone rules.",
      },
      {
        name: "Eisenacher Straße",
        distance: 330,
        mapped: 44,
        restricted: 9,
        note: "Some restricted sections in this sample.",
      },
    ],
    zones: [
      {
        name: "Zone 43 · Schöneberg",
        distance: 0,
        hours: "Mon–Fri 09:00–20:00 · Sat 09:00–18:00",
        fee: "€3.00 per hour",
      },
      {
        name: "Zone 44 · Schöneberg",
        distance: 260,
        hours: "Mon–Sat 09:00–20:00",
        fee: "€2.00 per hour",
      },
    ],
    events: [
      {
        type: "Street event",
        street: "Belziger Straße",
        distance: 105,
        dates: "28–29 Sep 2026",
        hours: "10:00–18:00",
        impact: "Temporary no-parking signs may apply.",
      },
    ],
  },
];

type Result = { sample: Sample; radius: number };
const directions: {
  id: Direction;
  number: string;
  name: string;
  detail: string;
}[] = [
  {
    id: "signal",
    number: "01",
    name: "City Signal",
    detail: "Bright · direct",
  },
  {
    id: "atlas",
    number: "02",
    name: "Street Atlas",
    detail: "Editorial · civic",
  },
  { id: "night", number: "03", name: "Night Route", detail: "Dark · compact" },
];

function DemoForm({
  query,
  radius,
  error,
  onQuery,
  onRadius,
  onSubmit,
}: {
  query: string;
  radius: number;
  error: string;
  onQuery: (value: string) => void;
  onRadius: (value: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className={styles.searchForm} onSubmit={onSubmit}>
      <label htmlFor="demo-address">Berlin destination</label>
      <div className={styles.searchLine}>
        <input
          id="demo-address"
          name="address"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          list="demo-addresses"
          autoComplete="off"
          placeholder="Choose a sample address"
          aria-describedby="demo-hint demo-error"
          aria-invalid={Boolean(error)}
        />
        <datalist id="demo-addresses">
          {samples.map((sample) => (
            <option key={sample.address} value={sample.address} />
          ))}
        </datalist>
        <button type="submit">
          Check nearby <span aria-hidden="true">↗</span>
        </button>
      </div>
      <div className={styles.radiusLine}>
        <label htmlFor="demo-radius">Walking radius</label>
        <output htmlFor="demo-radius">{radius} m</output>
      </div>
      <input
        className={styles.radiusInput}
        id="demo-radius"
        type="range"
        min="100"
        max="1000"
        step="100"
        value={radius}
        onChange={(event) => onRadius(Number(event.target.value))}
      />
      <p id="demo-hint" className={styles.demoHint}>
        Demo: choose one of these sample addresses or type its full address.
      </p>
      <div
        className={styles.sampleChoices}
        role="group"
        aria-label="Sample addresses"
      >
        {samples.map((sample) => (
          <button
            key={sample.address}
            type="button"
            onClick={() => onQuery(sample.address)}
            aria-label={`Use ${sample.address}`}
          >
            {sample.district}
          </button>
        ))}
      </div>
      <p
        id="demo-error"
        className={styles.formError}
        role={error ? "alert" : undefined}
      >
        {error}
      </p>
    </form>
  );
}

function MapArt({ destination }: { destination: string }) {
  return (
    <div
      className={styles.mapArt}
      role="img"
      aria-label={"Stylized street map near " + destination}
    >
      <span className={styles.roadOne} />
      <span className={styles.roadTwo} />
      <span className={styles.roadThree} />
      <span className={styles.roadFour} />
      <span className={styles.mapCircle} />
      <span className={styles.mapPin}>P</span>
      <span className={styles.mapStreet}>BERLIN STREETS</span>
    </div>
  );
}

function Brand() {
  return (
    <span className={styles.brand}>
      <span className={styles.brandBars} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      berlin<strong>parken</strong>
    </span>
  );
}

function alternateStreet(result: Result) {
  return result.sample.streets.some(
    (street) =>
      street.name === result.sample.alternate &&
      street.distance <= result.radius,
  )
    ? result.sample.alternate
    : "No second street in this sample radius";
}

function mappedSpaces(result: Result) {
  return result.sample.streets
    .filter((street) => street.distance <= result.radius)
    .reduce((total, street) => total + street.mapped, 0);
}

function eventNote(result: Result) {
  return result.sample.events.some((event) => event.distance <= result.radius)
    ? result.sample.event
    : "No event in this sample radius";
}

function DetailCarousel({
  label,
  items,
  itemsPerPage,
}: {
  label: string;
  items: { title: string; content: React.ReactNode }[];
  itemsPerPage: number;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(items.length / itemsPerPage);
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * itemsPerPage;
  const visibleItems = items.slice(start, start + itemsPerPage);

  return (
    <div className={styles.detailCarousel} role="group" aria-label={label}>
      <div className={styles.detailSlide}>
        {visibleItems.map((item) => (
          <div key={item.title}>{item.content}</div>
        ))}
      </div>
      {pageCount > 1 && (
        <div className={styles.carouselControls}>
          <button
            type="button"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 0}
            aria-label={`Previous ${label.toLowerCase()}`}
          >
            ← Previous
          </button>
          <span
            className={styles.carouselPosition}
            role="status"
            aria-live="polite"
          >
            {start + 1}–{Math.min(start + itemsPerPage, items.length)} of{" "}
            {items.length}
            <span className={styles.visuallyHidden}>
              {" "}
              {label}: {visibleItems.map((item) => item.title).join(", ")}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage === pageCount - 1}
            aria-label={`Next ${label.toLowerCase()}`}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function DetailPanels({
  result,
  itemsPerPage,
}: {
  result: Result;
  itemsPerPage: number;
}) {
  const streets = result.sample.streets.filter(
    (street) => street.distance <= result.radius,
  );
  const zones = result.sample.zones.filter(
    (zone) => zone.distance <= result.radius,
  );
  const events = result.sample.events.filter(
    (event) => event.distance <= result.radius,
  );

  return (
    <section className={styles.exploreDetails} aria-labelledby="explore-title">
      <div className={styles.detailHeading}>
        <div>
          <span className={styles.eyebrow}>THE FULL PICTURE</span>
          <h2 id="explore-title">Explore nearby details</h2>
        </div>
        <p>
          {result.sample.address} · within {result.radius} m
        </p>
      </div>
      <div
        className={styles.detailGrid}
        style={
          {
            "--detail-card-height": `${190 + itemsPerPage * 125}px`,
          } as CSSProperties
        }
      >
        <details>
          <summary>
            <span>
              <small>01 / STREET INVENTORY</small>
              <strong>Nearby streets</strong>
            </span>
            <span className={styles.detailCount}>
              {streets.length} {streets.length === 1 ? "street" : "streets"}{" "}
              <b aria-hidden="true">＋</b>
            </span>
          </summary>
          <div className={styles.detailBody}>
            <DetailCarousel
              label="Nearby streets"
              itemsPerPage={itemsPerPage}
              items={streets.map((street) => ({
                title: street.name,
                content: (
                  <div className={styles.detailItem}>
                    <div className={styles.detailItemTop}>
                      <strong>{street.name}</strong>
                      <span>{street.distance} m away</span>
                    </div>
                    <p>
                      <b>{street.mapped} mapped spaces</b>
                      <br />
                      {street.mapped - street.restricted} conditional ·{" "}
                      {street.restricted} restricted
                      <br />
                      {street.note}
                    </p>
                  </div>
                ),
              }))}
            />
            <p className={styles.detailCaveat}>
              Conditional spaces may have time or permit rules. Mapped capacity
              is not live availability; check signs on site.
            </p>
          </div>
        </details>
        <details>
          <summary>
            <span>
              <small>02 / PARKING RULES</small>
              <strong>Parking management zones</strong>
            </span>
            <span className={styles.detailCount}>
              {zones.length} {zones.length === 1 ? "zone" : "zones"}{" "}
              <b aria-hidden="true">＋</b>
            </span>
          </summary>
          <div className={styles.detailBody}>
            <DetailCarousel
              label="Parking management zones"
              itemsPerPage={itemsPerPage}
              items={zones.map((zone) => ({
                title: zone.name,
                content: (
                  <div className={styles.detailItem}>
                    <div className={styles.detailItemTop}>
                      <strong>{zone.name}</strong>
                      <span>{zone.distance} m away</span>
                    </div>
                    <p>
                      <b>Hours:</b> {zone.hours}
                      <br />
                      <b>Fee:</b> {zone.fee}
                    </p>
                  </div>
                ),
              }))}
            />
            <p className={styles.detailCaveat}>
              Hours and fees are illustrative. Local sections may differ; follow
              posted signs.
            </p>
          </div>
        </details>
        <details>
          <summary>
            <span>
              <small>03 / PLANNED CHANGES</small>
              <strong>Street events</strong>
            </span>
            <span className={styles.detailCount}>
              {events.length} {events.length === 1 ? "event" : "events"}{" "}
              <b aria-hidden="true">＋</b>
            </span>
          </summary>
          <div className={styles.detailBody}>
            {events.length ? (
              <DetailCarousel
                label="Street events"
                itemsPerPage={itemsPerPage}
                items={events.map((event) => ({
                  title: `${event.type} · ${event.street}`,
                  content: (
                    <div className={styles.detailItem}>
                      <div className={styles.detailItemTop}>
                        <strong>
                          {event.type} · {event.street}
                        </strong>
                        <span>{event.distance} m away</span>
                      </div>
                      <p>
                        <b>{event.dates}</b> · {event.hours}
                        <br />
                        {event.impact}
                      </p>
                    </div>
                  ),
                }))}
              />
            ) : (
              <p className={styles.detailEmpty}>
                No event in this sample radius.
              </p>
            )}
            <p className={styles.detailCaveat}>
              The live event feed may not include every disruption. An empty
              list does not confirm streets are clear.
            </p>
          </div>
        </details>
      </div>
      <p className={styles.detailSource}>
        Synthetic records for design review. Live results show Berlin Open Data
        sources and retrieval times.
      </p>
    </section>
  );
}

function Signal({
  form,
  result,
  itemsPerPage,
}: {
  form: React.ReactNode;
  result: Result | null;
  itemsPerPage: number;
}) {
  const mapped = result ? mappedSpaces(result) : 0;
  return (
    <div className={styles.signal}>
      <header className={styles.pageHeader}>
        <Brand />
        <span>PLAN THE LAST 500 METRES</span>
        <a href="#search">Start searching ↗</a>
      </header>
      <main>
        <section className={styles.signalHero}>
          <div className={styles.signalIntro}>
            <h1>
              Arrive knowing <br />
              <em>where to look.</em>
            </h1>
            <p>
              Search a destination to explore mapped street spaces, parking
              rules and planned changes nearby.
            </p>
            <span className={styles.signalChip}>
              Mapped supply, never live occupancy
            </span>
          </div>
          <div className={styles.signalPanel} id="search">
            <div className={styles.panelTop}>
              <span>YOUR DESTINATION</span>
              <span>01 / 03</span>
            </div>
            {form}
          </div>
        </section>
        <section className={styles.signalResults} aria-live="polite">
          {result ? (
            <>
              <div className={styles.signalMetric}>
                <span>ILLUSTRATIVE RESULT · {result.radius} M</span>
                <strong>{mapped.toLocaleString("en-US")}</strong>
                <p>mapped spaces around {result.sample.district}</p>
                <small>
                  Mock count for design review. Availability is unknown.
                </small>
              </div>
              <div className={styles.signalMap}>
                <MapArt destination={result.sample.address} />
              </div>
              <div className={styles.signalDetails}>
                <span>WHAT YOU CAN CHECK</span>
                <div>
                  <b>01</b>
                  <strong>{result.sample.street}</strong>
                  <small>Street inventory</small>
                </div>
                <div>
                  <b>02</b>
                  <strong>Paid-zone guidance</strong>
                  <small>{result.sample.zone}</small>
                </div>
                <div>
                  <b>03</b>
                  <strong>Planned changes</strong>
                  <small>{eventNote(result)}</small>
                </div>
                <a className={styles.detailsJump} href="#explore-title">
                  Explore all details ↓
                </a>
              </div>
            </>
          ) : (
            <p className={styles.emptyResult}>
              Choose a sample destination above to see a parking overview here.
            </p>
          )}
        </section>
        {result && (
          <DetailPanels
            key={result.sample.address + result.radius}
            result={result}
            itemsPerPage={itemsPerPage}
          />
        )}
        <footer className={styles.pageFooter}>
          Concept preview using synthetic data. In the live app, Berlin Open
          Data provides mapped supply and context. Follow signs on site.
        </footer>
      </main>
    </div>
  );
}

function Atlas({
  form,
  result,
  itemsPerPage,
}: {
  form: React.ReactNode;
  result: Result | null;
  itemsPerPage: number;
}) {
  const mapped = result ? mappedSpaces(result) : 0;
  return (
    <div className={styles.atlas}>
      <header className={styles.pageHeader}>
        <Brand />
        <span>THE STREET PARKING FIELD GUIDE</span>
        <a href="#search">Open the index ↗</a>
      </header>
      <main>
        <section className={styles.atlasHero}>
          <div className={styles.atlasIssue}>
            <span>NO. 01 / BERLIN</span>
            <span>BEFORE YOU SET OFF</span>
          </div>
          <h1>
            Read the street
            <br />
            <em>before you drive.</em>
          </h1>
          <p>
            Every Berlin address has a story: where spaces are mapped, what
            rules apply, and what may change. Start with yours.
          </p>
        </section>
        <section className={styles.atlasSearch} id="search">
          <div>
            <span className={styles.eyebrow}>01 / THE LOOKUP</span>
            <h2>Where are you going?</h2>
          </div>
          {form}
        </section>
        <section className={styles.atlasResults} aria-live="polite">
          {result ? (
            <>
              <div className={styles.atlasMapBlock}>
                <div className={styles.atlasMapHead}>
                  <span>FIG. 01</span>
                  <span>
                    {result.sample.district.toUpperCase()} / {result.radius} M
                  </span>
                </div>
                <MapArt destination={result.sample.address} />
                <small>
                  Illustrative diagram; streets and counts are demo content.
                </small>
              </div>
              <div className={styles.atlasLedger}>
                <span className={styles.eyebrow}>02 / THE READING</span>
                <h2>{result.sample.district}, at a glance.</h2>
                <div className={styles.atlasBigNumber}>
                  <strong>{mapped.toLocaleString("en-US")}</strong>
                  <span>
                    mapped spaces
                    <br />
                    in this mock result
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>First street to inspect</dt>
                    <dd>{result.sample.street}</dd>
                  </div>
                  <div>
                    <dt>Another nearby street</dt>
                    <dd>{alternateStreet(result)}</dd>
                  </div>
                  <div>
                    <dt>Managed parking</dt>
                    <dd>{result.sample.zone}</dd>
                  </div>
                  <div>
                    <dt>Street changes</dt>
                    <dd>{eventNote(result)}</dd>
                  </div>
                </dl>
                <p>
                  Mapped spaces do not tell you which are free now. Check local
                  signs for restrictions.
                </p>
                <a className={styles.detailsJump} href="#explore-title">
                  Explore all details ↓
                </a>
              </div>
            </>
          ) : (
            <p className={styles.emptyResult}>
              The field notes appear here after you choose a sample address.
            </p>
          )}
        </section>
        {result && (
          <DetailPanels
            key={result.sample.address + result.radius}
            result={result}
            itemsPerPage={itemsPerPage}
          />
        )}
        <footer className={styles.pageFooter}>
          DESIGN STUDY / SYNTHETIC DATA{" "}
          <span>
            Live product sources: Berlin Open Data · Local signs take priority
          </span>
        </footer>
      </main>
    </div>
  );
}

function Night({
  form,
  result,
  itemsPerPage,
}: {
  form: React.ReactNode;
  result: Result | null;
  itemsPerPage: number;
}) {
  const mapped = result ? mappedSpaces(result) : 0;
  return (
    <div className={styles.night}>
      <header className={styles.pageHeader}>
        <Brand />
        <span>
          <i className={styles.onlineDot} /> BERLIN / PRE-TRIP VIEW
        </span>
        <a href="#search">Check destination ↗</a>
      </header>
      <main>
        <section className={styles.nightHero}>
          <div>
            <span className={styles.eyebrow}>
              PARKING INTELLIGENCE FOR BERLIN
            </span>
            <h1>
              Go in with
              <br />
              <em>a plan.</em>
            </h1>
            <p>
              One address. A clearer picture of mapped parking, zone rules, and
              planned street events.
            </p>
          </div>
          <div className={styles.nightSearch} id="search">
            <div className={styles.panelTop}>
              <span>DESTINATION CHECK</span>
              <span>BERLIN ONLY</span>
            </div>
            {form}
          </div>
        </section>
        <section className={styles.nightDashboard} aria-live="polite">
          {result ? (
            <>
              <div className={styles.nightScore}>
                <span>
                  SAMPLE / {result.sample.district.toUpperCase()} /{" "}
                  {result.radius} M
                </span>
                <strong>{mapped.toLocaleString("en-US")}</strong>
                <p>MAPPED SPACES</p>
                <div className={styles.bars} aria-hidden="true">
                  {Array.from({ length: 9 }, (_, i) => (
                    <i key={i} />
                  ))}
                </div>
                <small>
                  Illustrative inventory count. Live occupancy is not measured.
                </small>
              </div>
              <div className={styles.nightList}>
                <span>STREET INTEL</span>
                <div>
                  <b>01</b>
                  <strong>{result.sample.street}</strong>
                  <small>Mapped street inventory</small>
                </div>
                <div>
                  <b>02</b>
                  <strong>{alternateStreet(result)}</strong>
                  <small>Another street to inspect</small>
                </div>
                <div>
                  <b>03</b>
                  <strong>Zone guidance</strong>
                  <small>{result.sample.zone}</small>
                </div>
                <div>
                  <b>04</b>
                  <strong>Planned events</strong>
                  <small>{eventNote(result)}</small>
                </div>
                <a className={styles.detailsJump} href="#explore-title">
                  Explore all details ↓
                </a>
              </div>
              <div className={styles.nightMap}>
                <MapArt destination={result.sample.address} />
                <div>
                  <span>DESTINATION VIEW</span>
                  <strong>{result.sample.address}</strong>
                </div>
              </div>
            </>
          ) : (
            <p className={styles.emptyResult}>
              Choose a sample address to load the mock dashboard.
            </p>
          )}
        </section>
        {result && (
          <DetailPanels
            key={result.sample.address + result.radius}
            result={result}
            itemsPerPage={itemsPerPage}
          />
        )}
        <footer className={styles.pageFooter}>
          SYNTHETIC DATA FOR DESIGN REVIEW{" "}
          <span>
            Real results use Berlin Open Data. Always follow signs on site.
          </span>
        </footer>
      </main>
    </div>
  );
}

export default function Proposals() {
  const [direction, setDirection] = useState<Direction>("signal");
  const [itemsPerPage, setItemsPerPage] = useState(2);
  const [query, setQuery] = useState<string>(samples[0].address);
  const [radius, setRadius] = useState(500);
  const [result, setResult] = useState<Result | null>({
    sample: samples[0],
    radius: 500,
  });
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sample = samples.find(
      (item) =>
        item.address.toLocaleLowerCase("de-DE") ===
        query.trim().toLocaleLowerCase("de-DE"),
    );
    if (!sample) {
      setResult(null);
      setError(
        "Choose one of the three sample addresses to view mock results.",
      );
      return;
    }
    setError("");
    setResult({ sample, radius });
  }

  const form = (
    <DemoForm
      query={query}
      radius={radius}
      error={error}
      onQuery={(value) => {
        setQuery(value);
        setResult(null);
        setError("");
      }}
      onRadius={(value) => {
        setRadius(value);
        setResult(null);
      }}
      onSubmit={submit}
    />
  );
  return (
    <div className={styles.review}>
      <div className={styles.reviewBar}>
        <div>
          <strong>Three one-page concepts</strong>
          <small>Functional mock search · Temporary route</small>
        </div>
        <nav aria-label="Design options">
          {directions.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={direction === item.id}
              onClick={() => setDirection(item.id)}
            >
              <small>{item.number}</small>
              <span>{item.name}</span>
              <em>{item.detail}</em>
            </button>
          ))}
        </nav>
        <label className={styles.pageSizeControl}>
          Items per card
          <select
            value={itemsPerPage}
            onChange={(event) => setItemsPerPage(Number(event.target.value))}
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </label>
      </div>
      {direction === "signal" ? (
        <Signal form={form} result={result} itemsPerPage={itemsPerPage} />
      ) : direction === "atlas" ? (
        <Atlas form={form} result={result} itemsPerPage={itemsPerPage} />
      ) : (
        <Night form={form} result={result} itemsPerPage={itemsPerPage} />
      )}
    </div>
  );
}
