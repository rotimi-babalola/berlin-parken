"use client";

import Link from "next/link";
import { useState } from "react";

type OptionId = "A" | "B" | "C";

const SYNTH = {
  dest: "Torstraße 101, Mitte",
  stats: [
    { k: "2,360", v: "mapped spaces nearby" },
    { k: "366", v: "street areas scanned" },
    { k: "5", v: "managed zones traced" },
    { k: "14", v: "days of planned events" },
  ],
  streets: [
    {
      name: "Torstraße",
      meta: "412 mapped · 40 m away",
      tag: "Look here first",
    },
    {
      name: "Alte Schönhauser Str.",
      meta: "238 mapped · 180 m away",
      tag: "Backup",
    },
    {
      name: "Rosa-Luxemburg-Str.",
      meta: "191 mapped · 260 m away",
      tag: "Conditional",
    },
  ],
};

function MockSearch({ dark = false }: { dark?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        background: dark ? "#1e293b" : "#fff",
        border: dark ? "1px solid #334155" : "1px solid #dbe4f3",
        borderRadius: 14,
        padding: 8,
        boxShadow: dark ? "none" : "0 12px 32px rgba(37,99,235,.12)",
      }}
    >
      <div
        aria-hidden
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 10,
          background: dark ? "#0f172a" : "#f1f5fd",
          color: dark ? "#cbd5e1" : "#475569",
          fontSize: 15,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        {SYNTH.dest} · 500 m
      </div>
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0 20px",
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 15,
          textDecoration: "none",
          background: "#2563eb",
          color: "#fff",
          whiteSpace: "nowrap",
        }}
      >
        Check streets →
      </Link>
    </div>
  );
}

