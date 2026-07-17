export type DeadlineUrgency = "overdue" | "due_soon" | "ok";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getDeadlineUrgency(
  dueDate: Date | string | null | undefined,
  now = new Date(),
): DeadlineUrgency | null {
  if (!dueDate) return null;
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (Number.isNaN(due.getTime())) return null;

  const diffMs = due.getTime() - now.getTime();
  if (diffMs < 0) return "overdue";
  if (diffMs <= 3 * MS_PER_DAY) return "due_soon";
  return "ok";
}

export function deadlineLabel(urgency: DeadlineUrgency, dueDate: Date | string) {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const dateStr = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (urgency === "overdue") return `Overdue · ${dateStr}`;
  if (urgency === "due_soon") return `Due soon · ${dateStr}`;
  return `Due ${dateStr}`;
}
