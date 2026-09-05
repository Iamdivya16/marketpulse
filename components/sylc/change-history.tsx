import { ChangeClass, ChangeHistoryEntry } from "@/lib/scoring/types";
import { format } from "date-fns";

const classLabel: Record<ChangeClass, string> = {
  high_impact: "High-impact",
  interesting: "Interesting",
  normal: "Normal",
};

const severityDot = {
  high: "text-red-600",
  medium: "text-amber-600",
  low: "text-emerald-600",
};

function signedPct(pct: number): string {
  const abs = Math.abs(pct).toFixed(1);
  return `${pct >= 0 ? "+" : "−"}${abs}%`;
}

export function ChangeHistory({ entries }: { entries: ChangeHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        History appears after you mark the watchlist as checked more than once. Each check-in
        becomes a baseline for the next interval.
      </p>
    );
  }

  return (
    <div className="divide-y">
      {entries.map((entry, index) => (
        <div
          key={`${entry.at}-${entry.since}`}
        className="grid gap-2 py-3 text-sm sm:grid-cols-[6.5rem_5rem_minmax(0,1fr)] sm:items-center"
        >
          <span className="tabular-nums text-muted-foreground">
            {index === 0 ? "Now" : format(new Date(entry.at), "MMM d")}
          </span>
          <span className="tabular-nums font-medium">{signedPct(entry.priceChangePct)}</span>
          <span className={`text-xs font-medium sm:text-sm ${severityDot[entry.severity]}`}>
            {entry.severity === "high" ? "High" : entry.severity === "medium" ? "Medium" : "Low"}{" "}
            · {classLabel[entry.changeClass]}
          </span>
          <span className="truncate text-muted-foreground sm:col-auto">{entry.headline}</span>
        </div>
      ))}
    </div>
  );
}
