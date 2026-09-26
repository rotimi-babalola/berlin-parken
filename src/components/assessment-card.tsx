import { assessSupply } from "@/lib/assessment";
import { useLocale } from "@/lib/i18n";
import styles from "./address-search.module.css";

// Dumb: estimate label + segmented level bar (from mockup B, Bescheid palette).
export function AssessmentCard({
  mappedSpaces,
  usable,
  conditional,
  restricted,
}: {
  mappedSpaces: number;
  usable: number;
  conditional: number;
  restricted: number;
}) {
  const { t, locale } = useLocale();
  const assessment = assessSupply(mappedSpaces);
  const label = t(
    assessment.step === 1
      ? "assessment.scarce"
      : assessment.step === 2
        ? "assessment.moderate"
        : "assessment.ample",
  );
  return (
    <div className={styles.assessment}>
      <span className={styles.eyebrow}>{t("assessment.eyebrow")}</span>
      <div className={styles.assessmentLabel}>{label}</div>
      <div
        className={styles.levelBar}
        role="img"
        aria-label={t("assessment.aria", {
          label,
          step: assessment.step,
          total: assessment.totalSteps,
        })}
      >
        {Array.from({ length: assessment.totalSteps }, (_, index) => (
          <span
            key={index}
            className={
              index < assessment.step ? styles.levelFilled : styles.levelEmpty
            }
          />
        ))}
      </div>
      <p className={styles.assessmentNote}>
        {t("assessment.note", {
          usable: usable.toLocaleString(locale),
          conditional: conditional.toLocaleString(locale),
          restricted: restricted.toLocaleString(locale),
        })}
      </p>
    </div>
  );
}