function OptionA() {
  return (
    <div
      style={{
        background: "#f0f9ff",
        color: "#0f172a",
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid #e4ecfc",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "72px 32px 0" }}>
        <p
          style={{
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
            background: "#fff",
            border: "1px solid #e4ecfc",
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: "#2563eb",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: "#059669",
            }}
          />{" "}
          Berlin-only · Official open geodata · No live-occupancy claims
        </p>
        <h1
          style={{
            fontSize: "clamp(40px,6vw,72px)",
            lineHeight: 1.02,
            letterSpacing: "-.03em",
            margin: "22px 0 14px",
            fontWeight: 800,
          }}
        >
          Know the streets
          <br />
          before you arrive.
        </h1>
        <p
          style={{
            fontSize: 18,
            color: "#475569",
            maxWidth: 620,
            lineHeight: 1.55,
          }}
        >
          Type a Berlin destination. See mapped supply, paid-zone rules and
          planned street events within a 5-minute walk — each traced to its
          source.
        </p>
        <div style={{ maxWidth: 680, marginTop: 26 }}>
          <MockSearch />
        </div>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 10 }}>
          Synthetic preview · Try “Torstraße 101” in the live check →
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: 12,
            marginTop: 36,
          }}
        >
          {[
            "1 · Enter destination",
            "2 · Pick walk radius",
            "3 · Read the answer",
          ].map((s) => (
            <div
              key={s}
              style={{
                background: "#fff",
                border: "1px solid #e4ecfc",
                borderRadius: 12,
                padding: "14px 16px",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {s}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
            gap: 12,
            margin: "28px 0 0",
          }}
        >
          {SYNTH.stats.map((s) => (
            <div
              key={s.v}
              style={{
                background: "#0f172a",
                color: "#fff",
                borderRadius: 14,
                padding: "18px",
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 800 }}>{s.k}</div>
              <div style={{ fontSize: 13, opacity: 0.75 }}>{s.v}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 12,
            margin: "28px 0 56px",
          }}
        >
          {[
            {
              t: "Mapped supply",
              d: "Usable / conditional / restricted capacity per street. Labelled estimate — never live occupancy.",
              c: "#2563eb",
            },
            {
              t: "Zone rules",
              d: "Fees, hours, signage caveat. Follow on-site signs where local sections differ.",
              c: "#059669",
            },
            {
              t: "Planned events",
              d: "Approved disruptions starting in the next 14 days, with dates and distance.",
              c: "#dc2626",
            },
          ].map((f) => (
            <div
              key={f.t}
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: 22,
                border: "1px solid #e4ecfc",
                borderTop: `4px solid ${f.c}`,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{f.t}</div>
              <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
                {f.d}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          background: "#0f172a",
          color: "#e2e8f0",
          padding: "22px 32px",
          fontSize: 13,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <span>Honest by design: inventory ≠ live availability.</span>
        <Link href="/" style={{ color: "#fff", fontWeight: 700 }}>
          Run the live check →
        </Link>
      </div>
    </div>
  );
}

function OptionB() {
  return (
    <div
      style={{
        background: "#faf6ec",
        color: "#1c1917",
        borderRadius: 18,
        border: "1px solid #e7dfc9",
        overflow: "hidden",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <div
        style={{
          borderBottom: "1px solid #1c1917",
          padding: "18px 36px",
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "system-ui, sans-serif",
          fontSize: 12,
          letterSpacing: ".14em",
          textTransform: "uppercase",
        }}
      >
        <span>
          <b>berlinparken</b> · Auskunft Nr. 042
        </span>
        <span style={{ display: "none" }}>placeholder</span>
        <span>Berlin · Open Data Ausgabe</span>
      </div>
      <div style={{ padding: "56px 36px 0", maxWidth: 1060, margin: "0 auto" }}>
        <p
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: "#57534e",
          }}
        >
          Vor der Fahrt — mapped supply, zones, events
        </p>
        <h1
          style={{
            fontSize: "clamp(44px,6.4vw,84px)",
            lineHeight: 0.98,
            fontWeight: 400,
            letterSpacing: "-.02em",
            margin: "14px 0",
          }}
        >
          Parken ist lesbar,
          <br />
          <i>wenn man die Akte kennt.</i>
        </h1>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr .8fr",
            gap: 32,
          }}
          className="ledger-grid"
        >
          <div>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "#44403c" }}>
              No promises of a free space. Instead: the official record — how
              many street spaces are mapped around your destination, which rules
              apply, and which construction sites or closures are filed for the
              next 14 days.
            </p>
            <div
              style={{
                marginTop: 22,
                background: "#fffdf6",
                border: "1px solid #1c1917",
                padding: 8,
                display: "flex",
                gap: 8,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  border: "1px dashed #a8a29e",
                  fontSize: 15,
                }}
              >
                Torstraße 101, Mitte — 500 m Umkreis
              </div>
              <Link
                href="/"
                style={{
                  background: "#1c1917",
                  color: "#faf6ec",
                  padding: "12px 22px",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                Akte öffnen →
              </Link>
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 16,
                fontFamily: "system-ui, sans-serif",
                fontSize: 13,
              }}
            >
              {[
                "Quelle: Berlin Open Data",
                "Stand: tagesaktuell",
                "Schilder vor Ort gelten",
              ].map((x) => (
                <span
                  key={x}
                  style={{
                    border: "1px solid #a8a29e",
                    borderRadius: 999,
                    padding: "5px 12px",
                    color: "#57534e",
                  }}
                >
                  {x}
                </span>
              ))}
            </div>
          </div>
          <div
            style={{
              border: "1px solid #1c1917",
              background: "#fffdf6",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <div
              style={{
                padding: "12px 18px",
                borderBottom: "1px solid #1c1917",
                fontSize: 12,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Stadtteil-Protokoll</span>
              <span
                style={{
                  background: "#b3351f",
                  color: "#fff",
                  padding: "2px 10px",
                  borderRadius: 999,
                }}
              >
                Estimate
              </span>
            </div>
            {SYNTH.streets.map((s, i) => (
              <div
                key={s.name}
                style={{
                  padding: "14px 18px",
                  borderBottom: i < 2 ? "1px solid #e7dfc9" : "none",
                }}
              >
                <div style={{ fontSize: 12, color: "#78716c" }}>
                  §0{i + 1} — {s.tag}
                </div>
                <div style={{ fontWeight: 800 }}>{s.name}</div>
                <div style={{ fontSize: 13, color: "#57534e" }}>{s.meta}</div>
              </div>
            ))}
            <div
              style={{
                padding: "12px 18px",
                fontSize: 12,
                color: "#78716c",
                borderTop: "1px solid #e7dfc9",
              }}
            >
              Straight-line distances. Restrictions may apply — check signs on
              site.
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 0,
            border: "1px solid #1c1917",
            margin: "36px 0 48px",
            fontFamily: "system-ui, sans-serif",
          }}
          className="ledger-grid"
        >
          {[
            [
              "01 / Bestand",
              "Mapped supply per street, honestly split: usable, conditional, restricted.",
            ],
            ["02 / Zonen", "Paid hours + fees with local-variance caveat."],
            ["03 / Vorgänge", "Dated events with type, dates, distance."],
          ].map(([h, d], i) => (
            <div
              key={h}
              style={{
                padding: 22,
                borderLeft: i ? "1px solid #1c1917" : "none",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  color: "#b3351f",
                  fontWeight: 800,
                }}
              >
                {h}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#44403c",
                  marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                {d}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OptionC() {
  return (
    <div
      style={{
        background: "#070d1a",
        color: "#f1f5f9",
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid #1e293b",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "64px 32px 0",
          display: "grid",
          gridTemplateColumns: "1.1fr .9fr",
          gap: 40,
        }}
        className="ledger-grid"
      >
        <div>
          <p
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              color: "#a3e635",
              border: "1px solid #365314",
              background: "#111c10",
              padding: "6px 14px",
              borderRadius: 999,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                background: "#a3e635",
                boxShadow: "0 0 12px #a3e635",
              }}
            />{" "}
            PRE-TRIP · 10-SECOND ANSWER
          </p>
          <h1
            style={{
              fontSize: "clamp(46px,6vw,80px)",
              lineHeight: 0.95,
              letterSpacing: "-.04em",
              fontWeight: 900,
              margin: "18px 0",
            }}
          >
            Will I<br />
            <span style={{ color: "#a3e635" }}>find parking</span>
            <br />
            there?
          </h1>
          <p
            style={{
              color: "#94a3b8",
              fontSize: 17,
              lineHeight: 1.55,
              maxWidth: 480,
            }}
          >
            Not live — but close enough to plan. Mapped supply, zone prices and
            roadworks around any Berlin address, in one glance before you drive.
          </p>
          <div style={{ marginTop: 24, maxWidth: 560 }}>
            <MockSearch dark />
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 26 }}>
            {[
              ["2,360", "mapped"],
              ["366", "areas"],
              ["14d", "events"],
            ].map(([k, v]) => (
              <div key={v}>
                <div style={{ fontSize: 30, fontWeight: 900 }}>{k}</div>
                <div style={{ color: "#64748b", fontSize: 13 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            background: "linear-gradient(180deg,#13233f,#0b1526)",
            border: "1px solid #334155",
            borderRadius: 20,
            padding: 22,
            alignSelf: "start",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700 }}>
              TORSTRASSE 101 · 500 M
            </span>
            <span
              style={{
                background: "#a3e635",
                color: "#0a1206",
                fontWeight: 900,
                fontSize: 13,
                padding: "6px 14px",
                borderRadius: 999,
              }}
            >
              AMPLE
            </span>
          </div>
          <div
            style={{
              height: 10,
              borderRadius: 99,
              background: "#1e293b",
              overflow: "hidden",
              display: "flex",
              gap: 3,
            }}
          >
            <div style={{ flex: 7, background: "#a3e635" }} />
            <div style={{ flex: 2, background: "#f59e0b" }} />
            <div style={{ flex: 1, background: "#ef4444" }} />
          </div>
          <p style={{ fontSize: 12, color: "#64748b", margin: "10px 0 16px" }}>
            Estimate from mapped supply — not live occupancy.
          </p>
          {SYNTH.streets.map((s) => (
            <div
              key={s.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 8,
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{s.meta}</div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#a3e635",
                  border: "1px solid #365314",
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                {s.tag}
              </span>
            </div>
          ))}
          <Link
            href="/"
            style={{
              display: "block",
              textAlign: "center",
              marginTop: 12,
              background: "#a3e635",
              color: "#0a1206",
              fontWeight: 900,
              padding: 14,
              borderRadius: 12,
              textDecoration: "none",
            }}
          >
            Check my destination →
          </Link>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 12,
          padding: "32px",
          maxWidth: 1080,
          margin: "0 auto",
        }}
      >
        {[
          ["Mapped supply", "Usable / conditional / restricted, per street."],
          ["Zone prices", "Hours + fees, local signs win."],
          ["Roadworks", "Next 14 days, dated + distanced."],
        ].map(([t, d]) => (
          <div
            key={t}
            style={{
              border: "1px solid #1e293b",
              borderRadius: 14,
              padding: 18,
              background: "#0b1526",
            }}
          >
            <div style={{ fontWeight: 800 }}>{t}</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
              {d}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const META: Record<OptionId, { name: string; blurb: string }> = {
  A: {
    name: "A · Swiss Funnel",
    blurb:
      "Recommended — Minimalism + blue/green trust palette, Inter, 3-step conversion. Cleanest, fastest to ship.",
  },
  B: {
    name: "B · Civic Ledger",
    blurb:
      "Editorial serif, official-record framing. Best for trust + source traceability.",
  },
  C: {
    name: "C · Night Drive",
    blurb:
      "Dark driver-first glanceable card. Best for pre-trip phone use + conversion.",
  },
};

export default function DesignReview() {
  const [opt, setOpt] = useState<OptionId>("A");
  return (
    <main
      style={{
        background: "#e8e4d8",
        minHeight: "100vh",
        padding: "28px 20px 60px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <style>{`@media(max-width:860px){.ledger-grid{grid-template-columns:1fr!important}}`}</style>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: ".16em",
                textTransform: "uppercase",
                color: "#57534e",
                fontWeight: 800,
              }}
            >
              Temporary review route · /design · delete before ship
            </div>
            <h1
              style={{
                margin: "6px 0 0",
                fontSize: 30,
                letterSpacing: "-.02em",
              }}
            >
              Landing page — 3 options
            </h1>
          </div>
          <Link
            href="/"
            style={{
              border: "1px solid #1c1917",
              borderRadius: 999,
              padding: "10px 18px",
              textDecoration: "none",
              color: "#1c1917",
              fontWeight: 700,
              background: "#fffdf6",
            }}
          >
            ← Back to live app
          </Link>
        </div>
        <div
          role="tablist"
          aria-label="Landing options"
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          {(Object.keys(META) as OptionId[]).map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={opt === id}
              onClick={() => setOpt(id)}
              style={{
                cursor: "pointer",
                borderRadius: 999,
                padding: "10px 18px",
                fontWeight: 800,
                border: opt === id ? "2px solid #1c1917" : "1px solid #a8a29e",
                background: opt === id ? "#1c1917" : "#fffdf6",
                color: opt === id ? "#fffdf6" : "#1c1917",
              }}
            >
              {META[id].name}
            </button>
          ))}
        </div>
        <p
          style={{
            color: "#57534e",
            fontSize: 14,
            margin: "0 0 20px",
            maxWidth: 760,
          }}
        >
          <b>{META[opt].name}:</b> {META[opt].blurb} All copy uses synthetic
          demo data (Torstraße 101). Honesty limits kept: estimate-labelled,
          signage caveat, source + freshness.
        </p>
        {opt === "A" && <OptionA />}
        {opt === "B" && <OptionB />}
        {opt === "C" && <OptionC />}
        <p style={{ marginTop: 18, fontSize: 13, color: "#57534e" }}>
          Reply with “A”, “B”, or “C” (+ tweaks) and I’ll apply it to{" "}
          <code>/</code>. This route is a single file at{" "}
          <code>src/app/design/page.tsx</code> — delete the folder to remove it.
        </p>
      </div>
    </main>
  );
}
