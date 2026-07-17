"use client";

import {
  MONEY_BUCKET_RANGES,
  TIMELINE_BUCKET_RANGES,
  type MoneyBucketKey,
  type TimelineBucketKey,
} from "@/lib/leads/buckets";

export function BucketRangeLegend() {
  return (
    <div className="text-xs text-text-darkSecondary space-y-2">
      <p>
        <span className="text-white/80 font-medium">Budget: </span>
        {(Object.keys(MONEY_BUCKET_RANGES) as MoneyBucketKey[])
          .map((k) => `${MONEY_BUCKET_RANGES[k].label} = ${MONEY_BUCKET_RANGES[k].range}`)
          .join(" · ")}
      </p>
      <p>
        <span className="text-white/80 font-medium">Timeline: </span>
        {(Object.keys(TIMELINE_BUCKET_RANGES) as TimelineBucketKey[])
          .map((k) => `${TIMELINE_BUCKET_RANGES[k].label} = ${TIMELINE_BUCKET_RANGES[k].range}`)
          .join(" · ")}
      </p>
    </div>
  );
}

export function MoneyBucketSelect({
  name = "moneyBucket",
  defaultValue = "",
  className,
}: {
  name?: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue} className={className ?? "input-dark text-sm w-full"}>
      <option value="">Not set</option>
      {(Object.keys(MONEY_BUCKET_RANGES) as MoneyBucketKey[]).map((key) => (
        <option key={key} value={key}>
          {MONEY_BUCKET_RANGES[key].label} — {MONEY_BUCKET_RANGES[key].range}
        </option>
      ))}
    </select>
  );
}

export function TimelineBucketSelect({
  name = "timelineBucket",
  defaultValue = "",
  className,
}: {
  name?: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue} className={className ?? "input-dark text-sm w-full"}>
      <option value="">Not set</option>
      {(Object.keys(TIMELINE_BUCKET_RANGES) as TimelineBucketKey[]).map((key) => (
        <option key={key} value={key}>
          {TIMELINE_BUCKET_RANGES[key].label} — {TIMELINE_BUCKET_RANGES[key].range}
        </option>
      ))}
    </select>
  );
}
