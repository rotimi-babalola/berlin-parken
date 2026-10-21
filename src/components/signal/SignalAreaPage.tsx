"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAreaCopy, type AreaGuide } from "@/lib/areas";
import { useLocale, type Locale } from "@/lib/i18n";
import { localizedPath } from "@/lib/locale-path";
import { buildResultsUrl } from "@/lib/results-url";
import {
  DEFAULT_DURATION_MINUTES,
  defaultArrivalValue,
} from "@/lib/search-time";
import { SignalShell } from "./SignalShell";
import styles from "./area.module.css";

function AreaSearchButton({
  area,
  label,
  destinationLabel,
  locale,
}: {
  area: AreaGuide;
  label: string;
  destinationLabel: string;
  locale: Locale;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={styles.areaSearchButton}
      onClick={() =>
        router.push(
          buildResultsUrl(
            {
              label: destinationLabel,
              latitude: area.center.latitude,
              longitude: area.center.longitude,
              radius: area.radiusMeters,
              arrival: defaultArrivalValue(),
              duration: DEFAULT_DURATION_MINUTES,
            },
            locale,
          ),
        )
      }
    >
      {label}
    </button>
  );
}

export function SignalAreaPage({ area }: { area: AreaGuide }) {
  const { locale } = useLocale();
  const content = getAreaCopy(area, locale);

  return (
    <SignalShell>
      <main className={styles.areaMain}>
        <article>
          <span className={styles.areaEyebrow}>{content.eyebrow}</span>
          <h1 className={styles.areaTitle}>{content.h1}</h1>
          <p className={styles.areaLede}>{content.lede}</p>

          <div className={styles.areaActions}>
            <AreaSearchButton
              area={area}
              label={content.searchCta}
              destinationLabel={`${content.name}, Berlin`}
              locale={locale}
            />
            <Link href={localizedPath(locale)}>{content.otherSearch}</Link>
          </div>

          <p className={styles.areaCaveat}>{content.caveat}</p>

          <section className={styles.areaSection}>
            <h2>{content.supplyTitle}</h2>
            <p>{content.supplyBody}</p>
          </section>

          <section className={styles.areaSection}>
            <h2>{content.rulesTitle}</h2>
            <dl className={styles.areaRules}>
              {content.rules.map((rule) => (
                <div key={rule.term}>
                  <dt>{rule.term}</dt>
                  <dd>{rule.detail}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={styles.areaSection}>
            <h2>{content.whereTitle}</h2>
            <p>{content.whereBody}</p>
          </section>

          <section className={styles.areaSection}>
            <h2>{content.sourcesTitle}</h2>
            <ul className={styles.areaSources}>
              {content.sources.map((source) => (
                <li key={source.href}>
                  <a href={source.href} target="_blank" rel="noreferrer">
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className={styles.areaSourceNote}>{content.sourceNote}</p>
          </section>
        </article>
      </main>
    </SignalShell>
  );
}
