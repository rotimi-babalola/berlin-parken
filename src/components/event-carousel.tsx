"use client";

import { useState } from "react";
import type { PlannedEvent } from "@/lib/parking-context";
import styles from "./address-search.module.css";

const EVENTS_PER_PAGE = 5;

// Dumb: one event row.
function EventItem({ event }: { event: PlannedEvent }) {
  return (
    <li>
      <strong>{event.type ?? "Planned event"}</strong>
      {event.street ? ` · ${event.street}` : ""}
      {event.borough ? `, ${event.borough}` : ""} · {event.distanceMeters} m
      away
      {event.startsOn || event.endsOn ? (
        <div>
          {event.startsOn ?? "Date unknown"}
          {event.endsOn ? ` – ${event.endsOn}` : ""}
          {event.startTime ? ` · ${event.startTime}` : ""}
          {event.endTime ? `–${event.endTime}` : ""}
        </div>
      ) : null}
      {event.restriction ? <div>{event.restriction}</div> : null}
    </li>
  );
}

// Dumb: paged event list — 5 per view, prev/next to see more.
// Page index is local UI state; it resets whenever a new result arrives.
export function EventCarousel({ items }: { items: PlannedEvent[] }) {
  const [page, setPage] = useState(0);
  const [prevItems, setPrevItems] = useState(items);
  if (prevItems !== items) {
    setPrevItems(items);
    setPage(0);
  }
  const pageCount = Math.max(1, Math.ceil(items.length / EVENTS_PER_PAGE));
  const current = Math.min(page, pageCount - 1);
  const start = current * EVENTS_PER_PAGE;
  const visible = items.slice(start, start + EVENTS_PER_PAGE);

  return (
    <div>
      <ul className={styles.plainList}>
        {visible.map((event) => (
          <EventItem key={event.id} event={event} />
        ))}
      </ul>
      {pageCount > 1 && (
        <div className={styles.carouselControls}>
          <button
            type="button"
            className={styles.carouselButton}
            disabled={current === 0}
            aria-label="Show previous events"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← Prev
          </button>
          <span role="status" className={styles.carouselStatus}>
            {start + 1}–{start + visible.length} of {items.length}
          </span>
          <button
            type="button"
            className={styles.carouselButton}
            disabled={current === pageCount - 1}
            aria-label="Show next events"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
