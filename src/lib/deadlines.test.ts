import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDeadlineUrgency } from "@/lib/deadlines";

describe("deadline urgency", () => {
  const now = new Date("2026-07-17T12:00:00Z");

  it("returns null when no due date", () => {
    assert.equal(getDeadlineUrgency(null, now), null);
    assert.equal(getDeadlineUrgency(undefined, now), null);
  });

  it("flags overdue dates", () => {
    assert.equal(getDeadlineUrgency("2026-07-16", now), "overdue");
  });

  it("flags due within 3 days", () => {
    assert.equal(getDeadlineUrgency("2026-07-19", now), "due_soon");
  });

  it("marks distant dates as ok", () => {
    assert.equal(getDeadlineUrgency("2026-08-01", now), "ok");
  });
});
