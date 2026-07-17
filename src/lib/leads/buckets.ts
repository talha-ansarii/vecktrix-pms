export const MONEY_BUCKET_RANGES = {
  low: { label: "Low", range: "Under ₹5 lakh" },
  mid: { label: "Mid", range: "₹5 lakh – ₹20 lakh" },
  high: { label: "High", range: "Above ₹20 lakh" },
} as const;

export const TIMELINE_BUCKET_RANGES = {
  short: { label: "Short", range: "Under 4 weeks" },
  medium: { label: "Medium", range: "4–12 weeks" },
  long: { label: "Long", range: "12+ weeks" },
} as const;

export type MoneyBucketKey = keyof typeof MONEY_BUCKET_RANGES;
export type TimelineBucketKey = keyof typeof TIMELINE_BUCKET_RANGES;

export function formatMoneyBucket(bucket: string | null | undefined) {
  if (!bucket || !(bucket in MONEY_BUCKET_RANGES)) return "—";
  const b = MONEY_BUCKET_RANGES[bucket as MoneyBucketKey];
  return `${b.label} (${b.range})`;
}

export function formatTimelineBucket(bucket: string | null | undefined) {
  if (!bucket || !(bucket in TIMELINE_BUCKET_RANGES)) return "—";
  const b = TIMELINE_BUCKET_RANGES[bucket as TimelineBucketKey];
  return `${b.label} (${b.range})`;
}
