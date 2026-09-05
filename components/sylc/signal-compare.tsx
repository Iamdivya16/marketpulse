import { SignalContribution } from "@/lib/scoring/types";
import { formatCompactNumber, formatUsd } from "@/lib/format";

const LABELS: Record<string, string> = {
  price: "Price",
  volume: "Volume",
  news: "News",
  sentiment: "Sentiment",
  volatility: "Volatility",
};

function formatSignalValue(signal: string, value: number): string {
  if (signal === "price") return formatUsd(value);
  if (signal === "sentiment") return value.toFixed(2);
  if (signal === "volatility") return value.toFixed(2);
  if (signal === "news") return String(Math.round(value));
  return formatCompactNumber(value);
}

type SnapshotLike = {
  price: number;
  volume: number;
  avgVolume20d: number;
  sentimentScore: number;
  newsCount: number;
  volatilityAtr: number;
};

export function SignalCompareTable({
  snapshot,
  current,
  contributions,
}: {
  snapshot: SnapshotLike;
  current: SnapshotLike;
  contributions: SignalContribution[];
}) {
  const points = Object.fromEntries(contributions.map((item) => [item.signal, item.points]));
  const maxPoints = Math.max(...contributions.map((item) => item.points), 1);

  const rows = [
    { key: "price", baseline: snapshot.price, now: current.price },
    { key: "volume", baseline: snapshot.volume, now: current.volume },
    { key: "news", baseline: snapshot.newsCount, now: current.newsCount },
    { key: "sentiment", baseline: snapshot.sentimentScore, now: current.sentimentScore },
    { key: "volatility", baseline: snapshot.volatilityAtr, now: current.volatilityAtr },
  ] as const;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <th className="pb-3 font-medium">Signal</th>
            <th className="pb-3 font-medium">Baseline</th>
            <th className="pb-3 font-medium">Current</th>
            <th className="pb-3 font-medium">Contribution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const score = points[row.key] ?? 0;
            return (
              <tr key={row.key} className="border-t">
                <td className="py-3 font-medium">{LABELS[row.key]}</td>
                <td className="py-3 tabular-nums text-muted-foreground">
                  {formatSignalValue(row.key, row.baseline)}
                </td>
                <td className="py-3 tabular-nums">{formatSignalValue(row.key, row.now)}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#eef2f0] sm:w-28">
                      <div
                        className="h-full rounded-full bg-[#00b386]"
                        style={{ width: `${Math.max(3, (score / maxPoints) * 100)}%` }}
                      />
                    </div>
                    <span className="w-6 text-right tabular-nums">{score}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
