import { assessSupply } from "@/lib/assessment";
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
  const assessment = assessSupply(mappedSpaces);
  return (
    <div className={styles.assessment}>
      <span className={styles.eyebrow}>Estimate · mapped supply</span>
      <div className={styles.assessmentLabel}>{assessment.label}</div>
      <div
        className={styles.levelBar}
        role="img"
        aria-label={`Supply estimate ${assessment.label}, level ${assessment.step} of ${assessment.totalSteps}`}
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
        Estimate from mapped supply — not live occupancy. Unrestricted{" "}
        {usable.toLocaleString()} · conditional {conditional.toLocaleString()} ·
        restricted {restricted.toLocaleString()}. Documented bands: &lt;400
        scarce · 400–1200 moderate · &gt;1200 ample.
      </p>
    </div>
  );
}
