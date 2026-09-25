import assert from "node:assert/strict";
import test from "node:test";
import { assessSupply } from "../src/lib/assessment.ts";

test("assessSupply applies documented bands with boundary values", () => {
  assert.equal(assessSupply(0).label, "Scarce");
  assert.equal(assessSupply(399).step, 1);
  assert.equal(assessSupply(400).label, "Moderate");
  assert.equal(assessSupply(1200).step, 2);
  assert.equal(assessSupply(1201).label, "Ample");
  assert.equal(assessSupply(1201).totalSteps, 3);
});
