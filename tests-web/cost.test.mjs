import assert from "node:assert/strict";
import { test } from "node:test";
import { roleCosts } from "../lib/cost.ts";

const rates = {
  employer_multiplier: 1.2,
  vendor_multiplier: 2,
  roles: { data_engineer: { M: [20, 30] } },
};
const comparison = {
  role: "data_engineer",
  requested_fte: 2.5,
  bu_fte: 2,
  ucp_fte: 3,
};
const baselineSettings = { levels: {}, basis: "employee", method: "bu" };
const run = {
  monthly: [{}, {}, {}],
  ai_enabled: true,
  comparisons: [comparison],
  ai_summary: [{ role: "data_engineer", bu_fte_assisted: 1.5, ucp_fte_assisted: 2 }],
};

test("matches AI effort to the same role rate and cost method", () => {
  const [row] = roleCosts(run, run.comparisons, rates, baselineSettings);
  assert.equal(row.perFte, 30_000_000);
  assert.equal(row.computedMonthly, 60_000_000);
  assert.equal(row.assistedFte, 1.5);
  assert.equal(row.assistedMonthly, 45_000_000);
  assert.equal(row.potentialMonthly, 15_000_000);
  assert.equal(row.potentialPeriod, 45_000_000);
  assert.equal(row.requestedMonthly, 75_000_000);
  assert.equal(row.gapMonthly, 15_000_000);
});

test("recomputes the AI scenario when users change the method or price basis", () => {
  const [ucp] = roleCosts(run, run.comparisons, rates, { ...baselineSettings, method: "ucp" });
  assert.equal(ucp.computedMonthly, 90_000_000);
  assert.equal(ucp.assistedMonthly, 60_000_000);
  assert.equal(ucp.potentialMonthly, 30_000_000);
  const [vendor] = roleCosts(run, run.comparisons, rates, { ...baselineSettings, basis: "vendor" });
  assert.equal(vendor.computedMonthly, 100_000_000);
  assert.equal(vendor.assistedMonthly, 75_000_000);
  assert.equal(vendor.potentialMonthly, 25_000_000);
});

test("does not invent AI savings when the scenario is disabled or missing", () => {
  const [disabled] = roleCosts({ ...run, ai_enabled: false }, run.comparisons, rates, baselineSettings);
  assert.equal(disabled.assistedMonthly, null);
  assert.equal(disabled.potentialMonthly, null);
  const [missing] = roleCosts({ ...run, ai_summary: [] }, run.comparisons, rates, baselineSettings);
  assert.equal(missing.assistedFte, null);
});

test("bounds the AI scenario to a realistic effort interval", () => {
  const excessive = { ...run, ai_summary: [{ ...run.ai_summary[0], bu_fte_assisted: 9 }] };
  const [higher] = roleCosts(excessive, run.comparisons, rates, baselineSettings);
  assert.equal(higher.assistedMonthly, higher.computedMonthly);
  assert.equal(higher.potentialMonthly, 0);
  const negative = { ...run, ai_summary: [{ ...run.ai_summary[0], bu_fte_assisted: -2 }] };
  const [lower] = roleCosts(negative, run.comparisons, rates, baselineSettings);
  assert.equal(lower.assistedFte, 0);
  assert.equal(lower.potentialMonthly, lower.computedMonthly);
});

test("uses the selected role scope without counting savings from other roles", () => {
  const [row] = roleCosts(run, [comparison], rates, baselineSettings);
  assert.equal(row.role, "data_engineer");
  assert.equal(row.potentialMonthly, 15_000_000);
});
