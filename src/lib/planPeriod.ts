/**
 * Plan-card period labels.
 *
 * The website plan list has shipped two shapes:
 * - Old: `duration` is the unit ("Month", "Year") and `durationValue` is the count (1, 3, 6, 12).
 * - New (GET /api/web/subscription-plans): `duration` / `durationLabel` is the price suffix
 *   ("Month", "3 Months", "6 Months", "Year"), `durationValue` is blank when that suffix
 *   already contains the number, and `billingCount` + `durationUnit` are the unit and count.
 *
 * Concatenating `durationValue` and `duration` duplicates the number ("3 3 Months") or
 * leaves a double space when the value is blank. These helpers rebuild both labels.
 */

export type PlanPeriodInput = {
  duration?: string | number | null;
  durationValue?: string | number | null;
  durationUnit?: string | null;
  durationLabel?: string | null;
  billingCount?: string | number | null;
};

export type PlanPeriodDisplay = {
  /** Text after the price slash: "Month", "3 Months", "6 Months", "Year". */
  priceSuffix: string;
  /** "Valid for" text: "1 Month", "3 Months", "6 Months", "1 Year". */
  validFor: string;
  /** Billing count in the displayed unit. 12 months is 1 year. */
  count: number;
  /** Singular unit used for "per Month" / "per Year". */
  perUnit: string;
};

type PeriodKind = "day" | "week" | "month" | "year";

const SINGULAR: Record<PeriodKind, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
};

const PLURAL: Record<PeriodKind, string> = {
  day: "Days",
  week: "Weeks",
  month: "Months",
  year: "Years",
};

const EMBEDDED_COUNT = /(\d+)\s*-?\s*(day|week|month|year)/i;

function parseCount(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const numeric = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(numeric)) return null;
  const count = Math.trunc(numeric);
  return count >= 1 ? count : null;
}

function kindOf(text: string, count: number): PeriodKind {
  if (text.includes("day")) return "day";
  if (text.includes("week")) return "week";
  if (text.includes("year") || text.includes("annual")) return "year";
  if (count === 12) return "year";
  return "month";
}

export function formatPlanPeriod(plan?: PlanPeriodInput | null): PlanPeriodDisplay {
  const duration = String(plan?.duration ?? "").trim();
  const durationLabel = String(plan?.durationLabel ?? "").trim();
  const durationUnit = String(plan?.durationUnit ?? "").trim();
  const composed = duration || durationLabel;

  const billingCount = parseCount(plan?.billingCount);
  const durationValue = parseCount(plan?.durationValue);
  const embedded = composed.match(EMBEDDED_COUNT);

  let count = billingCount ?? durationValue ?? 1;
  // "3 Months" stored in the label while the numeric field stayed 1 or was left blank.
  if (embedded && count === 1) count = parseInt(embedded[1], 10);

  const haystack = `${durationUnit} ${composed}`.toLowerCase();
  // Unit "Monthly" plus a 28–31 durationValue is a days/price mis-save, not N months.
  if (haystack.includes("month") && count >= 28 && count <= 31 && !embedded) count = 1;

  let kind = kindOf(haystack, count);
  // 12 months is one year. A real multi-year plan says "year" in the unit.
  if (kind === "year" && !haystack.includes("year") && !haystack.includes("annual")) count = 1;

  const singular = SINGULAR[kind];
  const plural = PLURAL[kind];
  const unitWord = count === 1 ? singular : plural;
  const priceSuffix = count === 1 ? singular : `${count} ${plural}`;
  const validFor = `${count} ${unitWord}`;

  return { priceSuffix, validFor, count, perUnit: singular };
}
