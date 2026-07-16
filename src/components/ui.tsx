import { cn, formatStatus } from "@/lib/utils";

const statusColors: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-300",
  contacted: "bg-purple-500/20 text-purple-300",
  qualified: "bg-emerald-500/20 text-emerald-300",
  proposal: "bg-amber-500/20 text-amber-300",
  won: "bg-green-500/20 text-green-300",
  lost: "bg-red-500/20 text-red-300",
  archived: "bg-gray-500/20 text-gray-400",
  active: "bg-emerald-500/20 text-emerald-300",
  locked: "bg-gray-500/20 text-gray-400",
  completed: "bg-green-500/20 text-green-300",
  todo: "bg-blue-500/20 text-blue-300",
  in_progress: "bg-amber-500/20 text-amber-300",
  in_review: "bg-purple-500/20 text-purple-300",
  approved: "bg-green-500/20 text-green-300",
  done: "bg-green-500/20 text-green-300",
  planning: "bg-blue-500/20 text-blue-300",
  on_hold: "bg-amber-500/20 text-amber-300",
  hot: "bg-red-500/20 text-red-300",
  warm: "bg-amber-500/20 text-amber-300",
  cold: "bg-blue-500/20 text-blue-300",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("badge", statusColors[status] ?? "bg-white/10 text-text-darkSecondary", className)}>
      {formatStatus(status)}
    </span>
  );
}

export function PageHeader({
  overline,
  title,
  description,
  action,
}: {
  overline?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        {overline && <p className="overline-text text-text-darkSecondary mb-2">{overline}</p>}
        <h1 className="heading-section text-white">{title}</h1>
        {description && <p className="body-text text-text-darkSecondary mt-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="card-dark text-center py-16">
      <p className="heading-card text-white mb-2">{title}</p>
      {description && <p className="body-text text-text-darkSecondary">{description}</p>}
    </div>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card-dark">
      <p className="overline-text text-text-darkSecondary mb-2">{label}</p>
      <p className="heading-card text-white">{value}</p>
      {sub && <p className="text-sm text-text-darkSecondary mt-1">{sub}</p>}
    </div>
  );
}
