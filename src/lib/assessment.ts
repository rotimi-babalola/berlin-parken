export type Assessment = {
  label: string;
  step: number;
  totalSteps: number;
};

// ponytail: fixed bands (<400 scarce · 400–1200 moderate · >1200 ample),
// widen only with calibrated occupancy evidence per docs/result-contract.md.
export function assessSupply(mappedSpaces: number): Assessment {
  if (mappedSpaces < 400) return { label: "Scarce", step: 1, totalSteps: 3 };
  if (mappedSpaces <= 1200)
    return { label: "Moderate", step: 2, totalSteps: 3 };
  return { label: "Ample", step: 3, totalSteps: 3 };
}
