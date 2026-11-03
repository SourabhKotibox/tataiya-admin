import assert from "node:assert/strict";
import { test } from "node:test";
import { formatPlanPeriod } from "./planPeriod.ts";

const expectPeriod = (
  plan: Parameters<typeof formatPlanPeriod>[0],
  priceSuffix: string,
  validFor: string,
) => {
  const period = formatPlanPeriod(plan);
  assert.equal(period.priceSuffix, priceSuffix);
  assert.equal(period.validFor, validFor);
  assert.equal(period.priceSuffix.includes("  "), false);
  assert.equal(period.validFor.includes("  "), false);
  assert.equal(/\d+\s+\d+/.test(period.validFor), false);
  assert.equal(/\d+\s+\d+/.test(period.priceSuffix), false);
};

test("new API shape: suffix and valid-for for month, quarter, half-year, year", () => {
  expectPeriod(
    { duration: "Month", durationValue: 1, durationUnit: "Month", durationLabel: "Month", billingCount: 1 },
    "Month",
    "1 Month",
  );
  expectPeriod(
    { duration: "3 Months", durationValue: "", durationUnit: "Months", durationLabel: "3 Months", billingCount: 3 },
    "3 Months",
    "3 Months",
  );
  expectPeriod(
    { duration: "6 Months", durationValue: "", durationUnit: "Months", durationLabel: "6 Months", billingCount: 6 },
    "6 Months",
    "6 Months",
  );
  expectPeriod(
    { duration: "Year", durationValue: 1, durationUnit: "Year", durationLabel: "Year", billingCount: 1 },
    "Year",
    "1 Year",
  );
});

test("old API shape is unit plus count", () => {
  expectPeriod({ duration: "Month", durationValue: 1, durationUnit: "Month" }, "Month", "1 Month");
  expectPeriod({ duration: "Month", durationValue: 3, durationUnit: "Month" }, "3 Months", "3 Months");
  expectPeriod({ duration: "Month", durationValue: 6 }, "6 Months", "6 Months");
  expectPeriod({ duration: "Months", durationValue: 3 }, "3 Months", "3 Months");
  expectPeriod({ duration: "Year", durationValue: 1, durationUnit: "Year" }, "Year", "1 Year");
  expectPeriod({ duration: "Months", durationValue: 12 }, "Year", "1 Year");
  expectPeriod({ duration: "Month", durationValue: 12 }, "Year", "1 Year");
});

test("blank or duplicated counts are not printed twice", () => {
  expectPeriod({ duration: "3 Months", durationValue: "" }, "3 Months", "3 Months");
  expectPeriod({ duration: "3 Months", durationValue: " " }, "3 Months", "3 Months");
  expectPeriod({ duration: "3 Months", durationValue: null }, "3 Months", "3 Months");
  expectPeriod({ duration: "6 Months", durationValue: 6 }, "6 Months", "6 Months");
  expectPeriod({ duration: "3  Months", durationValue: "" }, "3 Months", "3 Months");
  expectPeriod({ duration: "3 Months", durationValue: 1 }, "3 Months", "3 Months");
});

test("billing count wins when duration is still a bare unit", () => {
  expectPeriod(
    { duration: "Month", durationValue: "", durationUnit: "Month", billingCount: 3 },
    "3 Months",
    "3 Months",
  );
  expectPeriod(
    { duration: "Month", durationValue: "", durationUnit: "Month", billingCount: "6" },
    "6 Months",
    "6 Months",
  );
  expectPeriod(
    { duration: "Year", durationValue: "", durationUnit: "Year", billingCount: 1 },
    "Year",
    "1 Year",
  );
});

test("app-style labels and the 30-day mis-save still read as one month or one year", () => {
  expectPeriod({ duration: "monthly", durationValue: 1 }, "Month", "1 Month");
  expectPeriod({ duration: "3 months", durationValue: 3 }, "3 Months", "3 Months");
  expectPeriod({ duration: "yearly", durationValue: 1 }, "Year", "1 Year");
  expectPeriod({ duration: "Month", durationValue: 30 }, "Month", "1 Month");
  expectPeriod({ duration: "annual", durationValue: 1 }, "Year", "1 Year");
});
