import { cn } from "@/lib/utils";
import { deadlineLabel, getDeadlineUrgency } from "@/lib/deadlines";

export function DeadlineBadge({
  dueDate,
  className,
}: {
  dueDate: Date | string | null | undefined;
  className?: string;
}) {
  const urgency = getDeadlineUrgency(dueDate);
  if (!urgency || !dueDate) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        urgency === "overdue" && "bg-red-500/15 text-red-300 border border-red-500/30",
        urgency === "due_soon" && "bg-amber-500/15 text-amber-200 border border-amber-500/30",
        urgency === "ok" && "bg-white/5 text-text-darkSecondary border border-white/10",
        className,
      )}
    >
      {deadlineLabel(urgency, dueDate)}
    </span>
  );
}
